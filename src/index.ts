/**
 * @authora/sdk - Official TypeScript/JavaScript SDK for the Authora platform.
 *
 * @packageDocumentation
 */

// Main client
export { AuthoraClient } from './client.js';

// Error classes
export {
  AuthoraError,
  AuthenticationError,
  AuthorizationError,
  NetworkError,
  NotFoundError,
  RateLimitError,
  TimeoutError,
} from './errors.js';

// Resource classes
export { AgentsResource } from './resources/agents.js';
export { RolesResource } from './resources/roles.js';
export { PermissionsResource } from './resources/permissions.js';
export { DelegationsResource } from './resources/delegations.js';
export { PoliciesResource } from './resources/policies.js';
export { McpResource } from './resources/mcp.js';
export { AuditResource } from './resources/audit.js';
export { NotificationsResource } from './resources/notifications.js';
export { WebhooksResource } from './resources/webhooks.js';
export { AlertsResource } from './resources/alerts.js';
export { ApiKeysResource } from './resources/api-keys.js';
export { OrganizationsResource } from './resources/organizations.js';
export { WorkspacesResource } from './resources/workspaces.js';

// All types
export type {
  // Configuration
  AuthoraClientOptions,
  PaginatedList,
  PaginationParams,

  // Agents
  Agent,
  AgentStatus,
  CreateAgentParams,
  ListAgentsParams,
  ActivateAgentParams,
  RotateKeyParams,
  AgentVerification,

  // Roles
  Role,
  CreateRoleParams,
  ListRolesParams,
  UpdateRoleParams,
  AgentRoleAssignment,
  AssignRoleParams,

  // Permissions
  PermissionCheckParams,
  PermissionCheckResult,
  BatchCheckItem,
  BatchPermissionCheckParams,
  BatchPermissionCheckResult,
  EffectivePermission,

  // Delegations
  Delegation,
  DelegationStatus,
  CreateDelegationParams,
  DelegationVerification,
  VerifyDelegationParams,
  ListAgentDelegationsParams,

  // Policies
  Policy,
  PolicyEffect,
  CreatePolicyParams,
  ListPoliciesParams,
  UpdatePolicyParams,
  SimulatePolicyParams,
  EvaluatePolicyParams,
  PolicySimulationResult,
  PolicyEvaluationResult,

  // MCP
  McpServer,
  McpTransport,
  RegisterMcpServerParams,
  ListMcpServersParams,
  UpdateMcpServerParams,
  McpTool,
  RegisterMcpToolParams,
  McpProxyRequest,
  McpProxyResponse,

  // Audit
  AuditEvent,
  ListAuditEventsParams,
  GenerateReportParams,
  AuditReport,
  AuditMetricsParams,
  AuditMetrics,

  // Notifications
  Notification,
  ListNotificationsParams,
  UnreadCountParams,
  UnreadCountResult,
  MarkAllReadParams,

  // Webhooks
  Webhook,
  CreateWebhookParams,
  ListWebhooksParams,
  UpdateWebhookParams,

  // Alerts
  Alert,
  CreateAlertParams,
  ListAlertsParams,
  UpdateAlertParams,

  // API Keys
  ApiKey,
  CreateApiKeyParams,
  ListApiKeysParams,

  // Organizations
  Organization,
  CreateOrganizationParams,
  ListOrganizationsParams,

  // Workspaces
  Workspace,
  CreateWorkspaceParams,
  ListWorkspacesParams,
} from './types.js';
