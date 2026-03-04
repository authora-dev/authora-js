// ---------------------------------------------------------------------------
// SDK configuration
// ---------------------------------------------------------------------------

/** Configuration options for the AuthoraClient. */
export interface AuthoraClientOptions {
  /** API key used for authentication. Sent as `Authorization: Bearer <apiKey>`. */
  apiKey: string;
  /** Base URL for the Authora API. Defaults to `https://api.authora.dev/api/v1`. */
  baseUrl?: string;
  /** Request timeout in milliseconds. Defaults to 30000. */
  timeout?: number;
  /** Custom headers to include in every request. */
  headers?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Common / shared types
// ---------------------------------------------------------------------------

/** Standard paginated list response. */
export interface PaginatedList<T> {
  items: T[];
  total: number;
  page?: number;
  limit?: number;
}

/** Pagination query parameters. */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------

export type AgentStatus = 'pending' | 'active' | 'suspended' | 'revoked';

export interface Agent {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  status: AgentStatus;
  createdBy: string;
  publicKey?: string;
  apiKeyHash?: string;
  expiresAt?: string;
  tags?: string[];
  framework?: string;
  modelProvider?: string;
  modelId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentParams {
  workspaceId: string;
  name: string;
  description?: string;
  createdBy: string;
  expiresIn?: number;
  tags?: string[];
  framework?: string;
  modelProvider?: string;
  modelId?: string;
}

export interface ListAgentsParams extends PaginationParams {
  workspaceId: string;
  status?: AgentStatus;
}

export interface ActivateAgentParams {
  publicKey: string;
}

export interface RotateKeyParams {
  publicKey: string;
}

export interface AgentVerification {
  valid: boolean;
  agent?: Agent;
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export interface Role {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  permissions: string[];
  denyPermissions?: string[];
  stage?: string;
  maxSessionDuration?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleParams {
  workspaceId: string;
  name: string;
  description?: string;
  permissions: string[];
  denyPermissions?: string[];
  stage?: string;
  maxSessionDuration?: number;
}

export interface ListRolesParams extends PaginationParams {
  workspaceId: string;
}

export interface UpdateRoleParams {
  name?: string;
  description?: string;
  permissions?: string[];
  denyPermissions?: string[];
  stage?: string;
  maxSessionDuration?: number;
}

// ---------------------------------------------------------------------------
// Agent Role Assignments
// ---------------------------------------------------------------------------

export interface AgentRoleAssignment {
  agentId: string;
  roleId: string;
  grantedBy?: string;
  expiresAt?: string;
  assignedAt: string;
}

export interface AssignRoleParams {
  roleId: string;
  grantedBy?: string;
  expiresAt?: string;
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

export interface PermissionCheckParams {
  agentId: string;
  resource: string;
  action: string;
  context?: Record<string, unknown>;
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  matchedPolicies?: string[];
}

export interface BatchCheckItem {
  resource: string;
  action: string;
}

export interface BatchPermissionCheckParams {
  agentId: string;
  checks: BatchCheckItem[];
}

export interface BatchPermissionCheckResult {
  results: PermissionCheckResult[];
}

export interface EffectivePermission {
  resource: string;
  actions: string[];
  source: string;
}

// ---------------------------------------------------------------------------
// Delegations
// ---------------------------------------------------------------------------

export type DelegationStatus = 'active' | 'revoked' | 'expired';

export interface Delegation {
  id: string;
  issuerAgentId: string;
  targetAgentId: string;
  permissions: string[];
  constraints?: Record<string, unknown>;
  status: DelegationStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface CreateDelegationParams {
  issuerAgentId: string;
  targetAgentId: string;
  permissions: string[];
  constraints?: Record<string, unknown>;
}

export interface DelegationVerification {
  valid: boolean;
  delegation?: Delegation;
}

export interface VerifyDelegationParams {
  delegationId: string;
}

export interface ListAgentDelegationsParams extends PaginationParams {
  direction?: 'issued' | 'received';
}

// ---------------------------------------------------------------------------
// Policies
// ---------------------------------------------------------------------------

export type PolicyEffect = 'allow' | 'deny';

export interface Policy {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  effect: PolicyEffect;
  principals: string[];
  resources: string[];
  actions?: string[];
  conditions?: Record<string, unknown>;
  priority?: number;
  enabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePolicyParams {
  workspaceId: string;
  name: string;
  description?: string;
  effect: PolicyEffect;
  principals: string[];
  resources: string[];
  actions?: string[];
  conditions?: Record<string, unknown>;
  priority?: number;
  enabled?: boolean;
}

export interface ListPoliciesParams {
  workspaceId: string;
}

export interface UpdatePolicyParams {
  name?: string;
  description?: string;
  effect?: PolicyEffect;
  principals?: string[];
  resources?: string[];
  actions?: string[];
  conditions?: Record<string, unknown>;
  priority?: number;
  enabled?: boolean;
}

export interface SimulatePolicyParams {
  workspaceId: string;
  agentId: string;
  resource: string;
  action: string;
}

export interface EvaluatePolicyParams {
  workspaceId: string;
  agentId: string;
  resource: string;
  action: string;
}

export interface PolicySimulationResult {
  allowed: boolean;
  matchedPolicies: Policy[];
  reason?: string;
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  effect: PolicyEffect;
  matchedPolicies: string[];
  reason?: string;
}

// ---------------------------------------------------------------------------
// MCP Servers
// ---------------------------------------------------------------------------

export type McpTransport = 'stdio' | 'sse' | 'http';

export interface McpServer {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  url: string;
  transport?: McpTransport;
  version?: string;
  authConfig?: Record<string, unknown>;
  connectionTimeout?: number;
  maxRetries?: number;
  status?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterMcpServerParams {
  workspaceId: string;
  name: string;
  description?: string;
  url: string;
  transport?: McpTransport;
  version?: string;
  authConfig?: Record<string, unknown>;
  connectionTimeout?: number;
  maxRetries?: number;
}

export interface ListMcpServersParams {
  workspaceId: string;
}

export interface UpdateMcpServerParams {
  name?: string;
  description?: string;
  url?: string;
  transport?: McpTransport;
  version?: string;
  authConfig?: Record<string, unknown>;
  connectionTimeout?: number;
  maxRetries?: number;
}

export interface McpTool {
  id: string;
  serverId: string;
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  createdAt: string;
}

export interface RegisterMcpToolParams {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface McpProxyRequest {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
  id?: string | number;
}

export interface McpProxyResponse {
  jsonrpc: '2.0';
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
  id?: string | number;
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export interface AuditEvent {
  id: string;
  orgId?: string;
  workspaceId?: string;
  agentId?: string;
  type: string;
  resource?: string;
  action?: string;
  result?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface ListAuditEventsParams extends PaginationParams {
  orgId?: string;
  workspaceId?: string;
  agentId?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  resource?: string;
  result?: string;
}

export interface GenerateReportParams {
  orgId: string;
  dateFrom: string;
  dateTo: string;
}

export interface AuditReport {
  id: string;
  orgId: string;
  dateFrom: string;
  dateTo: string;
  generatedAt: string;
  summary?: Record<string, unknown>;
  url?: string;
}

export interface AuditMetricsParams {
  orgId: string;
  workspaceId?: string;
  agentId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AuditMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByResult: Record<string, number>;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export interface Notification {
  id: string;
  organizationId: string;
  userId?: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface ListNotificationsParams {
  organizationId: string;
  userId?: string;
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface UnreadCountParams {
  organizationId: string;
  userId?: string;
}

export interface UnreadCountResult {
  count: number;
  unreadCount?: number;
}

export interface MarkAllReadParams {
  organizationId: string;
  userId?: string;
}

// ---------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------

export interface Webhook {
  id: string;
  organizationId: string;
  url: string;
  eventTypes: string[];
  secret: string;
  enabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookParams {
  organizationId: string;
  url: string;
  eventTypes: string[];
  secret: string;
}

export interface ListWebhooksParams {
  organizationId: string;
}

export interface UpdateWebhookParams {
  url?: string;
  eventTypes?: string[];
  secret?: string;
  enabled?: boolean;
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

export interface Alert {
  id: string;
  organizationId: string;
  name: string;
  eventTypes: string[];
  conditions: Record<string, unknown>;
  channels: Record<string, unknown>[];
  enabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAlertParams {
  organizationId: string;
  name: string;
  eventTypes: string[];
  conditions: Record<string, unknown>;
  channels: Record<string, unknown>[];
}

export interface ListAlertsParams {
  organizationId: string;
}

export interface UpdateAlertParams {
  name?: string;
  eventTypes?: string[];
  conditions?: Record<string, unknown>;
  channels?: Record<string, unknown>[];
  enabled?: boolean;
}

// ---------------------------------------------------------------------------
// API Keys
// ---------------------------------------------------------------------------

export interface ApiKey {
  id: string;
  organizationId: string;
  name: string;
  key?: string;
  keyPrefix?: string;
  scopes?: string[];
  createdBy: string;
  expiresAt?: string;
  createdAt: string;
}

export interface CreateApiKeyParams {
  organizationId: string;
  name: string;
  scopes?: string[];
  createdBy: string;
  expiresInDays?: number;
}

export interface ListApiKeysParams {
  organizationId: string;
}

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrganizationParams {
  name: string;
  slug: string;
}

export interface ListOrganizationsParams extends PaginationParams {}

// ---------------------------------------------------------------------------
// Workspaces
// ---------------------------------------------------------------------------

export interface Workspace {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkspaceParams {
  organizationId: string;
  name: string;
  slug: string;
}

export interface ListWorkspacesParams extends PaginationParams {
  organizationId: string;
}
