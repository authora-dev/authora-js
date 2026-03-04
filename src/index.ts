export { AuthoraClient } from './client.js';
export { AuthoraAgent } from './agent.js';
export { generateKeyPair, getPublicKey, sign, verify, buildSignaturePayload, toBase64Url, fromBase64Url, sha256Hash } from './crypto.js';
export type { KeyPair } from './crypto.js';
export { matchPermission, matchAnyPermission } from './permissions.js';
export { AuthoraMCPGuard, AuthoraMCPMiddleware, protectTool } from './mcp.js';

export {
  AuthoraError,
  AuthenticationError,
  AuthorizationError,
  NetworkError,
  NotFoundError,
  RateLimitError,
  TimeoutError,
} from './errors.js';

export { AgentsResource } from './resources/agents.js';
export { RolesResource } from './resources/roles.js';
export { PermissionsResource } from './resources/permissions.js';
export { DelegationsResource } from './resources/delegations.js';
export { PoliciesResource } from './resources/policies.js';
export { McpResource } from './resources/mcp.js';
export { AuditResource, type AuditStreamOptions } from './resources/audit.js';
export { NotificationsResource } from './resources/notifications.js';
export { WebhooksResource } from './resources/webhooks.js';
export { AlertsResource } from './resources/alerts.js';
export { ApiKeysResource } from './resources/api-keys.js';
export { OrganizationsResource } from './resources/organizations.js';
export { WorkspacesResource } from './resources/workspaces.js';

export type {
  AuthoraClientOptions,
  PaginatedList,
  PaginationParams,
  Agent,
  AgentStatus,
  CreateAgentParams,
  ListAgentsParams,
  ActivateAgentParams,
  RotateKeyParams,
  AgentVerification,
  Role,
  CreateRoleParams,
  ListRolesParams,
  UpdateRoleParams,
  AgentRoleAssignment,
  AssignRoleParams,
  PermissionCheckParams,
  PermissionCheckResult,
  BatchCheckItem,
  BatchPermissionCheckParams,
  BatchPermissionCheckResult,
  EffectivePermissions,
  Delegation,
  DelegationStatus,
  DelegationConstraints,
  CreateDelegationParams,
  DelegationVerification,
  VerifyDelegationParams,
  ListAgentDelegationsParams,
  Policy,
  PolicyEffect,
  PolicyPrincipals,
  CreatePolicyParams,
  ListPoliciesParams,
  UpdatePolicyParams,
  SimulatePolicyParams,
  EvaluatePolicyParams,
  PolicySimulationResult,
  PolicyEvaluationResult,
  McpServer,
  McpTransport,
  RegisterMcpServerParams,
  ListMcpServersParams,
  UpdateMcpServerParams,
  McpTool,
  RegisterMcpToolParams,
  McpProxyRequest,
  McpProxyResponse,
  AuditEvent,
  ListAuditEventsParams,
  GenerateReportParams,
  AuditReport,
  AuditMetricsParams,
  AuditMetrics,
  Notification,
  ListNotificationsParams,
  UnreadCountParams,
  UnreadCountResult,
  MarkAllReadParams,
  Webhook,
  CreateWebhookParams,
  ListWebhooksParams,
  UpdateWebhookParams,
  Alert,
  CreateAlertParams,
  ListAlertsParams,
  UpdateAlertParams,
  ApiKey,
  CreateApiKeyParams,
  ListApiKeysParams,
  Organization,
  CreateOrganizationParams,
  ListOrganizationsParams,
  Workspace,
  CreateWorkspaceParams,
  ListWorkspacesParams,
  AgentOptions,
  SignedRequestOptions,
  SignedResponse,
  AgentDelegateParams,
  McpToolCallParams,
  CreateAgentResult,
  McpAuthoraMetadata,
  McpGuardOptions,
  McpMiddlewareOptions,
  McpToolContext,
} from './types.js';
