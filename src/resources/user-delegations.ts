/**
 * User Delegations Resource
 *
 * SDK resource for managing user-to-agent delegation grants.
 * Uses the user-delegation-service API (proxied through the API gateway).
 */

import type { HttpClient } from '../http.js';
import type {
  UserDelegationGrant,
  CreateUserDelegationParams,
  ListUserDelegationParams,
  UserDelegationToken,
  IssueUserDelegationTokenParams,
  RefreshUserDelegationTokenParams,
  VerifyUserDelegationTokenResult,
} from '../types.js';
import { toQuery } from '../utils.js';

export class UserDelegationsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Create a user delegation grant (SDK consent method).
   * Typically grants are created via the hosted consent flow,
   * but this allows programmatic creation with a valid IdP token.
   */
  async create(params: CreateUserDelegationParams): Promise<UserDelegationGrant> {
    return this.http.post<UserDelegationGrant>('/user-delegations', { body: params });
  }

  /**
   * Get a specific delegation grant by ID.
   */
  async get(grantId: string): Promise<UserDelegationGrant> {
    return this.http.get<UserDelegationGrant>(`/user-delegations/${grantId}`);
  }

  /**
   * List delegation grants by user.
   */
  async listByUser(userId: string, params?: ListUserDelegationParams): Promise<UserDelegationGrant[]> {
    return this.http.get<UserDelegationGrant[]>(
      `/user-delegations/by-user/${userId}`,
      params ? { query: toQuery(params) } : undefined,
    );
  }

  /**
   * List delegation grants by agent.
   */
  async listByAgent(agentId: string, params?: ListUserDelegationParams): Promise<UserDelegationGrant[]> {
    return this.http.get<UserDelegationGrant[]>(
      `/user-delegations/by-agent/${agentId}`,
      params ? { query: toQuery(params) } : undefined,
    );
  }

  /**
   * List delegation grants by organization.
   */
  async listByOrg(
    orgId: string,
    params?: ListUserDelegationParams & { page?: number; limit?: number },
  ): Promise<{ data: UserDelegationGrant[]; pagination: { total: number; page: number; limit: number } }> {
    return this.http.get(`/user-delegations/by-org/${orgId}`, params ? { query: toQuery(params) } : undefined);
  }

  /**
   * Revoke a delegation grant.
   */
  async revoke(grantId: string, params: { revokedBy: string; reason?: string }): Promise<UserDelegationGrant> {
    return this.http.post<UserDelegationGrant>(`/user-delegations/${grantId}/revoke`, { body: params });
  }

  /**
   * Issue a fresh delegation JWT from a grant.
   */
  async issueToken(grantId: string, params: IssueUserDelegationTokenParams): Promise<UserDelegationToken> {
    return this.http.post<UserDelegationToken>(`/user-delegations/${grantId}/token`, { body: params });
  }

  /**
   * Refresh a delegation JWT.
   */
  async refreshToken(grantId: string, params: RefreshUserDelegationTokenParams): Promise<UserDelegationToken> {
    return this.http.post<UserDelegationToken>(`/user-delegations/${grantId}/refresh`, { body: params });
  }

  /**
   * Verify a delegation JWT.
   */
  async verifyToken(token: string, audience?: string): Promise<VerifyUserDelegationTokenResult> {
    return this.http.post<VerifyUserDelegationTokenResult>('/user-delegations/tokens/verify', {
      body: { token, audience },
    });
  }
}
