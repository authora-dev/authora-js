# @authora/sdk

Official TypeScript/JavaScript SDK for the [Authora](https://authora.dev) platform -- agent identity, authorization, and delegation management for AI systems.

- **Zero runtime dependencies** -- uses native `fetch`
- **Full TypeScript support** with strict types and JSDoc
- **ES modules + CommonJS** dual output
- **Works in Node.js 18+** and modern browsers

## Installation

```bash
npm install @authora/sdk
# or
pnpm add @authora/sdk
# or
yarn add @authora/sdk
```

## Quick Start

```typescript
import { AuthoraClient } from '@authora/sdk';

const authora = new AuthoraClient({
  apiKey: 'authora_live_...',
  // baseUrl: 'https://api.authora.dev/api/v1',  // default
  // timeout: 30000,                               // default (ms)
});
```

## Configuration

| Option    | Type                     | Default                              | Description                      |
| --------- | ------------------------ | ------------------------------------ | -------------------------------- |
| `apiKey`  | `string`                 | (required)                           | API key for Bearer authentication |
| `baseUrl` | `string`                 | `https://api.authora.dev/api/v1`     | Base URL for the API              |
| `timeout` | `number`                 | `30000`                              | Request timeout in milliseconds   |
| `headers` | `Record<string, string>` | `{}`                                 | Custom headers for every request  |

---

## Resources

### Organizations

```typescript
// Create an organization
const org = await authora.organizations.create({
  name: 'Acme Corp',
  slug: 'acme-corp',
});

// Get an organization
const org = await authora.organizations.get('org_123');

// List organizations
const { items, total } = await authora.organizations.list({ page: 1, limit: 20 });
```

### Workspaces

```typescript
// Create a workspace
const ws = await authora.workspaces.create({
  organizationId: 'org_123',
  name: 'Production',
  slug: 'production',
});

// Get a workspace
const ws = await authora.workspaces.get('ws_456');

// List workspaces in an organization
const { items } = await authora.workspaces.list({
  organizationId: 'org_123',
  page: 1,
  limit: 50,
});
```

### Agents

```typescript
// Create an agent
const agent = await authora.agents.create({
  workspaceId: 'ws_456',
  name: 'data-processor',
  description: 'Processes incoming data files',
  createdBy: 'user_789',
  tags: ['etl', 'production'],
  framework: 'langchain',
  modelProvider: 'openai',
  modelId: 'gpt-4',
});

// List agents with filters
const { items, total } = await authora.agents.list({
  workspaceId: 'ws_456',
  status: 'active',
  page: 1,
  limit: 25,
});

// Get a single agent
const agent = await authora.agents.get('agt_abc');

// Verify agent identity (public, no auth required)
const verification = await authora.agents.verify('agt_abc');
if (verification.valid) {
  console.log('Agent is valid');
}

// Activate a pending agent
const activated = await authora.agents.activate('agt_abc', {
  publicKey: 'ssh-ed25519 AAAA...',
});

// Suspend an agent
const suspended = await authora.agents.suspend('agt_abc');

// Revoke an agent permanently
const revoked = await authora.agents.revoke('agt_abc');

// Rotate an agent's key
const rotated = await authora.agents.rotateKey('agt_abc', {
  publicKey: 'ssh-ed25519 BBBB...',
});
```

### Roles

```typescript
// Create a role
const role = await authora.roles.create({
  workspaceId: 'ws_456',
  name: 'data-reader',
  description: 'Read-only access to data resources',
  permissions: ['data:read', 'metadata:read'],
  denyPermissions: ['data:delete'],
  stage: 'production',
  maxSessionDuration: 3600,
});

// List roles
const { items } = await authora.roles.list({ workspaceId: 'ws_456' });

// Get a role
const role = await authora.roles.get('role_123');

// Update a role
const updated = await authora.roles.update('role_123', {
  permissions: ['data:read', 'data:write', 'metadata:read'],
});

// Delete a role
await authora.roles.delete('role_123');

// Assign a role to an agent
const assignment = await authora.roles.assign('agt_abc', {
  roleId: 'role_123',
  grantedBy: 'user_789',
  expiresAt: '2025-12-31T23:59:59Z',
});

// Remove a role from an agent
await authora.roles.unassign('agt_abc', 'role_123');

// List roles assigned to an agent
const assignments = await authora.roles.listAgentRoles('agt_abc');
```

### Permissions

```typescript
// Check a single permission
const result = await authora.permissions.check({
  agentId: 'agt_abc',
  resource: 'files:reports/*',
  action: 'read',
  context: { environment: 'production' },
});

if (result.allowed) {
  console.log('Access granted');
}

// Batch check multiple permissions
const batch = await authora.permissions.checkBatch({
  agentId: 'agt_abc',
  checks: [
    { resource: 'files:reports/*', action: 'read' },
    { resource: 'files:reports/*', action: 'write' },
    { resource: 'config:*', action: 'admin' },
  ],
});

batch.results.forEach((r, i) => {
  console.log(`Check ${i}: ${r.allowed ? 'allowed' : 'denied'}`);
});

// Get effective permissions for an agent
const effective = await authora.permissions.getEffective('agt_abc');
effective.forEach((p) => {
  console.log(`${p.resource}: ${p.actions.join(', ')} (from ${p.source})`);
});
```

### Delegations

```typescript
// Create a delegation
const delegation = await authora.delegations.create({
  issuerAgentId: 'agt_abc',
  targetAgentId: 'agt_def',
  permissions: ['files:read', 'files:list'],
  constraints: { maxDuration: 3600, scope: 'workspace' },
});

// Get a delegation
const delegation = await authora.delegations.get('del_123');

// Revoke a delegation
const revoked = await authora.delegations.revoke('del_123');

// Verify a delegation is still valid
const verification = await authora.delegations.verify({
  delegationId: 'del_123',
});

// List all delegations
const { items } = await authora.delegations.list();

// List delegations for a specific agent
const agentDelegations = await authora.delegations.listByAgent('agt_abc', {
  direction: 'issued',
  page: 1,
  limit: 50,
});
```

### Policies

```typescript
// Create a policy
const policy = await authora.policies.create({
  workspaceId: 'ws_456',
  name: 'allow-data-read',
  description: 'Allow all agents to read data resources',
  effect: 'allow',
  principals: ['agent:*'],
  resources: ['data:*'],
  actions: ['read', 'list'],
  conditions: { environment: { equals: 'production' } },
  priority: 10,
  enabled: true,
});

// List policies
const { items } = await authora.policies.list({ workspaceId: 'ws_456' });

// Update a policy
const updated = await authora.policies.update('pol_123', {
  enabled: false,
});

// Delete a policy
await authora.policies.delete('pol_123');

// Simulate a policy evaluation (dry-run)
const simulation = await authora.policies.simulate({
  workspaceId: 'ws_456',
  agentId: 'agt_abc',
  resource: 'data:users',
  action: 'read',
});

console.log(`Would be ${simulation.allowed ? 'allowed' : 'denied'}`);
console.log('Matched policies:', simulation.matchedPolicies);

// Evaluate policies (live)
const evaluation = await authora.policies.evaluate({
  workspaceId: 'ws_456',
  agentId: 'agt_abc',
  resource: 'data:users',
  action: 'write',
});
```

### MCP Servers

```typescript
// Register an MCP server
const server = await authora.mcp.register({
  workspaceId: 'ws_456',
  name: 'code-tools',
  description: 'Code analysis and generation tools',
  url: 'https://mcp.example.com',
  transport: 'sse',
  version: '1.0.0',
  connectionTimeout: 5000,
  maxRetries: 3,
});

// List MCP servers
const { items } = await authora.mcp.listServers({ workspaceId: 'ws_456' });

// Get a server
const server = await authora.mcp.getServer('srv_123');

// Update a server
const updated = await authora.mcp.updateServer('srv_123', {
  connectionTimeout: 10000,
});

// List tools on a server
const tools = await authora.mcp.listTools('srv_123');

// Register a tool
const tool = await authora.mcp.registerTool('srv_123', {
  name: 'analyze-code',
  description: 'Analyzes code for quality issues',
  inputSchema: {
    type: 'object',
    properties: {
      code: { type: 'string' },
      language: { type: 'string' },
    },
    required: ['code'],
  },
});

// Proxy a JSON-RPC request to an MCP server
const response = await authora.mcp.proxy({
  jsonrpc: '2.0',
  method: 'tools/call',
  params: { name: 'analyze-code', arguments: { code: 'const x = 1;' } },
  id: 1,
});
```

### Audit

```typescript
// List audit events with filters
const { items, total } = await authora.audit.listEvents({
  workspaceId: 'ws_456',
  agentId: 'agt_abc',
  type: 'permission.check',
  dateFrom: '2025-01-01T00:00:00Z',
  dateTo: '2025-01-31T23:59:59Z',
  result: 'allowed',
  page: 1,
  limit: 100,
});

// Get a single event
const event = await authora.audit.getEvent('evt_123');

// Generate an audit report
const report = await authora.audit.generateReport({
  orgId: 'org_123',
  dateFrom: '2025-01-01',
  dateTo: '2025-01-31',
});

// Get audit metrics
const metrics = await authora.audit.getMetrics({
  orgId: 'org_123',
  workspaceId: 'ws_456',
  dateFrom: '2025-01-01',
  dateTo: '2025-01-31',
});

console.log('Total events:', metrics.totalEvents);
console.log('By type:', metrics.eventsByType);
```

### Notifications

```typescript
// List notifications
const notifications = await authora.notifications.list({
  organizationId: 'org_123',
  userId: 'user_789',
  unreadOnly: true,
  limit: 20,
});

// Get unread count
const { count } = await authora.notifications.unreadCount({
  organizationId: 'org_123',
  userId: 'user_789',
});

// Mark a single notification as read
const notification = await authora.notifications.markRead('notif_123');

// Mark all notifications as read
await authora.notifications.markAllRead({
  organizationId: 'org_123',
  userId: 'user_789',
});
```

### Webhooks

```typescript
// Create a webhook
const webhook = await authora.webhooks.create({
  organizationId: 'org_123',
  url: 'https://example.com/hooks/authora',
  eventTypes: ['agent.created', 'agent.suspended', 'permission.denied'],
  secret: 'whsec_...',
});

// List webhooks
const webhooks = await authora.webhooks.list({ organizationId: 'org_123' });

// Update a webhook
const updated = await authora.webhooks.update('wh_123', {
  eventTypes: ['agent.created', 'agent.suspended'],
  enabled: false,
});

// Delete a webhook
await authora.webhooks.delete('wh_123');
```

### Alerts

```typescript
// Create an alert
const alert = await authora.alerts.create({
  organizationId: 'org_123',
  name: 'high-denial-rate',
  eventTypes: ['permission.denied'],
  conditions: { threshold: 100, windowMinutes: 5 },
  channels: [
    { type: 'email', address: 'security@example.com' },
    { type: 'slack', webhookUrl: 'https://hooks.slack.com/...' },
  ],
});

// List alerts
const alerts = await authora.alerts.list({ organizationId: 'org_123' });

// Update an alert
const updated = await authora.alerts.update('alert_123', {
  conditions: { threshold: 50, windowMinutes: 10 },
});

// Delete an alert
await authora.alerts.delete('alert_123');
```

### API Keys

```typescript
// Create an API key
const apiKey = await authora.apiKeys.create({
  organizationId: 'org_123',
  name: 'ci-pipeline',
  scopes: ['agents:read', 'agents:write', 'permissions:check'],
  createdBy: 'user_789',
  expiresInDays: 90,
});

// The full key is only available at creation time
console.log('Key:', apiKey.key);

// List API keys
const keys = await authora.apiKeys.list({ organizationId: 'org_123' });

// Revoke an API key
await authora.apiKeys.revoke('key_123');
```

---

## Error Handling

All API errors are thrown as typed exceptions that extend `AuthoraError`:

```typescript
import {
  AuthoraClient,
  AuthoraError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  NetworkError,
  TimeoutError,
} from '@authora/sdk';

const authora = new AuthoraClient({ apiKey: 'authora_live_...' });

try {
  await authora.agents.get('agt_nonexistent');
} catch (err) {
  if (err instanceof NotFoundError) {
    console.error('Agent not found:', err.message);
  } else if (err instanceof AuthenticationError) {
    console.error('Bad API key:', err.message);
  } else if (err instanceof AuthorizationError) {
    console.error('Insufficient permissions:', err.message);
  } else if (err instanceof RateLimitError) {
    console.error('Rate limited. Retry after:', err.retryAfter, 'seconds');
  } else if (err instanceof TimeoutError) {
    console.error('Request timed out');
  } else if (err instanceof NetworkError) {
    console.error('Network issue:', err.message);
  } else if (err instanceof AuthoraError) {
    console.error(`API error ${err.statusCode}: ${err.message}`);
    console.error('Code:', err.code);
    console.error('Details:', err.details);
  }
}
```

### Error Classes

| Class                 | HTTP Status | Description                          |
| --------------------- | ----------- | ------------------------------------ |
| `AuthoraError`        | any         | Base class for all API errors         |
| `AuthenticationError` | 401         | Invalid or missing API key            |
| `AuthorizationError`  | 403         | Insufficient permissions              |
| `NotFoundError`       | 404         | Requested resource does not exist     |
| `RateLimitError`      | 429         | Too many requests; includes retryAfter |
| `TimeoutError`        | 408         | Request exceeded the timeout          |
| `NetworkError`        | 0           | Network/connectivity failure          |

---

## TypeScript

All types are exported from the package root:

```typescript
import type {
  Agent,
  AgentStatus,
  Role,
  Policy,
  PolicyEffect,
  Delegation,
  PermissionCheckResult,
  PaginatedList,
} from '@authora/sdk';
```

---

## Requirements

- **Node.js 18+** (for native `fetch` support) or any modern browser
- No runtime dependencies

## License

MIT
