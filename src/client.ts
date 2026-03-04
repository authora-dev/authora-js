import { HttpClient } from './http.js';
import type { AuthoraClientOptions } from './types.js';
import { AgentsResource } from './resources/agents.js';
import { RolesResource } from './resources/roles.js';
import { PermissionsResource } from './resources/permissions.js';
import { DelegationsResource } from './resources/delegations.js';
import { PoliciesResource } from './resources/policies.js';
import { McpResource } from './resources/mcp.js';
import { AuditResource } from './resources/audit.js';
import { NotificationsResource } from './resources/notifications.js';
import { WebhooksResource } from './resources/webhooks.js';
import { AlertsResource } from './resources/alerts.js';
import { ApiKeysResource } from './resources/api-keys.js';
import { OrganizationsResource } from './resources/organizations.js';
import { WorkspacesResource } from './resources/workspaces.js';

const DEFAULT_BASE_URL = 'https://api.authora.dev/api/v1';
const DEFAULT_TIMEOUT = 30_000;

/**
 * The main Authora SDK client.
 *
 * Provides access to all Authora API resources through typed sub-clients.
 *
 * @example
 * ```typescript
 * const authora = new AuthoraClient({
 *   apiKey: 'authora_live_...',
 * });
 *
 * const agent = await authora.agents.create({
 *   workspaceId: 'ws_123',
 *   name: 'my-agent',
 *   createdBy: 'user_456',
 * });
 * ```
 */
export class AuthoraClient {
  /** Manage agents (create, list, activate, suspend, revoke, rotate keys). */
  public readonly agents: AgentsResource;
  /** Manage roles and agent role assignments. */
  public readonly roles: RolesResource;
  /** Check and query agent permissions. */
  public readonly permissions: PermissionsResource;
  /** Manage permission delegations between agents. */
  public readonly delegations: DelegationsResource;
  /** Manage authorization policies. */
  public readonly policies: PoliciesResource;
  /** Manage MCP servers, tools, and proxy requests. */
  public readonly mcp: McpResource;
  /** Query audit events, generate reports, and retrieve metrics. */
  public readonly audit: AuditResource;
  /** Manage notifications. */
  public readonly notifications: NotificationsResource;
  /** Manage webhook subscriptions. */
  public readonly webhooks: WebhooksResource;
  /** Manage alert rules. */
  public readonly alerts: AlertsResource;
  /** Manage API keys. */
  public readonly apiKeys: ApiKeysResource;
  /** Manage organizations. */
  public readonly organizations: OrganizationsResource;
  /** Manage workspaces. */
  public readonly workspaces: WorkspacesResource;

  /**
   * Create a new AuthoraClient instance.
   *
   * @param options - Client configuration including apiKey and optional baseUrl.
   * @throws {Error} If apiKey is not provided.
   */
  constructor(options: AuthoraClientOptions) {
    if (!options.apiKey) {
      throw new Error('AuthoraClient requires an apiKey');
    }

    const http = new HttpClient({
      baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
      apiKey: options.apiKey,
      timeout: options.timeout ?? DEFAULT_TIMEOUT,
      headers: options.headers,
    });

    this.agents = new AgentsResource(http);
    this.roles = new RolesResource(http);
    this.permissions = new PermissionsResource(http);
    this.delegations = new DelegationsResource(http);
    this.policies = new PoliciesResource(http);
    this.mcp = new McpResource(http);
    this.audit = new AuditResource(http);
    this.notifications = new NotificationsResource(http);
    this.webhooks = new WebhooksResource(http);
    this.alerts = new AlertsResource(http);
    this.apiKeys = new ApiKeysResource(http);
    this.organizations = new OrganizationsResource(http);
    this.workspaces = new WorkspacesResource(http);
  }
}
