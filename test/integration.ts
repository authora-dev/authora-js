/**
 * Authora TypeScript SDK -- Integration Tests
 *
 * Tests all business logic flows against the live API.
 * Run: npx tsx test/integration.ts
 */

import { AuthoraClient } from '../src/index.js';

const API_KEY = 'authora_live_076270f52d3fc0fe9af9d08fe49b2803eb8b64ba5132fc76';
const BASE_URL = 'https://api.authora.dev/api/v1';
const WORKSPACE_ID = 'ws_a7067ccce35d36b5';
const ORG_ID = 'org_92582b4a512e52ff';

const client = new AuthoraClient({ apiKey: API_KEY, baseUrl: BASE_URL });

let passed = 0;
let failed = 0;
const errors: string[] = [];

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${message}`);
  } else {
    failed++;
    errors.push(message);
    console.error(`  [FAIL] ${message}`);
  }
}

async function safeRun(name: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`  [ERROR] ${name}: ${msg}`);
    failed++;
    errors.push(`${name}: ${msg}`);
  }
}

async function testAgentLifecycle() {
  console.log('\n--- Agent Lifecycle ---');

  // Create agent
  const agent = await client.agents.create({
    workspaceId: WORKSPACE_ID,
    name: 'sdk-test-ts-agent',
    createdBy: 'sdk-integration-test',
    description: 'TypeScript SDK integration test agent',
    tags: ['test', 'sdk', 'typescript'],
  });
  assert(!!agent.id, 'Agent created with ID');
  const status = (agent as any).status?.toUpperCase?.() ?? String(agent.status).toUpperCase();
  assert(status === 'PENDING', `Agent status is PENDING (got: ${agent.status})`);
  const agentId = agent.id;

  // Get agent
  const fetched = await client.agents.get(agentId);
  assert(fetched.id === agentId, 'Get agent returns correct ID');

  // List agents
  const list = await client.agents.list({ workspaceId: WORKSPACE_ID, limit: 5 });
  assert(Array.isArray(list.items), 'List agents returns items array');
  assert(typeof list.total === 'number', 'List agents returns total count');

  // Revoke agent (skip suspend since PENDING agents can't be suspended)
  const revoked = await client.agents.revoke(agentId);
  assert(!!revoked, 'Agent revoked');

  return agentId;
}

async function testRBACFlow() {
  console.log('\n--- RBAC Flow ---');

  // Create a new agent for RBAC testing
  const agent = await client.agents.create({
    workspaceId: WORKSPACE_ID,
    name: 'sdk-rbac-test-ts',
    createdBy: 'sdk-integration-test',
  });
  const agentId = agent.id;
  assert(!!agentId, 'Created RBAC test agent');

  // Create role
  const role = await client.roles.create({
    workspaceId: WORKSPACE_ID,
    name: `sdk-test-role-ts-${Date.now()}`,
    description: 'Test role from TS SDK',
    permissions: ['files:*:read', 'mcp:*:tool.*'],
  });
  assert(!!role.id, 'Role created with ID');
  assert(role.permissions.length === 2, `Role has 2 permissions (got: ${role.permissions.length})`);
  const roleId = role.id;

  // List roles
  const roles = await client.roles.list({ workspaceId: WORKSPACE_ID });
  assert(Array.isArray(roles.items), 'List roles returns items array');

  // Update role
  const updated = await client.roles.update(roleId, { description: 'Updated by TS SDK test' });
  assert(!!updated.id, 'Role updated');

  // Assign role to agent
  const assignment = await client.roles.assign(agentId, { roleId, grantedBy: 'sdk-integration-test' });
  assert(!!assignment, 'Role assigned to agent');

  // List agent roles
  const agentRoles = await client.roles.listAgentRoles(agentId);
  assert(Array.isArray(agentRoles.roles), 'Agent roles listed');
  assert(agentRoles.roles.some((r: any) => r.id === roleId), 'Agent has the assigned role');

  // Get effective permissions
  const perms = await client.permissions.getEffective(agentId);
  assert(Array.isArray(perms.permissions), 'Got effective permissions');

  // Check permission
  const check = await client.permissions.check({
    agentId,
    resource: 'files:doc1',
    action: 'read',
  });
  assert(typeof check.allowed === 'boolean', `Permission check returned allowed=${check.allowed}`);

  // Batch check
  const batch = await client.permissions.checkBatch({
    agentId,
    checks: [
      { resource: 'files:doc1', action: 'read' },
      { resource: 'files:doc2', action: 'write' },
    ],
  });
  assert(Array.isArray(batch.results), `Batch check returned ${batch.results?.length} results`);

  // Unassign role
  await client.roles.unassign(agentId, roleId);
  passed++;
  console.log('  [PASS] Role unassigned');

  // Delete role
  await client.roles.delete(roleId);
  passed++;
  console.log('  [PASS] Role deleted');

  // Cleanup: revoke agent
  await client.agents.revoke(agentId);
}

async function testPolicyFlow() {
  console.log('\n--- Policy Flow ---');

  // Create policy -- backend accepts ALLOW/DENY and structured principals
  const policy = await client.policies.create({
    workspaceId: WORKSPACE_ID,
    name: `sdk-test-policy-ts-${Date.now()}`,
    description: 'Test policy from TS SDK',
    effect: 'ALLOW' as any,
    principals: { roles: ['admin'] } as any,
    resources: ['files:*'],
    actions: ['read', 'write'],
    priority: 10,
    enabled: true,
  });
  assert(!!policy.id, 'Policy created');
  const policyId = policy.id;

  // List policies
  const policies = await client.policies.list({ workspaceId: WORKSPACE_ID });
  assert(Array.isArray(policies.items), 'List policies works');

  // Update policy
  const updated = await client.policies.update(policyId, { description: 'Updated by TS SDK', priority: 20 });
  assert(!!updated.id, 'Policy updated');

  // Delete policy
  await client.policies.delete(policyId);
  passed++;
  console.log('  [PASS] Policy deleted');
}

async function testDelegationFlow() {
  console.log('\n--- Delegation Flow ---');

  // Create two agents
  const issuer = await client.agents.create({
    workspaceId: WORKSPACE_ID,
    name: 'sdk-delegation-issuer-ts',
    createdBy: 'sdk-integration-test',
  });
  const target = await client.agents.create({
    workspaceId: WORKSPACE_ID,
    name: 'sdk-delegation-target-ts',
    createdBy: 'sdk-integration-test',
  });
  assert(!!issuer.id && !!target.id, 'Created issuer and target agents');

  // The issuer must have permissions before it can delegate them.
  // Create a role with the permission, then assign it to the issuer.
  const delegRole = await client.roles.create({
    workspaceId: WORKSPACE_ID,
    name: `sdk-deleg-role-ts-${Date.now()}`,
    permissions: ['files:*:read'],
  });
  await client.roles.assign(issuer.id, { roleId: delegRole.id, grantedBy: 'sdk-integration-test' });

  // Create delegation
  const delegation = await client.delegations.create({
    issuerAgentId: issuer.id,
    targetAgentId: target.id,
    permissions: ['files:*:read'],
    constraints: { maxDepth: 3 },
  });
  assert(!!delegation.id, 'Delegation created');
  const delegationId = delegation.id;

  // Get delegation
  const fetched = await client.delegations.get(delegationId);
  assert(fetched.id === delegationId, 'Get delegation works');

  // List all delegations
  const all = await client.delegations.list();
  assert(Array.isArray(all.items), 'List all delegations works');

  // List agent delegations
  const agentDels = await client.delegations.listByAgent(issuer.id);
  assert(Array.isArray(agentDels.items), 'List agent delegations works');

  // Revoke delegation
  const revoked = await client.delegations.revoke(delegationId);
  assert(!!revoked, 'Delegation revoked');

  // Cleanup
  await client.roles.unassign(issuer.id, delegRole.id);
  await client.roles.delete(delegRole.id);
  await client.agents.revoke(issuer.id);
  await client.agents.revoke(target.id);
}

async function testAuditFlow() {
  console.log('\n--- Audit Flow ---');

  // List events
  const events = await client.audit.listEvents({ orgId: ORG_ID, limit: 5 });
  assert(Array.isArray(events.items), `Got ${events.items?.length} audit events`);

  // Get metrics
  const metrics = await client.audit.getMetrics({ orgId: ORG_ID });
  assert(!!metrics, 'Got audit metrics');

  // Generate report
  await safeRun('Compliance report', async () => {
    const report = await client.audit.generateReport({
      orgId: ORG_ID,
      dateFrom: '2025-01-01',
      dateTo: '2025-12-31',
    });
    assert(!!report, 'Generated compliance report');
  });
}

async function testWebhookFlow() {
  console.log('\n--- Webhook Flow ---');

  // Create webhook
  const webhook = await client.webhooks.create({
    organizationId: ORG_ID,
    url: 'https://httpbin.org/post',
    eventTypes: ['agent.created', 'agent.suspended'],
    secret: 'test-secret-1234567890123456',
  });
  assert(!!webhook.id, 'Webhook created');
  const webhookId = webhook.id;

  // List webhooks
  const list = await client.webhooks.list({ organizationId: ORG_ID });
  assert(Array.isArray(list), 'List webhooks works');

  // Update webhook
  const updated = await client.webhooks.update(webhookId, { eventTypes: ['agent.created'] });
  assert(!!updated.id, 'Webhook updated');

  // Delete webhook
  await safeRun('Webhook delete', async () => {
    await client.webhooks.delete(webhookId);
    passed++;
    console.log('  [PASS] Webhook deleted');
  });
}

async function testAlertFlow() {
  console.log('\n--- Alert Flow ---');

  // Create alert
  const alert = await client.alerts.create({
    organizationId: ORG_ID,
    name: `sdk-test-alert-ts-${Date.now()}`,
    eventTypes: ['agent.revoked'],
    conditions: { severity: 'high' },
    channels: ['email'] as any,
  });
  assert(!!alert.id, 'Alert rule created');
  const alertId = alert.id;

  // List alerts
  const list = await client.alerts.list({ organizationId: ORG_ID });
  assert(Array.isArray(list), 'List alerts works');

  // Update alert
  const updated = await client.alerts.update(alertId, { name: 'updated-alert-ts' });
  assert(!!updated.id, 'Alert updated');

  // Delete alert
  await client.alerts.delete(alertId);
  passed++;
  console.log('  [PASS] Alert deleted');
}

async function testApiKeyFlow() {
  console.log('\n--- API Key Flow ---');

  // List API keys
  const keys = await client.apiKeys.list({ organizationId: ORG_ID });
  assert(Array.isArray(keys), 'List API keys works');

  // Create API key
  const key = await client.apiKeys.create({
    organizationId: ORG_ID,
    name: `sdk-test-key-ts-${Date.now()}`,
    createdBy: 'sdk-integration-test',
    scopes: ['agents:read'],
  });
  assert(!!key.id, 'API key created');
  const keyId = key.id;

  // Revoke API key
  await safeRun('API key revoke', async () => {
    await client.apiKeys.revoke(keyId);
    passed++;
    console.log('  [PASS] API key revoked');
  });
}

async function testNotificationFlow() {
  console.log('\n--- Notification Flow ---');

  // List notifications
  const notifs = await client.notifications.list({ organizationId: ORG_ID, limit: 5 });
  assert(Array.isArray(notifs), 'List notifications works');

  // Unread count
  const count = await client.notifications.unreadCount({ organizationId: ORG_ID });
  const unread = (count as any).unreadCount ?? count.count ?? 0;
  assert(typeof unread === 'number', `Unread count: ${unread}`);

  // Mark all read
  await safeRun('Mark all read', async () => {
    await client.notifications.markAllRead({ organizationId: ORG_ID });
    passed++;
    console.log('  [PASS] Mark all read');
  });
}

async function testOrgAndWorkspace() {
  console.log('\n--- Organization & Workspace ---');

  // Get org
  const org = await client.organizations.get(ORG_ID);
  assert(!!org.id, 'Get organization works');

  // List workspaces
  const workspaces = await client.workspaces.list({ organizationId: ORG_ID });
  assert(Array.isArray(workspaces.items), 'List workspaces works');

  // Get workspace
  const ws = await client.workspaces.get(WORKSPACE_ID);
  assert(!!ws.id, 'Get workspace works');
}

async function testAgentSecurityLifecycle() {
  console.log('\n--- Agent Security Lifecycle ---');

  // Create agent
  const agent = await client.agents.create({
    workspaceId: WORKSPACE_ID,
    name: `sdk-security-ts-${Date.now()}`,
    createdBy: 'sdk-integration-test',
    description: 'Agent security lifecycle test',
  });
  assert(!!agent.id, 'Agent created for security lifecycle');
  const agentId = agent.id;

  // Activate with a public key
  const testPubKey = 'test-public-key-ed25519-' + Date.now();
  const activated = await client.agents.activate(agentId, { publicKey: testPubKey });
  const activatedStatus = String(activated.status).toUpperCase();
  assert(activatedStatus === 'ACTIVE', `Agent activated (got: ${activated.status})`);

  // Verify identity (public, no auth required) -- must be after activate
  const verification = await client.agents.verify(agentId);
  assert(!!verification, `Agent verify returned result`);

  // Rotate key (must be ACTIVE)
  const newPubKey = 'rotated-public-key-' + Date.now();
  const rotated = await client.agents.rotateKey(agentId, { publicKey: newPubKey });
  assert(!!rotated, 'Agent key rotated');

  // Suspend
  const suspended = await client.agents.suspend(agentId);
  const suspendedStatus = String(suspended.status).toUpperCase();
  assert(suspendedStatus === 'SUSPENDED', `Agent suspended (got: ${suspended.status})`);

  // Revoke
  const revoked = await client.agents.revoke(agentId);
  assert(!!revoked, 'Agent revoked after security lifecycle');
}

async function testMcpFlow() {
  console.log('\n--- MCP Server & Tool Registration ---');

  // Register an MCP server
  const server = await client.mcp.register({
    workspaceId: WORKSPACE_ID,
    name: `sdk-mcp-server-ts-${Date.now()}`,
    url: 'http://127.0.0.1:9100',
    description: 'Integration test MCP server',
  });
  assert(!!server.id, 'MCP server registered with ID');
  const serverId = server.id;
  assert(server.name.includes('sdk-mcp-server-ts'), `Server name correct (got: ${server.name})`);

  // List MCP servers
  const servers = await client.mcp.listServers({ workspaceId: WORKSPACE_ID });
  assert(Array.isArray(servers.items), 'List MCP servers returns items array');
  assert(servers.items.some((s: any) => s.id === serverId), 'Registered server appears in list');

  // Get MCP server
  const fetched = await client.mcp.getServer(serverId);
  assert(fetched.id === serverId, 'Get MCP server returns correct ID');

  // Update MCP server
  const updated = await client.mcp.updateServer(serverId, {
    description: 'Updated by TS SDK integration test',
  });
  assert(!!updated.id, 'MCP server updated');

  // Register a tool on the server
  const tool = await client.mcp.registerTool(serverId, {
    name: 'echo',
    description: 'Echo tool for testing',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  });
  assert(!!tool.id, 'MCP tool registered with ID');
  assert(tool.name === 'echo', `Tool name is 'echo' (got: ${tool.name})`);

  // List tools
  const tools = await client.mcp.listTools(serverId);
  assert(Array.isArray(tools), 'List tools returns array');
  assert(tools.some((t: any) => t.name === 'echo'), 'Echo tool appears in list');

  // MCP Proxy: need an agent with mcp permissions to call through the pipeline
  const mcpAgent = await client.agents.create({
    workspaceId: WORKSPACE_ID,
    name: `sdk-mcp-proxy-agent-ts-${Date.now()}`,
    createdBy: 'sdk-integration-test',
  });
  const mcpRole = await client.roles.create({
    workspaceId: WORKSPACE_ID,
    name: `sdk-mcp-proxy-role-ts-${Date.now()}`,
    permissions: [`mcp:${serverId}:tool.*`],
  });
  await client.roles.assign(mcpAgent.id, { roleId: mcpRole.id, grantedBy: 'sdk-integration-test' });

  const proxyResult = await client.mcp.proxy({
    jsonrpc: '2.0',
    method: 'tools/call',
    id: 1,
    params: {
      name: 'echo',
      arguments: { message: 'hello-from-ts-sdk' },
      _authora: {
        mcpServerId: serverId,
        agentId: mcpAgent.id,
        timestamp: new Date().toISOString(),
      },
    },
  });
  assert(!!proxyResult, 'MCP proxy returned a result');
  // The proxy response wraps the JSON-RPC result
  const proxyContent = (proxyResult as any)?.result?.content?.[0]?.text
    ?? (proxyResult as any)?.result?.text
    ?? JSON.stringify(proxyResult);
  assert(proxyContent.includes('hello-from-ts-sdk'), `Proxy echo returned message (got: ${proxyContent})`);

  // Cleanup proxy agent/role
  await client.roles.unassign(mcpAgent.id, mcpRole.id);
  await client.roles.delete(mcpRole.id);
  await client.agents.revoke(mcpAgent.id);
}

async function testPolicySimulateEvaluate() {
  console.log('\n--- Policy Simulate & Evaluate ---');

  // Create an agent with a role for policy testing
  const agent = await client.agents.create({
    workspaceId: WORKSPACE_ID,
    name: `sdk-policy-eval-ts-${Date.now()}`,
    createdBy: 'sdk-integration-test',
  });
  const agentId = agent.id;

  const role = await client.roles.create({
    workspaceId: WORKSPACE_ID,
    name: `sdk-policy-eval-role-ts-${Date.now()}`,
    permissions: ['docs:*:read'],
  });
  await client.roles.assign(agentId, { roleId: role.id, grantedBy: 'sdk-integration-test' });

  // Create a DENY policy for a specific resource
  const denyPolicy = await client.policies.create({
    workspaceId: WORKSPACE_ID,
    name: `sdk-deny-policy-ts-${Date.now()}`,
    effect: 'DENY' as any,
    principals: { roles: [role.name] } as any,
    resources: ['docs:secret'],
    actions: ['read'],
    priority: 100,
    enabled: true,
  });
  assert(!!denyPolicy.id, 'DENY policy created');

  // Simulate: agent tries to read docs:secret (should be denied by policy)
  const simResult = await client.policies.simulate({
    workspaceId: WORKSPACE_ID,
    agentId,
    resource: 'docs:secret',
    action: 'read',
  });
  assert(!!simResult, 'Policy simulation returned a result');

  // Evaluate: live evaluation
  const evalResult = await client.policies.evaluate({
    workspaceId: WORKSPACE_ID,
    agentId,
    resource: 'docs:secret',
    action: 'read',
  });
  assert(!!evalResult, 'Policy evaluation returned a result');

  // Cleanup
  await client.policies.delete(denyPolicy.id);
  await client.roles.unassign(agentId, role.id);
  await client.roles.delete(role.id);
  await client.agents.revoke(agentId);
  passed++;
  console.log('  [PASS] Policy simulate/evaluate cleanup');
}

async function main() {
  console.log('=== Authora TypeScript SDK Integration Tests ===');
  console.log(`API: ${BASE_URL}`);
  console.log(`Workspace: ${WORKSPACE_ID}`);
  console.log(`Org: ${ORG_ID}`);

  await safeRun('Agent Lifecycle', async () => { await testAgentLifecycle(); });
  await safeRun('Agent Security Lifecycle', testAgentSecurityLifecycle);
  await safeRun('RBAC Flow', testRBACFlow);
  await safeRun('Policy Flow', testPolicyFlow);
  await safeRun('Policy Simulate & Evaluate', testPolicySimulateEvaluate);
  await safeRun('Delegation Flow', testDelegationFlow);
  await safeRun('MCP Flow', testMcpFlow);
  await safeRun('Audit Flow', testAuditFlow);
  await safeRun('Webhook Flow', testWebhookFlow);
  await safeRun('Alert Flow', testAlertFlow);
  await safeRun('API Key Flow', testApiKeyFlow);
  await safeRun('Notification Flow', testNotificationFlow);
  await safeRun('Org & Workspace', testOrgAndWorkspace);

  console.log(`\n=== Results ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  if (errors.length > 0) {
    console.log(`\nFailed tests:`);
    errors.forEach((e) => console.log(`  - ${e}`));
  }
  process.exit(failed > 0 ? 1 : 0);
}

main();
