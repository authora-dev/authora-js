import {
  AuthoraClient,
  AuthoraAgent,
  generateKeyPair,
  getPublicKey,
  sign,
  verify,
  buildSignaturePayload,
  sha256Hash,
  toBase64Url,
  fromBase64Url,
  matchPermission,
  matchAnyPermission,
  AuthoraError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  TimeoutError,
  NetworkError,
} from '../src/index.js';

const API_KEY = 'authora_live_076270f52d3fc0fe9af9d08fe49b2803eb8b64ba5132fc76';
const BASE_URL = 'https://api.authora.dev/api/v1';
const WORKSPACE_ID = 'ws_a7067ccce35d36b5';
const ORG_ID = 'org_92582b4a512e52ff';

const client = new AuthoraClient({
  apiKey: API_KEY,
  baseUrl: BASE_URL,
  headers: {
    'x-authora-org-id': ORG_ID,
    'x-authora-workspace-id': WORKSPACE_ID,
  },
});

let passed = 0;
let failed = 0;
const errors: string[] = [];
const suffix = Date.now().toString(36);
let requestCount = 0;

function assert(condition: boolean, msg: string) {
  if (condition) { passed++; console.log(`  [PASS] ${msg}`); }
  else { failed++; errors.push(msg); console.error(`  [FAIL] ${msg}`); }
}

async function expectThrow(fn: () => Promise<unknown>, msg: string): Promise<boolean> {
  try { await fn(); failed++; errors.push(msg); console.error(`  [FAIL] ${msg} (no error thrown)`); return false; }
  catch { passed++; console.log(`  [PASS] ${msg}`); return true; }
}

async function safeRun(name: string, fn: () => Promise<void>) {
  try { await fn(); }
  catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`  [ERROR] ${name}: ${msg}`);
    failed++;
    errors.push(`${name}: ${msg}`);
  }
}

async function throttle() {
  requestCount++;
  if (requestCount % 50 === 0) {
    console.log(`    [throttle: ${requestCount} requests, pausing 62s for rate limit]`);
    await new Promise(r => setTimeout(r, 62000));
  }
}

async function run() {
  console.log('\n====================================================================');
  console.log('  AUTHORA TYPESCRIPT SDK -- COMPREHENSIVE TEST');
  console.log('  Target: PRODUCTION (api.authora.dev)');
  console.log(`  Suffix: ${suffix}`);
  console.log('====================================================================\n');

  // ================================================================
  // SECTION 1: CRYPTO PRIMITIVES
  // ================================================================
  console.log('-- 1. CRYPTO PRIMITIVES --');

  const kp1 = generateKeyPair();
  const kp2 = generateKeyPair();
  assert(kp1.privateKey.length > 0, 'keygen: private key non-empty');
  assert(kp1.publicKey.length > 0, 'keygen: public key non-empty');
  assert(kp1.privateKey !== kp2.privateKey, 'keygen: two keypairs are unique');
  assert(kp1.publicKey !== kp2.publicKey, 'keygen: public keys are unique');

  const derivedPub = getPublicKey(kp1.privateKey);
  assert(derivedPub === kp1.publicKey, 'getPublicKey: derives correct public key from private');

  const payload = buildSignaturePayload('POST', '/api/v1/test', '2025-01-01T00:00:00Z', '{"hello":"world"}');
  assert(payload.startsWith('POST\n'), 'payload: starts with method');
  assert(payload.includes('/api/v1/test\n'), 'payload: includes path');
  assert(payload.includes('2025-01-01T00:00:00Z\n'), 'payload: includes timestamp');

  const sig1 = sign(payload, kp1.privateKey);
  assert(sig1.length > 0, 'sign: signature produced');
  assert(verify(payload, sig1, kp1.publicKey), 'verify: valid signature verifies');
  assert(!verify(payload, sig1, kp2.publicKey), 'verify: wrong key rejects');
  assert(!verify('tampered-payload', sig1, kp1.publicKey), 'verify: tampered payload rejects');

  const emptyPayload = buildSignaturePayload('GET', '/test', '2025-01-01T00:00:00Z', null);
  const sigEmpty = sign(emptyPayload, kp1.privateKey);
  assert(verify(emptyPayload, sigEmpty, kp1.publicKey), 'verify: empty body payload verifies');

  const hash = sha256Hash('hello world');
  assert(hash.length > 0, 'sha256Hash: produces hash');
  assert(sha256Hash('hello world') === hash, 'sha256Hash: deterministic');
  assert(sha256Hash('hello world!') !== hash, 'sha256Hash: different input different hash');

  const encoded = toBase64Url(new Uint8Array([1, 2, 3, 255]));
  assert(encoded.length > 0, 'toBase64Url: encodes bytes');
  const decoded = fromBase64Url(encoded);
  assert(decoded.length === 4, 'fromBase64Url: round-trips length');
  assert(decoded[0] === 1 && decoded[3] === 255, 'fromBase64Url: round-trips values');

  // ================================================================
  // SECTION 2: PERMISSION MATCHING ENGINE
  // ================================================================
  console.log('\n-- 2. PERMISSION MATCHING --');

  assert(matchPermission('*:*:*', 'mcp:server1:tool.read'), 'match: triple wildcard');
  assert(matchPermission('mcp:*:tool.*', 'mcp:server1:tool.read'), 'match: segment wildcards');
  assert(!matchPermission('mcp:*:tool.*', 'api:server1:tool.read'), 'match: first segment mismatch');
  assert(!matchPermission('a:b', 'a:b:c'), 'match: fewer segments reject');
  assert(!matchPermission('a:b:c:d', 'a:b:c'), 'match: more segments reject');
  assert(matchPermission('api:*:read', 'api:users:read'), 'match: wildcard middle');
  assert(!matchPermission('api:*:write', 'api:users:read'), 'match: action mismatch');
  assert(matchPermission('files:*', 'files:doc.txt'), 'match: two-segment wildcard');
  assert(matchPermission('*', 'anything'), 'match: single wildcard matches single segment');

  assert(matchAnyPermission(['mcp:*:tool.*', 'api:*:read'], 'mcp:srv:tool.exec'), 'matchAny: first matches');
  assert(matchAnyPermission(['mcp:*:tool.*', 'api:*:read'], 'api:data:read'), 'matchAny: second matches');
  assert(!matchAnyPermission(['mcp:*:tool.*'], 'api:data:read'), 'matchAny: none match');
  assert(!matchAnyPermission([], 'anything'), 'matchAny: empty array returns false');

  // ================================================================
  // SECTION 3: ERROR CLASS HIERARCHY
  // ================================================================
  console.log('\n-- 3. ERROR CLASSES --');

  const baseErr = new AuthoraError('test', 400, 'TEST_CODE');
  assert(baseErr instanceof Error, 'AuthoraError: instanceof Error');
  assert(baseErr instanceof AuthoraError, 'AuthoraError: instanceof AuthoraError');
  assert(baseErr.statusCode === 400, 'AuthoraError: statusCode');
  assert(baseErr.code === 'TEST_CODE', 'AuthoraError: code');

  const authErr = new AuthenticationError('unauth');
  assert(authErr instanceof AuthoraError, 'AuthenticationError: instanceof AuthoraError');
  assert(authErr.statusCode === 401, 'AuthenticationError: statusCode 401');

  const authzErr = new AuthorizationError('forbidden');
  assert(authzErr.statusCode === 403, 'AuthorizationError: statusCode 403');

  const nfErr = new NotFoundError('not found');
  assert(nfErr.statusCode === 404, 'NotFoundError: statusCode 404');

  const rlErr = new RateLimitError('rate limited', 30);
  assert(rlErr.statusCode === 429, 'RateLimitError: statusCode 429');
  assert(rlErr.retryAfter === 30, 'RateLimitError: retryAfter');

  const toErr = new TimeoutError('timeout');
  assert(toErr.statusCode === 408, 'TimeoutError: statusCode 408');

  const netErr = new NetworkError('network');
  assert(netErr.statusCode === 0, 'NetworkError: statusCode 0');

  // ================================================================
  // SECTION 4: CLIENT INSTANTIATION
  // ================================================================
  console.log('\n-- 4. CLIENT INSTANTIATION --');

  assert(client.agents !== undefined, 'client.agents exists');
  assert(client.roles !== undefined, 'client.roles exists');
  assert(client.permissions !== undefined, 'client.permissions exists');
  assert(client.delegations !== undefined, 'client.delegations exists');
  assert(client.policies !== undefined, 'client.policies exists');
  assert(client.mcp !== undefined, 'client.mcp exists');
  assert(client.audit !== undefined, 'client.audit exists');
  assert(client.notifications !== undefined, 'client.notifications exists');
  assert(client.webhooks !== undefined, 'client.webhooks exists');
  assert(client.alerts !== undefined, 'client.alerts exists');
  assert(client.apiKeys !== undefined, 'client.apiKeys exists');
  assert(client.organizations !== undefined, 'client.organizations exists');
  assert(client.workspaces !== undefined, 'client.workspaces exists');
  assert(client.approvals !== undefined, 'client.approvals exists');
  assert(client.credits !== undefined, 'client.credits exists');
  assert(client.userDelegations !== undefined, 'client.userDelegations exists');

  let throwOnNoKey = false;
  try { new AuthoraClient({ apiKey: '' }); } catch { throwOnNoKey = true; }
  assert(throwOnNoKey, 'client: throws on empty apiKey');

  // ================================================================
  // SECTION 5: ORGANIZATIONS
  // ================================================================
  console.log('\n-- 5. ORGANIZATIONS --');
  await throttle();

  const orgs = await client.organizations.list();
  assert(Array.isArray(orgs.items), 'orgs.list: returns items');
  assert(orgs.items.length >= 1, 'orgs.list: at least one org');
  await throttle();

  const org = await client.organizations.get(ORG_ID);
  assert(org.id === ORG_ID, 'orgs.get: correct id');
  assert(typeof org.name === 'string', 'orgs.get: has name');
  await throttle();

  // ================================================================
  // SECTION 6: WORKSPACES (CRUD)
  // ================================================================
  console.log('\n-- 6. WORKSPACES --');

  const wsSlug = `test-ws-${suffix}`;
  const newWs = await client.workspaces.create({
    organizationId: ORG_ID,
    name: `Test Workspace ${suffix}`,
    slug: wsSlug,
  });
  assert(!!newWs.id, 'ws.create: returns id');
  assert(newWs.name === `Test Workspace ${suffix}`, 'ws.create: correct name');
  await throttle();

  const wsList = await client.workspaces.list({ organizationId: ORG_ID });
  assert(Array.isArray(wsList.items), 'ws.list: returns items');
  assert(wsList.items.some((w: any) => w.id === newWs.id), 'ws.list: new workspace in list');
  await throttle();

  const wsGet = await client.workspaces.get(newWs.id);
  assert(wsGet.id === newWs.id, 'ws.get: correct id');
  await throttle();

  const wsStats = await client.workspaces.getStats(WORKSPACE_ID);
  assert(wsStats !== undefined, 'ws.getStats: returns stats');
  await throttle();

  const wsUpdated = await client.workspaces.update(newWs.id, { name: `Updated WS ${suffix}` });
  assert(wsUpdated.id === newWs.id, 'ws.update: returns correct id');
  await throttle();

  await client.workspaces.delete(newWs.id);
  passed++;
  console.log('  [PASS] ws.delete: workspace deleted');
  await throttle();

  await safeRun('ws.restore', async () => {
    const restored = await client.workspaces.restore(newWs.id);
    assert(!!restored, 'ws.restore: workspace restored');
    await client.workspaces.delete(newWs.id);
  });
  await throttle();

  // ================================================================
  // SECTION 7: AGENT LIFECYCLE + RUNTIME
  // ================================================================
  console.log('\n-- 7. AGENT LIFECYCLE --');

  const agentResult = await client.createAgent({
    workspaceId: WORKSPACE_ID,
    name: `comp-agent-a-${suffix}`,
    createdBy: 'comprehensive-test',
    tags: ['test', 'comprehensive'],
    framework: 'custom',
  });
  assert(agentResult.agent.id.startsWith('agt_'), 'createAgent: agt_ prefix');
  assert(agentResult.agent.status.toLowerCase() === 'active', 'createAgent: status active');
  assert(agentResult.agent.publicKey !== undefined, 'createAgent: public key set');
  assert(agentResult.keyPair.privateKey.length > 0, 'createAgent: keypair returned');
  await throttle();

  const runtimeA = client.loadAgent({
    agentId: agentResult.agent.id,
    privateKey: agentResult.keyPair.privateKey,
    workspaceId: WORKSPACE_ID,
  });
  assert(runtimeA.agentId === agentResult.agent.id, 'loadAgent: correct id');
  assert(runtimeA.getPublicKey() === agentResult.keyPair.publicKey, 'loadAgent: correct pubkey');

  const profileA = await runtimeA.getProfile();
  assert(profileA.id === agentResult.agent.id, 'getProfile: correct id');
  assert(profileA.status.toLowerCase() === 'active', 'getProfile: active');
  await throttle();

  const identityA = await runtimeA.getIdentityDocument();
  assert(identityA !== null && identityA !== undefined, 'identityDoc: returned');
  await throttle();

  // Wrong key rejection
  const wrongKp = generateKeyPair();
  const badAgent = client.loadAgent({
    agentId: agentResult.agent.id,
    privateKey: wrongKp.privateKey,
  });
  await expectThrow(() => badAgent.getProfile(), 'wrongKey: rejected');
  await throttle();

  // List/Get/Update agents
  const agentList = await client.agents.list({ workspaceId: WORKSPACE_ID, limit: 5 });
  assert(Array.isArray(agentList.items), 'agents.list: returns items');
  assert(typeof agentList.total === 'number', 'agents.list: returns total');
  await throttle();

  const agentGet = await client.agents.get(agentResult.agent.id);
  assert(agentGet.id === agentResult.agent.id, 'agents.get: correct id');
  await throttle();

  const agentUpdated = await client.agents.update(agentResult.agent.id, { description: 'updated by test' });
  assert(agentUpdated.id === agentResult.agent.id, 'agents.update: correct id');
  await throttle();

  // Verify agent (public endpoint)
  const verified = await client.verifyAgent(agentResult.agent.id);
  assert(verified !== null, 'verifyAgent: returns result');
  await throttle();

  // ================================================================
  // SECTION 8: RBAC - ROLES, ASSIGNMENT, PERMISSIONS
  // ================================================================
  console.log('\n-- 8. RBAC --');

  const roleA = await client.roles.create({
    workspaceId: WORKSPACE_ID,
    name: `comp-role-a-${suffix}`,
    permissions: ['mcp:*:tool.*', 'api:data:read', 'files:*:read'],
    denyPermissions: ['api:secret:*'],
  });
  assert(roleA.id.startsWith('role_'), 'role.create: role_ prefix');
  assert(roleA.permissions.length === 3, 'role.create: 3 permissions');
  await throttle();

  const roleList = await client.roles.list({ workspaceId: WORKSPACE_ID });
  assert(Array.isArray(roleList.items), 'roles.list: returns items');
  await throttle();

  const roleGet = await client.roles.get(roleA.id);
  assert(roleGet.id === roleA.id, 'roles.get: correct id');
  await throttle();

  const roleUpdated = await client.roles.update(roleA.id, { description: 'updated by test' });
  assert(roleUpdated.id === roleA.id, 'roles.update: correct id');
  await throttle();

  await client.roles.assign(agentResult.agent.id, { roleId: roleA.id, grantedBy: 'comprehensive-test' });
  passed++;
  console.log('  [PASS] roles.assign: role assigned');
  await throttle();

  const agentRoles = await client.roles.listAgentRoles(agentResult.agent.id);
  assert(Array.isArray(agentRoles.roles), 'roles.listAgentRoles: returns roles');
  assert(agentRoles.roles.some((r: any) => r.id === roleA.id), 'roles.listAgentRoles: has assigned role');
  await throttle();

  const effPerms = await client.permissions.getEffective(agentResult.agent.id);
  assert(Array.isArray(effPerms.permissions), 'permissions.getEffective: returns permissions');
  await throttle();

  const check1 = await client.permissions.check({
    agentId: agentResult.agent.id,
    resource: 'mcp:srv1:tool.invoke',
    action: 'invoke',
  });
  assert(typeof check1.allowed === 'boolean', 'permissions.check: returns allowed');
  await throttle();

  const batchCheck = await client.permissions.checkBatch({
    agentId: agentResult.agent.id,
    checks: [
      { resource: 'mcp:srv1:tool.invoke', action: 'invoke' },
      { resource: 'api:data:read', action: 'read' },
      { resource: 'api:secret:read', action: 'read' },
    ],
  });
  assert(Array.isArray(batchCheck.results), 'permissions.checkBatch: returns results');
  assert(batchCheck.results.length === 3, 'permissions.checkBatch: 3 results');
  await throttle();

  // Agent runtime permission checks
  const runtimeCheck1 = await runtimeA.checkPermission('mcp:srv:tool.invoke', 'invoke');
  assert(runtimeCheck1.allowed === true, 'runtime.checkPermission: mcp allowed');
  await throttle();

  const runtimeCheck2 = await runtimeA.checkPermission('api:secret:read', 'read');
  assert(runtimeCheck2.allowed === false, 'runtime.checkPermission: secret denied');
  await throttle();

  const permsCache = await runtimeA.fetchPermissions();
  assert(permsCache.permissions.length > 0, 'runtime.fetchPermissions: has allow');
  assert(permsCache.denyPermissions.length > 0, 'runtime.fetchPermissions: has deny');

  const hasMcp = await runtimeA.hasPermission('mcp:srv:tool.invoke');
  assert(hasMcp === true, 'runtime.hasPermission: cached mcp allowed');
  const hasSecret = await runtimeA.hasPermission('api:secret:read');
  assert(hasSecret === false, 'runtime.hasPermission: cached secret denied');
  const hasUnknown = await runtimeA.hasPermission('random:unknown:perm');
  assert(hasUnknown === false, 'runtime.hasPermission: unknown denied');

  runtimeA.invalidatePermissionsCache();
  passed++;
  console.log('  [PASS] runtime.invalidatePermissionsCache: no error');

  // ================================================================
  // SECTION 9: DELEGATION
  // ================================================================
  console.log('\n-- 9. DELEGATION --');

  const agentB = await client.createAgent({
    workspaceId: WORKSPACE_ID,
    name: `comp-agent-b-${suffix}`,
    createdBy: 'comprehensive-test',
  });
  assert(!!agentB.agent.id, 'agentB: created');
  await throttle();

  const del1 = await runtimeA.delegate({
    targetAgentId: agentB.agent.id,
    permissions: ['mcp:*:tool.*'],
    workspaceId: WORKSPACE_ID,
  });
  assert(del1.id.startsWith('del_'), 'delegate: del_ prefix');
  assert(del1.issuerAgentId === agentResult.agent.id, 'delegate: correct issuer');
  assert(del1.targetAgentId === agentB.agent.id, 'delegate: correct target');
  assert(del1.status.toLowerCase() === 'active', 'delegate: status active');
  await throttle();

  const delGet = await client.delegations.get(del1.id);
  assert(delGet.id === del1.id, 'delegations.get: correct id');
  await throttle();

  const delVerify = await client.delegations.verify({ delegationId: del1.id });
  assert(delVerify.valid === true, 'delegations.verify: valid');
  await throttle();

  const delList = await client.delegations.list({ workspaceId: WORKSPACE_ID });
  assert(Array.isArray(delList.items), 'delegations.list: returns items');
  await throttle();

  const delByAgent = await client.delegations.listByAgent(agentResult.agent.id);
  assert(Array.isArray(delByAgent.items), 'delegations.listByAgent: returns items');
  await throttle();

  // Privilege escalation rejection
  await expectThrow(
    () => runtimeA.delegate({
      targetAgentId: agentB.agent.id,
      permissions: ['admin:*:*'],
      workspaceId: WORKSPACE_ID,
    }),
    'delegate: privilege escalation rejected',
  );
  await throttle();

  // Delegation with expiry
  const delWithTtl = await runtimeA.delegate({
    targetAgentId: agentB.agent.id,
    permissions: ['mcp:*:tool.*'],
    workspaceId: WORKSPACE_ID,
    constraints: { expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() },
  });
  assert(delWithTtl.expiresAt !== undefined, 'delegate.ttl: has expiresAt');
  await throttle();

  // Revoke delegation
  const delRevoked = await client.delegations.revoke(del1.id);
  assert(delRevoked.status.toLowerCase() === 'revoked', 'delegations.revoke: status revoked');
  await throttle();

  // Verify revoked => invalid
  try {
    const verRevoked = await client.delegations.verify({ delegationId: del1.id });
    assert(verRevoked.valid === false, 'delegations.verify: revoked is invalid');
  } catch {
    passed++;
    console.log('  [PASS] delegations.verify: throws for revoked');
  }
  await throttle();

  // Delegated agent loading
  const runtimeBDel = client.loadDelegatedAgent({
    agentId: agentB.agent.id,
    privateKey: agentB.keyPair.privateKey,
    delegationToken: delWithTtl.id,
  });
  assert(runtimeBDel.agentId === agentB.agent.id, 'loadDelegatedAgent: correct id');

  // ================================================================
  // SECTION 10: POLICIES
  // ================================================================
  console.log('\n-- 10. POLICIES --');

  const pol1 = await client.policies.create({
    workspaceId: WORKSPACE_ID,
    name: `comp-policy-allow-${suffix}`,
    effect: 'ALLOW',
    principals: { roles: ['admin'] },
    resources: ['files:*'],
    actions: ['read', 'write'],
    priority: 10,
    enabled: true,
    description: 'Test ALLOW policy',
  });
  assert(pol1.id.startsWith('pol_'), 'policies.create: pol_ prefix');
  await throttle();

  const polList = await client.policies.list({ workspaceId: WORKSPACE_ID });
  assert(Array.isArray(polList.items), 'policies.list: returns items');
  await throttle();

  const polUpdated = await client.policies.update(pol1.id, { description: 'Updated', priority: 20 });
  assert(polUpdated.id === pol1.id, 'policies.update: correct id');
  await throttle();

  const simResult = await client.policies.simulate({
    workspaceId: WORKSPACE_ID,
    agentId: agentResult.agent.id,
    resource: 'files:doc.txt',
    action: 'read',
  });
  assert(simResult !== undefined, 'policies.simulate: returns result');
  await throttle();

  const evalResult = await client.policies.evaluate({
    workspaceId: WORKSPACE_ID,
    agentId: agentResult.agent.id,
    resource: 'files:doc.txt',
    action: 'read',
  });
  assert(evalResult !== undefined, 'policies.evaluate: returns result');
  await throttle();

  await safeRun('policies.versions', async () => {
    const versions = await client.policies.listVersions(pol1.id);
    assert(Array.isArray(versions), 'policies.listVersions: returns array');
  });
  await throttle();

  await client.policies.delete(pol1.id);
  passed++;
  console.log('  [PASS] policies.delete: policy deleted');
  await throttle();

  // ================================================================
  // SECTION 11: MCP SERVERS + TOOLS
  // ================================================================
  console.log('\n-- 11. MCP SERVERS + TOOLS --');

  const mcpSrv = await client.mcp.register({
    workspaceId: WORKSPACE_ID,
    name: `comp-mcp-${suffix}`,
    url: 'http://127.0.0.1:9100',
    description: 'Test MCP server',
  });
  assert(mcpSrv.id.startsWith('mcp_'), 'mcp.register: mcp_ prefix');
  await throttle();

  const mcpList = await client.mcp.listServers({ workspaceId: WORKSPACE_ID });
  assert(Array.isArray(mcpList.items), 'mcp.listServers: returns items');
  assert(mcpList.items.some((s: any) => s.id === mcpSrv.id), 'mcp.listServers: includes new server');
  await throttle();

  const mcpGet = await client.mcp.getServer(mcpSrv.id);
  assert(mcpGet.id === mcpSrv.id, 'mcp.getServer: correct id');
  await throttle();

  const mcpUpdated = await client.mcp.updateServer(mcpSrv.id, { description: 'Updated' });
  assert(mcpUpdated.id === mcpSrv.id, 'mcp.updateServer: correct id');
  await throttle();

  await safeRun('mcp.registerTool', async () => {
    const mcpTool = await client.mcp.registerTool(mcpSrv.id, {
      name: 'echo',
      description: 'Echo tool',
      inputSchema: { type: 'object', properties: { message: { type: 'string' } } },
    });
    assert(!!mcpTool.id, 'mcp.registerTool: returns id');
    assert(mcpTool.name === 'echo', 'mcp.registerTool: correct name');
  });
  await throttle();

  await safeRun('mcp.listTools', async () => {
    const mcpTools = await client.mcp.listTools(mcpSrv.id);
    assert(Array.isArray(mcpTools), 'mcp.listTools: returns array');
  });
  await throttle();

  // ================================================================
  // SECTION 12: AUDIT
  // ================================================================
  console.log('\n-- 12. AUDIT --');

  const auditEvents = await client.audit.listEvents({ orgId: ORG_ID, limit: 5 });
  assert(Array.isArray(auditEvents.items), 'audit.listEvents: returns items');
  assert(typeof auditEvents.total === 'number', 'audit.listEvents: has total');
  await throttle();

  const auditMetrics = await client.audit.getMetrics({ orgId: ORG_ID });
  assert(auditMetrics !== undefined, 'audit.getMetrics: returns result');
  await throttle();

  await safeRun('audit.generateReport', async () => {
    const report = await client.audit.generateReport({
      orgId: ORG_ID,
      dateFrom: '2025-01-01',
      dateTo: '2025-12-31',
    });
    assert(report !== undefined, 'audit.generateReport: returns report');
  });
  await throttle();

  // ================================================================
  // SECTION 13: WEBHOOKS
  // ================================================================
  console.log('\n-- 13. WEBHOOKS --');

  const webhook = await client.webhooks.create({
    organizationId: ORG_ID,
    url: 'https://httpbin.org/post',
    eventTypes: ['agent.created', 'agent.suspended'],
    secret: 'test-secret-1234567890123456',
  });
  assert(!!webhook.id, 'webhooks.create: returns id');
  await throttle();

  const whList = await client.webhooks.list({ organizationId: ORG_ID });
  assert(Array.isArray(whList), 'webhooks.list: returns array');
  await throttle();

  const whUpdated = await client.webhooks.update(webhook.id, { eventTypes: ['agent.created'] });
  assert(whUpdated.id === webhook.id, 'webhooks.update: correct id');
  await throttle();

  await client.webhooks.delete(webhook.id);
  passed++;
  console.log('  [PASS] webhooks.delete: webhook deleted');
  await throttle();

  // ================================================================
  // SECTION 14: ALERTS
  // ================================================================
  console.log('\n-- 14. ALERTS --');

  const alert = await client.alerts.create({
    organizationId: ORG_ID,
    name: `comp-alert-${suffix}`,
    eventTypes: ['agent.revoked'],
    conditions: { severity: 'high' },
    channels: ['email'] as any,
  });
  assert(!!alert.id, 'alerts.create: returns id');
  await throttle();

  const alertList = await client.alerts.list({ organizationId: ORG_ID });
  assert(Array.isArray(alertList), 'alerts.list: returns array');
  await throttle();

  const alertUpdated = await client.alerts.update(alert.id, { name: 'updated-alert' });
  assert(alertUpdated.id === alert.id, 'alerts.update: correct id');
  await throttle();

  await client.alerts.delete(alert.id);
  passed++;
  console.log('  [PASS] alerts.delete: alert deleted');
  await throttle();

  // ================================================================
  // SECTION 15: API KEYS
  // ================================================================
  console.log('\n-- 15. API KEYS --');

  const keyList = await client.apiKeys.list({ organizationId: ORG_ID });
  assert(Array.isArray(keyList), 'apiKeys.list: returns array');
  await throttle();

  const apiKey = await client.apiKeys.create({
    organizationId: ORG_ID,
    name: `comp-key-${suffix}`,
    createdBy: 'comprehensive-test',
    scopes: ['agents:read'],
  });
  assert(!!apiKey.id, 'apiKeys.create: returns id');
  await throttle();

  await safeRun('apiKeys.revoke', async () => {
    await client.apiKeys.revoke(apiKey.id);
    passed++;
    console.log('  [PASS] apiKeys.revoke: key revoked');
  });
  await throttle();

  // ================================================================
  // SECTION 16: NOTIFICATIONS
  // ================================================================
  console.log('\n-- 16. NOTIFICATIONS --');

  const notifList = await client.notifications.list({ organizationId: ORG_ID, limit: 5 });
  assert(Array.isArray(notifList), 'notifications.list: returns array');
  await throttle();

  const unreadCount = await client.notifications.unreadCount({ organizationId: ORG_ID });
  const count = (unreadCount as any).unreadCount ?? (unreadCount as any).count ?? 0;
  assert(typeof count === 'number', `notifications.unreadCount: ${count}`);
  await throttle();

  await safeRun('notifications.markAllRead', async () => {
    await client.notifications.markAllRead({ organizationId: ORG_ID });
    passed++;
    console.log('  [PASS] notifications.markAllRead: success');
  });
  await throttle();

  // ================================================================
  // SECTION 17: APPROVALS
  // ================================================================
  console.log('\n-- 17. APPROVALS --');

  await safeRun('approvals.create', async () => {
    const createResult = await client.approvals.create({
      organizationId: ORG_ID,
      workspaceId: WORKSPACE_ID,
      agentId: agentResult.agent.id,
      resource: 'files:sensitive.doc',
      action: 'write',
      challengeType: 'tool_call',
    });
    const approval = (createResult as any).challenge ?? createResult;
    assert(!!approval.id, 'approvals.create: returns id');
    assert(typeof approval.status === 'string', 'approvals.create: has status');
    await throttle();

    const apGet = await client.approvals.get(approval.id);
    assert(apGet.id === approval.id, 'approvals.get: correct id');
    await throttle();

    const apStatus = await client.approvals.getStatus(approval.id);
    assert(apStatus !== undefined, 'approvals.getStatus: returns status');
    await throttle();

    await safeRun('approvals.decide', async () => {
      const decided = await client.approvals.decide(approval.id, {
        action: 'approve',
        source: 'api',
        note: 'Approved by comprehensive test',
      });
      assert(decided !== undefined, 'approvals.decide: returns result');
    });
    await throttle();
  });

  await safeRun('approvals.list', async () => {
    const apList = await client.approvals.list({});
    assert(apList !== undefined, 'approvals.list: returns result');
  });
  await throttle();

  await safeRun('approvals.stats', async () => {
    const apStats = await client.approvals.stats();
    assert(apStats !== undefined, 'approvals.stats: returns stats');
  });
  await throttle();

  await safeRun('approvals.getSettings', async () => {
    const apSettings = await client.approvals.getSettings();
    assert(apSettings !== undefined, 'approvals.getSettings: returns settings');
  });
  await throttle();

  await safeRun('approvals.updateSettings', async () => {
    const updated = await client.approvals.updateSettings({ requireNoteOnDeny: false });
    assert(updated !== undefined, 'approvals.updateSettings: returns result');
  });
  await throttle();

  await safeRun('approvals.listPatterns', async () => {
    const patterns = await client.approvals.listPatterns({});
    assert(patterns !== undefined, 'approvals.listPatterns: returns result');
  });
  await throttle();

  // ================================================================
  // SECTION 18: ESCALATION RULES
  // ================================================================
  console.log('\n-- 18. ESCALATION RULES --');

  await safeRun('escalation.create', async () => {
    const rule = await client.approvals.createEscalationRule({
      name: `comp-rule-${suffix}`,
      riskLevels: ['HIGH', 'CRITICAL'],
      steps: [
        {
          delaySeconds: 60,
          notifyUserIds: ['usr_test'],
          channels: ['dashboard'],
        },
      ],
    });
    assert(!!rule.id, 'escalation.create: returns id');
    assert(rule.name === `comp-rule-${suffix}`, 'escalation.create: correct name');
    await throttle();

    const ruleGet = await client.approvals.getEscalationRule(rule.id);
    assert(ruleGet.id === rule.id, 'escalation.get: correct id');
    await throttle();

    const ruleUpdated = await client.approvals.updateEscalationRule(rule.id, { name: 'updated-rule' });
    assert(ruleUpdated !== undefined, 'escalation.update: returns result');
    await throttle();

    await client.approvals.deleteEscalationRule(rule.id);
    passed++;
    console.log('  [PASS] escalation.delete: rule deleted');
    await throttle();
  });

  const escList = await client.approvals.listEscalationRules();
  assert(escList !== undefined, 'escalation.list: returns result');
  await throttle();

  // ================================================================
  // SECTION 19: APPROVAL WEBHOOKS
  // ================================================================
  console.log('\n-- 19. APPROVAL WEBHOOKS --');

  await safeRun('approvalWebhooks', async () => {
    const apWh = await client.approvals.createWebhook({
      name: `comp-ap-wh-${suffix}`,
      url: 'https://httpbin.org/post',
      secret: 'abcdef12',
      eventTypes: ['approval.created'],
    });
    assert(!!apWh.id, 'approvalWebhooks.create: returns id');
    await throttle();

    const apWhList = await client.approvals.listWebhooks();
    assert(apWhList !== undefined, 'approvalWebhooks.list: returns result');
    await throttle();

    const apWhUpdated = await client.approvals.updateWebhook(apWh.id, { name: 'updated-wh' });
    assert(apWhUpdated !== undefined, 'approvalWebhooks.update: returns result');
    await throttle();

    await client.approvals.deleteWebhook(apWh.id);
    passed++;
    console.log('  [PASS] approvalWebhooks.delete: deleted');
    await throttle();
  });

  // ================================================================
  // SECTION 20: CREDITS
  // ================================================================
  console.log('\n-- 20. CREDITS --');

  await safeRun('credits.balance', async () => {
    const balance = await client.credits.balance();
    assert(balance !== undefined, 'credits.balance: returns result');
  });
  await throttle();

  await safeRun('credits.transactions', async () => {
    const txns = await client.credits.transactions();
    assert(txns !== undefined, 'credits.transactions: returns result');
  });
  await throttle();

  // ================================================================
  // SECTION 21: KEY ROTATION
  // ================================================================
  console.log('\n-- 21. KEY ROTATION --');

  const oldPrivateKey = agentResult.keyPair.privateKey;
  const rotated = await runtimeA.rotateKey();
  assert(rotated.keyPair.privateKey !== oldPrivateKey, 'rotateKey: new key different');
  assert(rotated.agent.id === agentResult.agent.id, 'rotateKey: same agent id');
  await throttle();

  const runtimeANew = client.loadAgent({
    agentId: agentResult.agent.id,
    privateKey: rotated.keyPair.privateKey,
    workspaceId: WORKSPACE_ID,
  });
  const profileAfterRotation = await runtimeANew.getProfile();
  assert(profileAfterRotation.id === agentResult.agent.id, 'rotateKey: new key works');
  await throttle();

  const staleRuntime = client.loadAgent({
    agentId: agentResult.agent.id,
    privateKey: oldPrivateKey,
    workspaceId: WORKSPACE_ID,
  });
  await expectThrow(() => staleRuntime.getProfile(), 'rotateKey: old key rejected');
  await throttle();

  // ================================================================
  // SECTION 22: SUSPEND / REACTIVATE / REVOKE
  // ================================================================
  console.log('\n-- 22. LIFECYCLE: SUSPEND/REACTIVATE/REVOKE --');

  await runtimeANew.suspend();
  await expectThrow(() => runtimeANew.getProfile(), 'suspend: requests blocked');
  await throttle();

  const reactivateKp = generateKeyPair();
  const reactivated = await client.agents.activate(agentResult.agent.id, { publicKey: reactivateKp.publicKey });
  assert(reactivated.status.toLowerCase() === 'active', 'reactivate: status active');
  await throttle();

  const runtimeAReactivated = client.loadAgent({
    agentId: agentResult.agent.id,
    privateKey: reactivateKp.privateKey,
    workspaceId: WORKSPACE_ID,
  });
  const profileReactivated = await runtimeAReactivated.getProfile();
  assert(profileReactivated.status.toLowerCase() === 'active', 'reactivate: works');
  await throttle();

  await runtimeAReactivated.revoke();
  await expectThrow(() => runtimeAReactivated.getProfile(), 'revoke: permanently blocked');
  await throttle();

  await expectThrow(
    () => client.agents.activate(agentResult.agent.id, { publicKey: generateKeyPair().publicKey }),
    'revoke: cannot reactivate',
  );
  await throttle();

  // ================================================================
  // SECTION 23: BUILT-IN ROLES (IMMUTABILITY)
  // ================================================================
  console.log('\n-- 23. BUILT-IN ROLES --');

  const allRoles = await client.roles.list({ workspaceId: WORKSPACE_ID, limit: 100 });
  const builtins = ['agent:viewer', 'agent:executor', 'agent:writer', 'agent:delegator', 'agent:admin'];
  for (const bn of builtins) {
    const found = allRoles.items.find((r: any) => r.name === bn);
    assert(found !== undefined, `builtin: ${bn} exists`);
    if (found) assert(found.isBuiltin === true, `builtin: ${bn} isBuiltin=true`);
  }
  await throttle();

  const viewerRole = allRoles.items.find((r: any) => r.name === 'agent:viewer');
  if (viewerRole) {
    await expectThrow(() => client.roles.update(viewerRole.id, { name: 'hacked' }), 'builtin: cannot modify');
    await throttle();
    await expectThrow(() => client.roles.delete(viewerRole.id), 'builtin: cannot delete');
    await throttle();
  }

  // ================================================================
  // SECTION 24: ROLE HIERARCHY
  // ================================================================
  console.log('\n-- 24. ROLE HIERARCHY --');

  await safeRun('role hierarchy', async () => {
    const ancestors = await client.roles.getAncestors(roleA.id);
    assert(ancestors !== undefined, 'roles.getAncestors: returns result');
    await throttle();

    const children = await client.roles.getChildren(roleA.id);
    assert(children !== undefined, 'roles.getChildren: returns result');
    await throttle();
  });

  // ================================================================
  // SECTION 25: BULK OPERATIONS
  // ================================================================
  console.log('\n-- 25. BULK OPERATIONS --');

  await safeRun('bulk decide', async () => {
    const bulkResult = await client.approvals.bulkDecide({
      challengeIds: ['fake_id_1', 'fake_id_2'],
      action: 'deny',
      source: 'api',
      note: 'Bulk deny test',
    });
    assert(bulkResult !== undefined, 'approvals.bulkDecide: returns result');
  });
  await throttle();

  await safeRun('delegations.revokeAll', async () => {
    const revokeResult = await client.delegations.revokeAll(agentB.agent.id);
    assert(typeof revokeResult.revokedCount === 'number', 'delegations.revokeAll: returns count');
  });
  await throttle();

  // ================================================================
  // CLEANUP
  // ================================================================
  console.log('\n-- CLEANUP --');

  const cleanupItems = [
    () => client.roles.unassign(agentResult.agent.id, roleA.id),
    () => client.roles.delete(roleA.id),
    () => client.delegations.revoke(delWithTtl.id),
    () => client.agents.revoke(agentB.agent.id),
    () => client.mcp.deleteServer(mcpSrv.id),
  ];
  for (const fn of cleanupItems) {
    try { await fn(); } catch { /* ok */ }
  }
  console.log('  Cleanup done');

  // ================================================================
  // SUMMARY
  // ================================================================
  console.log('\n====================================================================');
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED (${requestCount} API requests)`);
  console.log('====================================================================');
  if (errors.length) {
    console.error('\n  Failed tests:');
    errors.forEach((e) => console.error(`    - ${e}`));
  }
  console.log('');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
