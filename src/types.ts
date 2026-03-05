export interface AuthoraClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface PaginatedList<T> {
  items: T[];
  total: number;
  page?: number;
  limit?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export type AgentStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED';

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

export interface UpdateAgentParams {
  name?: string;
  description?: string;
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
  identityDocument?: Record<string, unknown>;
  signature?: string;
}

export interface Role {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  permissions: string[];
  denyPermissions?: string[];
  stage?: string;
  maxSessionDuration?: number;
  parentRoleId?: string | null;
  isBuiltin?: boolean;
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
  parentRoleId?: string;
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
  parentRoleId?: string | null;
}

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

export interface EffectivePermissions {
  agentId: string;
  permissions: string[];
  denyPermissions: string[];
}

export type DelegationStatus = 'active' | 'revoked' | 'expired';

export interface Delegation {
  id: string;
  issuerAgentId: string;
  targetAgentId: string;
  permissions: string[];
  constraints?: DelegationConstraints;
  parentDelegationId?: string;
  status: DelegationStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface DelegationConstraints {
  maxDepth?: number;
  expiresAt?: string;
  singleUse?: boolean;
  allowedTargets?: string[];
}

export interface CreateDelegationParams {
  issuerAgentId: string;
  targetAgentId: string;
  permissions: string[];
  constraints?: DelegationConstraints;
  parentDelegationId?: string;
}

export interface BulkRevokeResult {
  revokedCount: number;
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

export type PolicyEffect = 'ALLOW' | 'DENY';

export interface PolicyPrincipals {
  roles?: string[];
  agents?: string[];
  workspaces?: string[];
}

export interface Policy {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  effect: PolicyEffect;
  principals: PolicyPrincipals;
  resources: string[];
  actions?: string[];
  conditions?: Record<string, unknown>;
  priority?: number;
  enabled?: boolean;
  version?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyVersion {
  id: string;
  policyId: string;
  version: number;
  name: string;
  description: string;
  effect: PolicyEffect;
  principals: PolicyPrincipals;
  resources: string[];
  actions: string[];
  conditions: Record<string, unknown>;
  priority: number;
  enabled: boolean;
  changedBy: string;
  createdAt: string;
}

export interface CreatePolicyParams {
  workspaceId: string;
  name: string;
  description?: string;
  effect: PolicyEffect;
  principals: PolicyPrincipals;
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
  principals?: PolicyPrincipals;
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

export interface ApiKey {
  id: string;
  organizationId: string;
  name: string;
  key?: string;
  keyPrefix?: string;
  scopes?: string[];
  createdBy: string;
  status?: 'active' | 'rotated' | 'revoked';
  rotatedFromId?: string | null;
  gracePeriodEndsAt?: string | null;
  expiresAt?: string;
  createdAt: string;
}

export interface RotatedApiKey extends ApiKey {
  rawKey: string;
  rotatedFrom: {
    id: string;
    gracePeriodEndsAt: string;
  };
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

export interface WorkspaceStats {
  totalAgents: number;
  activeAgents: number;
  suspendedAgents: number;
  revokedAgents: number;
  pendingAgents: number;
}

// Agent Runtime

export interface KeyRotationResult {
  agent: Agent;
  keyPair: { privateKey: string; publicKey: string };
}

export interface AgentOptions {
  agentId: string;
  privateKey: string;
  workspaceId?: string;
  baseUrl?: string;
  timeout?: number;
  permissionsCacheTtl?: number;
  delegationToken?: string;
  rotationIntervalDays?: number;
  onKeyRotated?: (result: KeyRotationResult) => void | Promise<void>;
}

export interface SignedRequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
}

export interface SignedResponse<T = unknown> {
  data: T;
  status: number;
  headers: Headers;
}

export interface AgentDelegateParams {
  targetAgentId: string;
  permissions: string[];
  constraints?: DelegationConstraints;
  workspaceId?: string;
}

export interface McpToolCallParams {
  mcpServerId: string;
  toolName: string;
  arguments?: Record<string, unknown>;
  method?: string;
  id?: string | number;
  delegationToken?: string;
}

export interface CreateAgentResult {
  agent: Agent;
  keyPair: { privateKey: string; publicKey: string };
}

// MCP Middleware

export interface McpAuthoraMetadata {
  agentId: string;
  signature: string;
  timestamp: string;
  delegationToken?: string;
}

export interface McpGuardOptions {
  resolvePublicKey: (agentId: string) => Promise<string | null>;
  requiredPermissions?: string[];
  onDenied?: (agentId: string, reason: string) => void;
  checkPermission?: (agentId: string, resource: string, action: string) => Promise<boolean>;
  validateDelegation?: (delegationToken: string) => Promise<boolean>;
}

export interface McpToolContext {
  agentId: string;
  timestamp: string;
  delegationToken?: string;
  verified: boolean;
}

export interface McpMiddlewareOptions {
  resolvePublicKey: (agentId: string) => Promise<string | null>;
  requiredPermissions?: string[];
  onDenied?: (agentId: string, reason: string) => void;
  onAuthenticated?: (context: McpToolContext) => void;
  checkPermission?: (agentId: string, resource: string, action: string) => Promise<boolean>;
  validateDelegation?: (delegationToken: string) => Promise<boolean>;
}

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ApprovalChallenge {
  id: string;
  organizationId: string;
  workspaceId: string;
  agentId: string;
  challengeType: string;
  mcpServerId?: string;
  toolName?: string;
  arguments?: Record<string, unknown>;
  resource: string;
  action: string;
  context?: Record<string, unknown>;
  status: ApprovalStatus;
  riskLevel?: RiskLevel;
  riskScore?: number;
  riskFactors?: Record<string, unknown>[];
  decidedBy?: string;
  decidedAt?: string;
  decision?: string;
  decisionNote?: string;
  decisionSource?: string;
  escalationLevel?: number;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListApprovalsParams {
  status?: ApprovalStatus;
  riskLevel?: RiskLevel;
  agentId?: string;
  limit?: number;
  offset?: number;
}

export interface ApprovalStats {
  pending: number;
  approvedToday: number;
  deniedToday: number;
  expiredToday: number;
  avgResponseTime?: number;
}

export interface DecideApprovalParams {
  action: 'approve' | 'deny';
  scope?: 'once' | 'policy';
  permissionScopes?: string[];
  note?: string;
  source?: 'dashboard' | 'slack' | 'api';
}

export interface BulkDecideParams {
  challengeIds: string[];
  action: 'approve' | 'deny';
  scope?: 'once' | 'policy';
  note?: string;
  source?: 'dashboard' | 'slack' | 'api';
}

export interface BulkDecideResult {
  processed: number;
  succeeded: number;
  failed: number;
  results: Array<{ id: string; success: boolean; error?: string }>;
}

export interface PermissionSuggestion {
  scope: string;
  breadth: 'exact' | 'narrow' | 'moderate' | 'broad';
  description?: string;
}

export interface ApprovalSettings {
  organizationId: string;
  enabled: boolean;
  defaultTimeout: number;
  riskEngine: 'rule' | 'ai';
  aiSource?: 'authora' | 'byok';
  aiProvider?: string;
  aiModel?: string;
  aiEndpoint?: string;
  autoApproveLow: boolean;
  requireNoteOnDeny: boolean;
  slackEnabled: boolean;
  slackChannelId?: string;
  autoLearnThreshold: number;
  escalationEnabled: boolean;
  pushEnabled: boolean;
  webhookForwardingEnabled: boolean;
  notifyChannels: string[];
}

export interface UpdateApprovalSettingsParams {
  enabled?: boolean;
  defaultTimeout?: number;
  riskEngine?: 'rule' | 'ai';
  aiSource?: 'authora' | 'byok';
  aiProvider?: string;
  aiApiKeyEncrypted?: string;
  aiModel?: string;
  aiEndpoint?: string;
  autoApproveLow?: boolean;
  requireNoteOnDeny?: boolean;
  slackEnabled?: boolean;
  slackBotTokenEncrypted?: string;
  slackChannelId?: string;
  slackSigningSecret?: string;
  autoLearnThreshold?: number;
  escalationEnabled?: boolean;
  pushEnabled?: boolean;
  webhookForwardingEnabled?: boolean;
  notifyChannels?: string[];
}

export interface TestAiParams {
  source: 'authora' | 'byok';
  provider?: string;
  apiKey?: string;
  model?: string;
  endpoint?: string;
}

export interface TestAiResult {
  success: boolean;
  message?: string;
  latencyMs?: number;
}

export interface ApprovalPattern {
  id: string;
  organizationId: string;
  agentId: string;
  resource: string;
  action: string;
  toolName?: string;
  mcpServerId?: string;
  occurrenceCount: number;
  status: 'active' | 'dismissed' | 'policy_created';
  createdAt: string;
  updatedAt: string;
}

export interface ListPatternsParams {
  status?: 'active' | 'dismissed' | 'policy_created';
  readyOnly?: boolean;
}

export interface EscalationStep {
  delaySeconds: number;
  notifyUserIds: string[];
  channels: Array<'slack_channel' | 'slack_dm' | 'dashboard'>;
}

export interface EscalationRule {
  id: string;
  organizationId: string;
  name: string;
  enabled: boolean;
  riskLevels: RiskLevel[];
  steps: EscalationStep[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateEscalationRuleParams {
  name: string;
  enabled?: boolean;
  riskLevels: RiskLevel[];
  steps: EscalationStep[];
}

export interface UpdateEscalationRuleParams {
  name?: string;
  enabled?: boolean;
  riskLevels?: RiskLevel[];
  steps?: EscalationStep[];
}

export interface PushSubscribeParams {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface ApprovalWebhook {
  id: string;
  organizationId: string;
  name: string;
  url: string;
  eventTypes?: string[];
  enabled: boolean;
  headers?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApprovalWebhookParams {
  name: string;
  url: string;
  secret: string;
  eventTypes?: string[];
  enabled?: boolean;
  headers?: Record<string, string>;
}

export interface UpdateApprovalWebhookParams {
  name?: string;
  url?: string;
  secret?: string;
  eventTypes?: string[];
  enabled?: boolean;
  headers?: Record<string, string>;
}

export interface CreditBalance {
  organizationId: string;
  balance: number;
  lifetimePurchased: number;
  lifetimeConsumed: number;
}

export interface CreditTransaction {
  id: string;
  organizationId: string;
  type: 'purchase' | 'consume' | 'refund' | 'bonus';
  amount: number;
  balanceAfter: number;
  description: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ListCreditTransactionsParams {
  type?: 'purchase' | 'consume' | 'refund' | 'bonus';
  limit?: number;
  offset?: number;
}

export interface CreditCheckoutParams {
  pack: 'starter' | 'growth' | 'scale';
}

export interface CreditCheckoutResult {
  url: string;
}

export type WebhookEventType =
  | 'agent.created'
  | 'agent.activated'
  | 'agent.suspended'
  | 'agent.revoked'
  | 'agent.key_rotated'
  | 'agent.updated'
  | 'agent.data_deleted'
  | 'auth.request_signed'
  | 'auth.signature_valid'
  | 'auth.signature_invalid'
  | 'auth.agent_not_found'
  | 'authz.permission_granted'
  | 'authz.permission_denied'
  | 'authz.role_assigned'
  | 'authz.role_removed'
  | 'role.created'
  | 'role.updated'
  | 'role.deleted'
  | 'role.assigned'
  | 'role.unassigned'
  | 'policy.created'
  | 'policy.updated'
  | 'policy.deleted'
  | 'policy.rolledback'
  | 'delegation.requested'
  | 'delegation.approved'
  | 'delegation.denied'
  | 'delegation.created'
  | 'delegation.revoked'
  | 'delegation.bulk_revoked'
  | 'delegation.token_issued'
  | 'delegation.token_revoked'
  | 'delegation.token_exchanged'
  | 'mcp.tool_call.intercepted'
  | 'mcp.tool_call.authorized'
  | 'mcp.tool_call.denied'
  | 'mcp.tool_call.completed'
  | 'admin.role_created'
  | 'admin.role_updated'
  | 'admin.policy_changed'
  | 'admin.workspace_created'
  | 'organization.data_deleted'
  | 'approval.challenge.created'
  | 'approval.challenge.viewed'
  | 'approval.challenge.decided'
  | 'approval.challenge.expired'
  | 'approval.challenge.decided_post_timeout'
  | 'approval.challenge.escalated'
  | 'approval.escalated'
  | 'approval.policy.created'
  | 'approval.policy.updated'
  | 'approval.settings.changed'
  | 'approval.agent.onboarded'
  | 'approval.risk.assessed'
  | 'approval.slack.sent'
  | 'approval.slack.interaction'
  | 'approval.pattern.detected'
  | 'approval.pattern.dismissed'
  | 'approval.pattern.policy_created'
  | 'credits.purchased'
  | 'credits.consumed'
  | 'credits.insufficient';
