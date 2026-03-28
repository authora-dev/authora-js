import { HttpClient } from './http.js';
import { generateKeyPair } from './crypto.js';
import { AuthoraAgent } from './agent.js';
import type {
  AuthoraClientOptions,
  AgentVerification,
  CreateAgentParams,
  CreateAgentResult,
  AgentOptions,
} from './types.js';
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
import { ApprovalsResource } from './resources/approvals.js';
import { CreditsResource } from './resources/credits.js';
import { UserDelegationsResource } from './resources/user-delegations.js';
import { AgentGroupsResource } from './resources/agent-groups.js';

const DEFAULT_BASE_URL = 'https://api.authora.dev/api/v1';
const DEFAULT_TIMEOUT = 30_000;

export class AuthoraClient {
  public readonly agents: AgentsResource;
  public readonly roles: RolesResource;
  public readonly permissions: PermissionsResource;
  public readonly delegations: DelegationsResource;
  public readonly policies: PoliciesResource;
  public readonly mcp: McpResource;
  public readonly audit: AuditResource;
  public readonly notifications: NotificationsResource;
  public readonly webhooks: WebhooksResource;
  public readonly alerts: AlertsResource;
  public readonly apiKeys: ApiKeysResource;
  public readonly organizations: OrganizationsResource;
  public readonly workspaces: WorkspacesResource;
  public readonly approvals: ApprovalsResource;
  public readonly credits: CreditsResource;
  public readonly userDelegations: UserDelegationsResource;
  public readonly agentGroups: AgentGroupsResource;

  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(options: AuthoraClientOptions) {
    if (!options.apiKey) throw new Error('AuthoraClient requires an apiKey');

    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;

    const http = new HttpClient({
      baseUrl: this.baseUrl,
      apiKey: options.apiKey,
      timeout: this.timeout,
      headers: options.headers,
    });

    this.agents = new AgentsResource(http);
    this.roles = new RolesResource(http);
    this.permissions = new PermissionsResource(http);
    this.delegations = new DelegationsResource(http);
    this.policies = new PoliciesResource(http);
    this.mcp = new McpResource(http);
    this.audit = new AuditResource(http, this.baseUrl, options.apiKey);
    this.notifications = new NotificationsResource(http);
    this.webhooks = new WebhooksResource(http);
    this.alerts = new AlertsResource(http);
    this.apiKeys = new ApiKeysResource(http);
    this.organizations = new OrganizationsResource(http);
    this.workspaces = new WorkspacesResource(http);
    this.approvals = new ApprovalsResource(http);
    this.credits = new CreditsResource(http);
    this.userDelegations = new UserDelegationsResource(http);
    this.agentGroups = new AgentGroupsResource(http);
  }

  async createAgent(params: CreateAgentParams): Promise<CreateAgentResult> {
    const agent = await this.agents.create(params);
    const keyPair = generateKeyPair();
    const activated = await this.agents.activate(agent.id, { publicKey: keyPair.publicKey });
    return { agent: activated, keyPair };
  }

  loadAgent(options: Omit<AgentOptions, 'baseUrl' | 'timeout'> & { baseUrl?: string; timeout?: number }): AuthoraAgent {
    return new AuthoraAgent({
      ...options,
      baseUrl: options.baseUrl ?? this.baseUrl,
      timeout: options.timeout ?? this.timeout,
    });
  }

  loadDelegatedAgent(options: Omit<AgentOptions, 'baseUrl' | 'timeout'> & { baseUrl?: string; timeout?: number; delegationToken: string }): AuthoraAgent {
    return new AuthoraAgent({
      ...options,
      baseUrl: options.baseUrl ?? this.baseUrl,
      timeout: options.timeout ?? this.timeout,
    });
  }

  async verifyAgent(agentId: string): Promise<AgentVerification> {
    return this.agents.verify(agentId);
  }
}
