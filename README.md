# @authora/sdk

[![npm version](https://img.shields.io/npm/v/@authora/sdk.svg)](https://www.npmjs.com/package/@authora/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Authorization for AI agents -- identity, permissions, and delegation management.

## Quick Start

```typescript
// npm install @authora/sdk
import { AuthoraClient } from '@authora/sdk';

const authora = new AuthoraClient({ apiKey: 'authora_live_...' });

// Create an agent
const { agent } = await authora.agents.create({
  workspaceId: 'ws_...', name: 'my-agent', createdBy: 'usr_...',
});

// Check a permission
const result = await authora.permissions.check({
  agentId: agent.id, resource: 'files:reports/*', action: 'read',
});
console.log(result.allowed ? 'Access granted' : 'Denied');
```

## Table of Contents

- [Installation](#installation)
- [Getting Credentials](#getting-credentials)
- [Configuration](#configuration)
- [Edge Endpoints](#edge-endpoints)
- [Resources](#resources)
  - [Organizations](#organizations) | [Workspaces](#workspaces) | [Agents](#agents) | [Roles](#roles) | [Permissions](#permissions)
  - [Delegations](#delegations) | [Policies](#policies) | [MCP Servers](#mcp-servers)
  - [Audit](#audit) | [Notifications](#notifications) | [Webhooks](#webhooks) | [Alerts](#alerts)
  - [Approvals](#approvals) | [Credits](#credits) | [User Delegations (RFC 8693)](#user-delegations-rfc-8693) | [API Keys](#api-keys)
- [Error Handling](#error-handling)
- [Agent Runtime](#agent-runtime)
- [Cryptography](#cryptography)
- [MCP Middleware (Server-Side)](#mcp-middleware-server-side)
- [Permission Matching (Client-Side)](#permission-matching-client-side)
- [TypeScript](#typescript)
- [Examples](#examples)

## Installation

```bash
npm install @authora/sdk
# or
pnpm add @authora/sdk
# or
yarn add @authora/sdk
```

## Getting Credentials

**Automatic (IDE agents):** If you use Claude Code, Cursor, or OpenCode, credentials are created automatically on first run via browser sign-in. See [self-onboarding instructions](https://authora.dev/llms-onboard.txt).

**Manual:** Sign up at [authora.dev/get-started](https://authora.dev/get-started), then create an API key in the [dashboard](https://client.authora.dev/agent-setup).

**Environment variables (Docker/CI):** Set `AUTHORA_API_KEY`, `AUTHORA_AGENT_ID`, `AUTHORA_ORG_ID`, `AUTHORA_WORKSPACE_ID`.

## Features

- **Zero runtime dependencies** -- uses native `fetch`
- **Full TypeScript support** with strict types and JSDoc
- **ES modules + CommonJS** dual output
- **Works in Node.js 18+** and modern browsers

## Configuration

| Option    | Type                     | Default                              | Description                      |
| --------- | ------------------------ | ------------------------------------ | -------------------------------- |
| `apiKey`  | `string`                 | (required)                           | API key for Bearer authentication |
| `baseUrl` | `string`                 | `https://api.authora.dev/api/v1`     | Base URL for the API              |
| `timeout` | `number`                 | `30000`                              | Request timeout in milliseconds   |
| `headers` | `Record<string, string>` | `{}`                                 | Custom headers for every request  |

## Edge Endpoints

For high-availability scenarios, Authora provides an edge proxy at `https://edge.authora.dev` powered by Cloudflare Workers. Agent identity verification, JWT validation, and public key lookups are served from globally distributed edge caches with 24-hour survivability if the origin is unreachable. The edge proxy runs in parallel with the primary API -- no client changes required.

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
  status: 'ACTIVE',
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
console.log('Allowed:', effective.permissions);
console.log('Denied:', effective.denyPermissions);
```

### Delegations

```typescript
// Create a delegation
const delegation = await authora.delegations.create({
  workspaceId: 'ws_456',
  issuerAgentId: 'agt_abc',
  targetAgentId: 'agt_def',
  permissions: ['files:read', 'files:list'],
  constraints: {
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    maxDepth: 2,
  },
});

// Get a delegation
const delegation = await authora.delegations.get('del_123');

// Revoke a delegation
const revoked = await authora.delegations.revoke('del_123');

// Verify a delegation is still valid
const verification = await authora.delegations.verify({
  delegationId: 'del_123',
});

// List all delegations (with optional workspace filter)
const { items } = await authora.delegations.list({
  workspaceId: 'ws_456',
  page: 1,
  limit: 20,
});

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
  effect: 'ALLOW',
  principals: { roles: ['data-reader'], agents: [], workspaces: [] },
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

// Attach a policy to an agent
const attachment = await authora.policies.attachToTarget({
  policyId: 'pol_123',
  targetType: 'agent',
  targetId: 'agt_abc',
});

// Attach a policy to an MCP server
await authora.policies.attachToTarget({
  policyId: 'pol_123',
  targetType: 'mcp_server',
  targetId: 'mcp_xyz',
});

// Add permissions to an existing attached policy (avoids creating new policies)
const updated = await authora.policies.addPermission({
  policyId: 'pol_123',
  resources: ['mcp:server1:tool.new_tool'],
  actions: ['execute'],
});

// Remove permissions from a policy
await authora.policies.removePermission({
  policyId: 'pol_123',
  resources: ['mcp:server1:tool.old_tool'],
  actions: ['execute'],
});

// List all policies attached to an agent
const agentPolicies = await authora.policies.listAttachments({
  targetType: 'agent',
  targetId: 'agt_abc',
});

// List all targets a policy is attached to
const targets = await authora.policies.listPolicyTargets('pol_123');

// Detach a policy
await authora.policies.detachFromTarget({
  policyId: 'pol_123',
  targetType: 'agent',
  targetId: 'agt_abc',
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

### Approvals

```typescript
// Create an approval challenge
const challenge = await authora.approvals.create({
  organizationId: 'org_123',
  workspaceId: 'ws_456',
  agentId: 'agt_abc',
  resource: 'production:database',
  action: 'delete',
  challengeType: 'tool_call',
  toolName: 'drop_table',
});

console.log(challenge.status);    // 'PENDING'
console.log(challenge.riskLevel); // 'HIGH'

// Approve or deny
const decided = await authora.approvals.decide(challenge.id, {
  action: 'approve',
  scope: 'once',
  note: 'One-time approval for migration',
  source: 'dashboard',
});

// Get approval stats
const stats = await authora.approvals.stats();
console.log(stats.pending, stats.approvedToday);

// List approval challenges
const { items } = await authora.approvals.list({
  status: 'PENDING',
  page: 1,
  limit: 20,
});

// Escalation rules
const rule = await authora.approvals.createEscalationRule({
  name: 'high-risk-escalation',
  riskLevels: ['HIGH', 'CRITICAL'],
  steps: [{
    delaySeconds: 300,
    notifyUserIds: ['usr_admin1'],
    channels: ['slack_channel', 'dashboard'],
  }],
});

// Approval webhooks
const webhook = await authora.approvals.createWebhook({
  name: 'my-webhook',
  url: 'https://example.com/hooks/approval',
  secret: 'whsec_...',
  eventTypes: ['challenge.created', 'challenge.decided'],
});
```

### Credits

```typescript
// Get credit balance
const balance = await authora.credits.balance();
console.log(balance.balance);
console.log(balance.lifetimePurchased);
console.log(balance.lifetimeConsumed);

// List credit transactions
const { items } = await authora.credits.transactions({
  type: 'consume',
  limit: 20,
});

// Purchase credits
const { url } = await authora.credits.checkout('starter');
// Redirect user to url for payment
```

### User Delegations (RFC 8693)

```typescript
// Issue a token for a user delegation grant
const token = await authora.userDelegations.issueToken('grant_123', {
  agentFullId: 'org_abc/agt_xyz',
  audience: 'mcp-server-123',
  lifetimeSeconds: 3600,
});

console.log(token.token);     // EdDSA JWT
console.log(token.expiresAt); // ISO 8601

// Verify a user delegation token
const verification = await authora.userDelegations.verifyToken(token.token);
console.log(verification.valid);     // true
console.log(verification.scopes);    // ['files:read', 'calendar:read']

// List active grants for a user
const grants = await authora.userDelegations.listByUser('user_123', {
  status: 'ACTIVE',
});

// Revoke a grant
await authora.userDelegations.revoke('grant_123', {
  revokedBy: 'user_123',
  reason: 'No longer needed',
});
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

## Agent Runtime

The `AuthoraAgent` class provides a full agent runtime with Ed25519 signed requests, client-side permission caching, delegation, and MCP tool calls.

```typescript
import { AuthoraClient, AuthoraAgent, generateKeyPair } from '@authora/sdk';

const client = new AuthoraClient({ apiKey: 'authora_live_...' });

// Create + activate an agent (generates keypair, calls create + activate)
const { agent, keyPair } = await client.createAgent({
  workspaceId: 'ws_456',
  name: 'data-processor',
  createdBy: 'admin',
});

// Load the agent runtime
const runtime = client.loadAgent({
  agentId: agent.id,
  privateKey: keyPair.privateKey,
});

// All requests are Ed25519-signed automatically
const profile = await runtime.getProfile();
const doc = await runtime.getIdentityDocument();

// Server-side permission check
const { allowed, reason } = await runtime.checkPermission('files:read', 'read');

// Batch permission check
const results = await runtime.checkPermissions([
  { resource: 'files:read', action: 'read' },
  { resource: 'files:delete', action: 'delete' },
]);

// Client-side cached permission check (deny-first, 5-minute TTL)
if (await runtime.hasPermission('mcp:server1:tool.query')) {
  // MCP tool call through the gateway
  const result = await runtime.callTool({
    mcpServerId: 'mcp_server1',
    toolName: 'query',
    arguments: { sql: 'SELECT 1' },
  });
}

// Delegate permissions to another agent
const delegation = await runtime.delegate({
  targetAgentId: 'agent_...',
  permissions: ['files:read'],
  constraints: {
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    singleUse: true,
  },
});

// Load a delegated agent
const delegated = client.loadDelegatedAgent({
  agentId: 'agent_target',
  privateKey: targetKeyPair.privateKey,
  delegationToken: delegation.id,
});

// Key rotation (generates new keypair, registers with server)
const { agent: updated, keyPair: newKeyPair } = await runtime.rotateKey();

// Lifecycle
await runtime.suspend();
const { agent: reactivated, keyPair: freshKeyPair } = await runtime.reactivate();
await runtime.revoke();
```

### Agent Runtime Methods

| Method | Description |
|--------|-------------|
| `signedFetch(path, options?)` | Core signed HTTP request with Ed25519 headers |
| `checkPermission(resource, action, context?)` | Server-side permission check |
| `checkPermissions(checks[])` | Batch server-side check |
| `fetchPermissions()` | Fetch + cache allow/deny permission lists |
| `hasPermission(resource)` | Client-side cached check (deny-first, 5-min TTL) |
| `invalidatePermissionsCache()` | Clear cached permissions |
| `delegate(params)` | Create a delegation token |
| `callTool(params)` | MCP JSON-RPC proxy call with double-signed request |
| `rotateKey()` | Generate new keypair and register with server |
| `suspend()` | Suspend agent |
| `reactivate()` | Reactivate with new keypair |
| `revoke()` | Permanently revoke agent |
| `getIdentityDocument()` | Get signed identity document (public endpoint) |
| `getProfile()` | Get agent profile (signed request) |
| `getPublicKey()` | Return base64url public key (sync) |

---

## Cryptography

Ed25519 key generation, signing, and verification via `@noble/ed25519` (pure JS, no native dependencies).

```typescript
import { generateKeyPair, sign, verify, buildSignaturePayload, sha256Hash } from '@authora/sdk';

// Generate Ed25519 keypair (base64url encoded)
const { privateKey, publicKey } = generateKeyPair();

// Sign a message
const signature = sign('hello world', privateKey);

// Verify a signature
const valid = verify('hello world', signature, publicKey);

// Build the canonical signature payload for HTTP requests
const payload = buildSignaturePayload('POST', '/api/v1/agents', '2025-01-01T00:00:00.000Z', '{}');

// SHA-256 hash (base64url)
const hash = sha256Hash('request body');
```

---

## MCP Middleware (Server-Side)

Three components for MCP tool servers to verify and authorize agent requests:

### AuthoraMCPGuard (Express Middleware)

```typescript
import { AuthoraMCPGuard, protectTool } from '@authora/sdk';

const guard = new AuthoraMCPGuard({
  resolvePublicKey: async (agentId) => {
    // Fetch agent's public key from your store or Authora API
    return publicKeyBase64url;
  },
  requiredPermissions: ['mcp:myserver:tool.*'],
  onDenied: (agentId, reason) => console.log(`Denied ${agentId}: ${reason}`),
});

// As Express middleware
app.use('/mcp', guard.middleware());

// Or protect individual tool handlers
app.post('/tools/echo', protectTool(guard, async (req, res) => {
  res.json({ result: req.body.params.arguments.message });
}));
```

### AuthoraMCPMiddleware (Handler Wrapping)

```typescript
import { AuthoraMCPMiddleware } from '@authora/sdk';

const middleware = new AuthoraMCPMiddleware({
  resolvePublicKey: async (agentId) => publicKeyBase64url,
});

// Wrap MCP tool handlers
const protectedHandler = middleware.wrapHandler(async (args, context) => {
  // context.agentId, context.verified, context.delegationToken
  return { result: args.message };
});
```

---

## Permission Matching (Client-Side)

```typescript
import { matchPermission, matchAnyPermission } from '@authora/sdk';

matchPermission('agents:*', 'agents:read');          // true
matchPermission('mcp:*:tool.read_*', 'mcp:s1:tool.read_files'); // true
matchPermission('agents:*', 'agents:read:all');      // false (segment count mismatch)

matchAnyPermission(['files:read', 'files:*'], 'files:write'); // true
```

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

## Examples

See the [`examples/`](./examples) directory for runnable code samples including a [quickstart](./examples/quickstart.ts).

## Requirements

- **Node.js 18+** (for native `fetch` support) or any modern browser
- No runtime dependencies

## License

MIT
