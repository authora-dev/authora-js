import { buildSignaturePayload, sign, generateKeyPair, getPublicKey } from './crypto.js';
import { matchAnyPermission } from './permissions.js';
import {
  AuthoraError,
  AuthenticationError,
  AuthorizationError,
  NetworkError,
  NotFoundError,
  RateLimitError,
  TimeoutError,
} from './errors.js';
import type {
  Agent,
  AgentVerification,
  PermissionCheckResult,
  Delegation,
  McpProxyResponse,
  SignedRequestOptions,
  SignedResponse,
  AgentDelegateParams,
  McpToolCallParams,
  AgentOptions,
  EffectivePermissions,
  KeyRotationResult,
  DelegationRequestParams,
  UserDelegationToken,
  IssueUserDelegationTokenParams,
  RefreshUserDelegationTokenParams,
  AgentDelegationJwt,
  IssueAgentDelegationJwtParams,
  VerifyAgentDelegationJwtResult,
} from './types.js';

export { generateKeyPair, getPublicKey } from './crypto.js';
export { matchPermission, matchAnyPermission } from './permissions.js';

const HEADERS = {
  AGENT_ID: 'x-authora-agent-id',
  TIMESTAMP: 'x-authora-timestamp',
  SIGNATURE: 'x-authora-signature',
} as const;

export class AuthoraAgent {
  public readonly agentId: string;
  public readonly baseUrl: string;
  public readonly timeout: number;
  public readonly workspaceId?: string;

  private privateKey: string;
  private publicKey: string;
  private readonly delegationToken?: string;
  private cachedAllow: string[] | null = null;
  private cachedDeny: string[] | null = null;
  private cacheTime = 0;
  private readonly cacheTtl: number;
  private readonly rotationIntervalDays?: number;
  private readonly onKeyRotated?: (result: KeyRotationResult) => void | Promise<void>;

  constructor(options: AgentOptions) {
    if (!options.agentId) throw new Error('agentId required');
    if (!options.privateKey) throw new Error('privateKey required');
    this.agentId = options.agentId;
    this.privateKey = options.privateKey;
    this.publicKey = getPublicKey(options.privateKey);
    this.workspaceId = options.workspaceId;
    this.baseUrl = (options.baseUrl ?? 'https://api.authora.dev/api/v1').replace(/\/+$/, '');
    this.timeout = options.timeout ?? 30_000;
    this.cacheTtl = options.permissionsCacheTtl ?? 300_000;
    this.delegationToken = options.delegationToken;
    this.rotationIntervalDays = options.rotationIntervalDays;
    this.onKeyRotated = options.onKeyRotated;
  }

  static async init(options: AgentOptions): Promise<AuthoraAgent> {
    const agent = new AuthoraAgent(options);
    if (options.rotationIntervalDays && options.rotationIntervalDays > 0) {
      await agent.autoRotateIfNeeded();
    }
    return agent;
  }

  async autoRotateIfNeeded(): Promise<KeyRotationResult | null> {
    if (!this.rotationIntervalDays || this.rotationIntervalDays <= 0) return null;

    const profile = await this.getProfile();
    const updatedAt = new Date(profile.updatedAt).getTime();
    const ageMs = Date.now() - updatedAt;
    const intervalMs = this.rotationIntervalDays * 24 * 60 * 60 * 1000;

    if (ageMs < intervalMs) return null;

    const result = await this.rotateKey();
    this.privateKey = result.keyPair.privateKey;
    this.publicKey = result.keyPair.publicKey;

    if (this.onKeyRotated) {
      await this.onKeyRotated(result);
    }

    return result;
  }

  async signedFetch<T = unknown>(path: string, opts: SignedRequestOptions = {}): Promise<SignedResponse<T>> {
    const method = (opts.method ?? 'GET').toUpperCase();
    const url = new URL(`${this.baseUrl}${path}`);
    if (opts.query) {
      for (const [k, v] of Object.entries(opts.query)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }

    const bodyStr = opts.body !== undefined ? JSON.stringify(opts.body) : null;
    const timestamp = new Date().toISOString();
    const payload = buildSignaturePayload(method, url.pathname, timestamp, bodyStr);

    const headers: Record<string, string> = {
      Accept: 'application/json',
      [HEADERS.AGENT_ID]: this.agentId,
      [HEADERS.TIMESTAMP]: timestamp,
      [HEADERS.SIGNATURE]: sign(payload, this.privateKey),
      ...opts.headers,
    };
    if (bodyStr !== null) headers['Content-Type'] = 'application/json';

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeout);
    let res: Response;
    try {
      res = await fetch(url.toString(), { method, headers, body: bodyStr, signal: ctrl.signal });
    } catch (err: unknown) {
      clearTimeout(timer);
      if (err instanceof DOMException && err.name === 'AbortError')
        throw new TimeoutError(`${method} ${path} timed out`);
      throw new NetworkError(`${method} ${path} failed: ${err instanceof Error ? err.message : 'unknown'}`, err);
    } finally {
      clearTimeout(timer);
    }

    const ct = res.headers.get('content-type') ?? '';
    const data: unknown = ct.includes('application/json')
      ? await res.json()
      : (await res.text()) || undefined;

    if (!res.ok) this.throwForStatus(res.status, data, method, path);
    return { data: this.unwrap(data) as T, status: res.status, headers: res.headers };
  }

  async checkPermission(resource: string, action: string, context?: Record<string, unknown>): Promise<PermissionCheckResult> {
    const { data } = await this.signedFetch<PermissionCheckResult>('/permissions/check', {
      method: 'POST', body: { agentId: this.agentId, resource, action, context },
    });
    return data;
  }

  async checkPermissions(checks: Array<{ resource: string; action: string }>): Promise<PermissionCheckResult[]> {
    const { data } = await this.signedFetch<{ results: PermissionCheckResult[] }>('/permissions/check-batch', {
      method: 'POST', body: { agentId: this.agentId, checks },
    });
    return data.results;
  }

  async fetchPermissions(): Promise<EffectivePermissions> {
    const { data } = await this.signedFetch<EffectivePermissions>(`/agents/${this.agentId}/permissions`);
    this.cachedAllow = data.permissions;
    this.cachedDeny = data.denyPermissions;
    this.cacheTime = Date.now();
    return data;
  }

  async hasPermission(resource: string): Promise<boolean> {
    if (!this.cachedAllow || Date.now() - this.cacheTime > this.cacheTtl)
      await this.fetchPermissions();
    if (this.cachedDeny && matchAnyPermission(this.cachedDeny, resource)) return false;
    return matchAnyPermission(this.cachedAllow!, resource);
  }

  invalidatePermissionsCache(): void {
    this.cachedAllow = null;
    this.cachedDeny = null;
    this.cacheTime = 0;
  }

  async delegate(params: AgentDelegateParams): Promise<Delegation> {
    const wsId = params.workspaceId ?? this.workspaceId;
    const { data } = await this.signedFetch<Delegation>('/delegations', {
      method: 'POST',
      body: {
        issuerAgentId: this.agentId,
        targetAgentId: params.targetAgentId,
        permissions: params.permissions,
        constraints: params.constraints,
        ...(wsId ? { workspaceId: wsId } : {}),
      },
    });
    return data;
  }

  async revokeAllDelegations(): Promise<{ revokedCount: number }> {
    const { data } = await this.signedFetch<{ revokedCount: number }>(`/agents/${this.agentId}/delegations/revoke-all`, { method: 'POST' });
    return data;
  }

  /**
   * Delegate to another agent and immediately issue a JWT.
   * This is the recommended path for agent-to-agent delegation (Phase 7 unified token).
   *
   * @returns The delegation record AND a signed JWT ready for use in tool calls.
   */
  async delegateWithJwt(
    params: AgentDelegateParams,
    jwtParams?: IssueAgentDelegationJwtParams,
  ): Promise<{ delegation: Delegation; jwt: AgentDelegationJwt }> {
    const delegation = await this.delegate(params);

    const { data: jwt } = await this.signedFetch<AgentDelegationJwt>(
      `/delegations/${delegation.id}/jwt`,
      {
        method: 'POST',
        body: {
          audience: jwtParams?.audience,
          lifetimeSeconds: jwtParams?.lifetimeSeconds,
        },
      },
    );

    return { delegation, jwt };
  }

  /**
   * Issue a JWT from an existing agent-to-agent delegation record.
   * Used to refresh/re-issue JWTs when they expire (short-lived, 5-15 min).
   */
  async issueDelegationJwtFromRecord(
    delegationId: string,
    params?: IssueAgentDelegationJwtParams,
  ): Promise<AgentDelegationJwt> {
    const { data } = await this.signedFetch<AgentDelegationJwt>(
      `/delegations/${delegationId}/jwt`,
      {
        method: 'POST',
        body: {
          audience: params?.audience,
          lifetimeSeconds: params?.lifetimeSeconds,
        },
      },
    );
    return data;
  }

  /**
   * Verify an agent delegation JWT.
   */
  async verifyAgentDelegationJwt(
    token: string,
    audience?: string,
  ): Promise<VerifyAgentDelegationJwtResult> {
    const { data } = await this.signedFetch<VerifyAgentDelegationJwtResult>(
      '/delegations/verify-jwt',
      {
        method: 'POST',
        body: { token, audience },
      },
    );
    return data;
  }

  // -- User Delegation Methods --

  /**
   * Generate a consent URL for user delegation.
   * The user should be redirected to this URL to authenticate and approve scoped delegation.
   *
   * @param params - Delegation request parameters
   * @returns The full consent URL to redirect the user to
   */
  createDelegationRequest(params: DelegationRequestParams): string {
    const consentBase = this.baseUrl.replace('/api/v1', '');
    const url = new URL(`${consentBase}/delegate`);
    url.searchParams.set('agent_id', this.agentId);
    url.searchParams.set('workspace_id', params.workspaceId);
    url.searchParams.set('scope', params.scopes.join(','));
    if (params.maxDuration) url.searchParams.set('max_duration', String(params.maxDuration));
    if (params.reason) url.searchParams.set('reason', params.reason);
    url.searchParams.set('redirect_uri', params.redirectUri);
    url.searchParams.set('state', params.state ?? crypto.randomUUID());
    return url.toString();
  }

  /**
   * Issue a delegation JWT from a grant.
   * Called after the user has approved delegation via the consent flow.
   *
   * @param grantId - The delegation grant ID received from the consent callback
   * @param params - Token issuance parameters
   * @returns The signed delegation JWT and metadata
   */
  async issueDelegationToken(
    grantId: string,
    params?: Partial<IssueUserDelegationTokenParams>,
  ): Promise<UserDelegationToken> {
    const agentFullId = `agent:authora:${this.workspaceId ?? 'unknown'}:${this.agentId}`;
    const { data } = await this.signedFetch<UserDelegationToken>(
      `/user-delegations/${grantId}/token`,
      {
        method: 'POST',
        body: {
          agentFullId: params?.agentFullId ?? agentFullId,
          audience: params?.audience,
          lifetimeSeconds: params?.lifetimeSeconds,
        },
      },
    );
    return data;
  }

  /**
   * Refresh a delegation JWT.
   *
   * @param grantId - The delegation grant ID
   * @param params - Refresh parameters
   * @returns A fresh delegation JWT
   */
  async refreshDelegationToken(
    grantId: string,
    params?: Partial<RefreshUserDelegationTokenParams>,
  ): Promise<UserDelegationToken> {
    const agentFullId = `agent:authora:${this.workspaceId ?? 'unknown'}:${this.agentId}`;
    const { data } = await this.signedFetch<UserDelegationToken>(
      `/user-delegations/${grantId}/refresh`,
      {
        method: 'POST',
        body: {
          agentFullId: params?.agentFullId ?? agentFullId,
          currentToken: params?.currentToken,
          audience: params?.audience,
        },
      },
    );
    return data;
  }

  /**
   * Call an MCP tool with a user delegation JWT.
   * The JWT is passed in the `_authora.delegationJwt` field.
   *
   * @param params - Tool call parameters (must include delegationJwt)
   * @returns The MCP proxy response
   */
  async callToolAsDelegated(
    params: McpToolCallParams & { delegationJwt: string },
  ): Promise<McpProxyResponse> {
    const timestamp = new Date().toISOString();
    const sig = sign(buildSignaturePayload('POST', '/mcp/proxy', timestamp, null), this.privateKey);
    const { data } = await this.signedFetch<McpProxyResponse>('/mcp/proxy', {
      method: 'POST',
      body: {
        jsonrpc: '2.0',
        id: params.id ?? `${this.agentId}-${Date.now()}`,
        method: params.method ?? 'tools/call',
        params: {
          name: params.toolName,
          arguments: params.arguments,
          _authora: {
            agentId: this.agentId,
            signature: sig,
            timestamp,
            mcpServerId: params.mcpServerId,
            delegationJwt: params.delegationJwt,
          },
        },
      },
    });
    return data;
  }

  async updateProfile(params: { name?: string; description?: string; tags?: string[]; framework?: string; modelProvider?: string; modelId?: string }): Promise<Agent> {
    const { data } = await this.signedFetch<Agent>(`/agents/${this.agentId}`, { method: 'PATCH', body: params });
    return data;
  }

  async callTool(params: McpToolCallParams): Promise<McpProxyResponse> {
    const timestamp = new Date().toISOString();
    const sig = sign(buildSignaturePayload('POST', '/mcp/proxy', timestamp, null), this.privateKey);

    // Build _authora metadata: prefer JWT over legacy record-ID token
    const authoraMeta: Record<string, unknown> = {
      agentId: this.agentId,
      signature: sig,
      timestamp,
      mcpServerId: params.mcpServerId,
    };

    if (params.delegationJwt) {
      // Unified JWT path (Phase 7: agent-to-agent or user delegation)
      authoraMeta.delegationJwt = params.delegationJwt;
    } else if (params.delegationToken ?? this.delegationToken) {
      // Legacy record-ID path (deprecated, backward compat)
      authoraMeta.delegationToken = params.delegationToken ?? this.delegationToken;
    }

    const { data } = await this.signedFetch<McpProxyResponse>('/mcp/proxy', {
      method: 'POST',
      body: {
        jsonrpc: '2.0',
        id: params.id ?? `${this.agentId}-${Date.now()}`,
        method: params.method ?? 'tools/call',
        params: {
          name: params.toolName,
          arguments: params.arguments,
          _authora: authoraMeta,
        },
      },
    });
    return data;
  }

  async rotateKey(): Promise<{ agent: Agent; keyPair: { privateKey: string; publicKey: string } }> {
    const kp = generateKeyPair();
    const { data } = await this.signedFetch<Agent>(`/agents/${this.agentId}/rotate-key`, {
      method: 'POST', body: { publicKey: kp.publicKey },
    });
    return { agent: data, keyPair: kp };
  }

  async suspend(): Promise<Agent> {
    return (await this.signedFetch<Agent>(`/agents/${this.agentId}/suspend`, { method: 'POST' })).data;
  }

  async reactivate(): Promise<{ agent: Agent; keyPair: { privateKey: string; publicKey: string } }> {
    const kp = generateKeyPair();
    const { data } = await this.signedFetch<Agent>(`/agents/${this.agentId}/activate`, {
      method: 'POST', body: { publicKey: kp.publicKey },
    });
    return { agent: data, keyPair: kp };
  }

  async revoke(): Promise<Agent> {
    return (await this.signedFetch<Agent>(`/agents/${this.agentId}/revoke`, { method: 'POST' })).data;
  }

  async getIdentityDocument(): Promise<AgentVerification> {
    const url = `${this.baseUrl}/agents/${this.agentId}/verify`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeout);
    let res: Response;
    try {
      res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' }, signal: ctrl.signal });
    } catch (err: unknown) {
      clearTimeout(timer);
      if (err instanceof DOMException && err.name === 'AbortError') throw new TimeoutError('identity doc request timed out');
      throw new NetworkError(`identity doc request failed: ${err instanceof Error ? err.message : 'unknown'}`, err);
    } finally {
      clearTimeout(timer);
    }
    const body = await res.json();
    if (!res.ok) this.throwForStatus(res.status, body, 'GET', `/agents/${this.agentId}/verify`);
    return this.unwrap(body) as AgentVerification;
  }

  async getProfile(): Promise<Agent> {
    return (await this.signedFetch<Agent>(`/agents/${this.agentId}`)).data;
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  private unwrap(body: unknown): unknown {
    if (body && typeof body === 'object' && 'data' in (body as Record<string, unknown>))
      return (body as Record<string, unknown>)['data'];
    return body;
  }

  private throwForStatus(status: number, body: unknown, method: string, path: string): never {
    const e = this.parseErr(body);
    const p = `${method} ${path}`;
    switch (status) {
      case 401: throw new AuthenticationError(e.message ?? `${p}: auth failed`, e.details);
      case 403: throw new AuthorizationError(e.message ?? `${p}: forbidden`, e.details);
      case 404: throw new NotFoundError(e.message ?? `${p}: not found`, e.details);
      case 429: throw new RateLimitError(e.message ?? `${p}: rate limited`, e.retryAfter, e.details);
      default: throw new AuthoraError(e.message ?? `${p}: status ${status}`, status, e.code, e.details);
    }
  }

  private parseErr(body: unknown): { message?: string; code?: string; details?: unknown; retryAfter?: number } {
    if (body && typeof body === 'object') {
      let o = body as Record<string, unknown>;
      if (o['error'] && typeof o['error'] === 'object') {
        o = o['error'] as Record<string, unknown>;
      }
      return {
        message: typeof o['message'] === 'string' ? o['message'] : undefined,
        code: typeof o['code'] === 'string' ? o['code'] : undefined,
        details: o['details'],
        retryAfter: typeof o['retryAfter'] === 'number' ? o['retryAfter'] : undefined,
      };
    }
    return typeof body === 'string' ? { message: body } : {};
  }
}
