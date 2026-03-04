import {
  AuthoraClient,
  generateKeyPair,
  verify,
  sign,
  buildSignaturePayload,
  matchPermission,
  matchAnyPermission,
} from '../src/index.js';

const API_KEY = 'authora_live_076270f52d3fc0fe9af9d08fe49b2803eb8b64ba5132fc76';
const BASE_URL = 'https://api.authora.dev/api/v1';
const ORG_ID = 'org_92582b4a512e52ff';
const WORKSPACE_ID = 'ws_a7067ccce35d36b5';

const client = new AuthoraClient({ apiKey: API_KEY, baseUrl: BASE_URL });

let passed = 0;
let failed = 0;
const errors: string[] = [];
const suffix = Date.now().toString(36);

function assert(condition: boolean, msg: string) {
  if (condition) { passed++; console.log(`  [PASS] ${msg}`); }
  else { failed++; errors.push(msg); console.error(`  [FAIL] ${msg}`); }
}

async function expectThrow(fn: () => Promise<unknown>, msg: string): Promise<boolean> {
  try { await fn(); failed++; errors.push(msg); console.error(`  [FAIL] ${msg} (no error thrown)`); return false; }
  catch { passed++; console.log(`  [PASS] ${msg}`); return true; }
}

async function run() {
  console.log('\n====================================================================');
  console.log('  AUTHORA COMPREHENSIVE BUSINESS LOGIC E2E TEST');
  console.log('  Target: PRODUCTION (api.authora.dev)');
  console.log('====================================================================\n');

  // ================================================================
  // SECTION 1: CRYPTO PRIMITIVES
  // ================================================================
  console.log('-- 1. CRYPTO PRIMITIVES --');

  const kp1 = generateKeyPair();
  const kp2 = generateKeyPair();
  assert(kp1.privateKey !== kp2.privateKey, 'keygen: two keypairs are unique');

  const payload = buildSignaturePayload('POST', '/api/v1/test', new Date().toISOString(), '{"hello":"world"}');
  const sig1 = sign(payload, kp1.privateKey);
  assert(verify(payload, sig1, kp1.publicKey), 'crypto: valid signature verifies');
  assert(!verify(payload, sig1, kp2.publicKey), 'crypto: wrong key rejects');
  assert(!verify('tampered-payload', sig1, kp1.publicKey), 'crypto: tampered payload rejects');

  const emptyBodyPayload = buildSignaturePayload('GET', '/api/v1/test', new Date().toISOString(), null);
  const sigEmpty = sign(emptyBodyPayload, kp1.privateKey);
  assert(verify(emptyBodyPayload, sigEmpty, kp1.publicKey), 'crypto: empty body signature verifies');

  // ================================================================
  // SECTION 2: PERMISSION MATCHING ENGINE
  // ================================================================
  console.log('\n-- 2. PERMISSION MATCHING ENGINE --');

  assert(matchPermission('*:*:*', 'mcp:server1:tool.read'), 'match: triple wildcard matches anything');
  assert(matchPermission('mcp:*:tool.*', 'mcp:server1:tool.read'), 'match: segment wildcards');
  assert(matchPermission('mcp:server*:tool.*', 'mcp:server1:tool.read'), 'match: prefix wildcard within segment');
  assert(!matchPermission('mcp:*:tool.*', 'api:server1:tool.read'), 'match: first segment mismatch rejects');
  assert(!matchPermission('a:b', 'a:b:c'), 'match: segment count mismatch rejects');
  assert(!matchPermission('a:b:c:d', 'a:b:c'), 'match: extra segments reject');
  assert(matchPermission('api:*:read', 'api:users:read'), 'match: wildcard middle segment');
  assert(!matchPermission('api:*:write', 'api:users:read'), 'match: action mismatch rejects');

  assert(matchAnyPermission(['mcp:*:tool.*', 'api:*:read'], 'mcp:srv:tool.exec'), 'matchAny: first pattern matches');
  assert(matchAnyPermission(['mcp:*:tool.*', 'api:*:read'], 'api:data:read'), 'matchAny: second pattern matches');
  assert(!matchAnyPermission(['mcp:*:tool.*'], 'api:data:read'), 'matchAny: no pattern matches');

  // ================================================================
  // SECTION 3: AGENT LIFECYCLE - Create -> Activate -> Signed Request
  // ================================================================
  console.log('\n-- 3. AGENT LIFECYCLE --');

  const agentA = await client.createAgent({
    workspaceId: WORKSPACE_ID,
    name: `biz-agent-a-${suffix}`,
    createdBy: 'bizlogic-test',
    tags: ['e2e', 'bizlogic'],
    framework: 'custom',
  });
  assert(agentA.agent.id.startsWith('agt_'), 'agentA: created with agt_ prefix');
  assert(agentA.agent.status.toLowerCase() === 'active', 'agentA: status is active after createAgent');
  assert(agentA.agent.publicKey !== undefined, 'agentA: public key is set');

  const runtimeA = client.loadAgent({
    agentId: agentA.agent.id,
    privateKey: agentA.keyPair.privateKey,
  });

  const profileA = await runtimeA.getProfile();
  assert(profileA.id === agentA.agent.id, 'agentA: signed getProfile returns correct id');
  assert(profileA.status.toLowerCase() === 'active', 'agentA: signed getProfile confirms active');

  const identityA = await runtimeA.getIdentityDocument();
  assert(identityA !== null && identityA !== undefined, 'agentA: identity document returned');
  assert(typeof identityA === 'object', 'agentA: identity document is object');

  // ================================================================
  // SECTION 4: SIGNED REQUEST WITH WRONG KEY -> REJECTED
  // ================================================================
  console.log('\n-- 4. WRONG KEY REJECTION --');

  const wrongKp = generateKeyPair();
  const badAgent = client.loadAgent({
    agentId: agentA.agent.id,
    privateKey: wrongKp.privateKey,
  });
  await expectThrow(
    () => badAgent.getProfile(),
    'wrongKey: signed request with wrong key is rejected',
  );

  // ================================================================
  // SECTION 5: RBAC - Roles, Assignment, Permission Checks
  // ================================================================
  console.log('\n-- 5. RBAC PERMISSIONS --');

  const roleExecutor = await client.roles.create({
    workspaceId: WORKSPACE_ID,
    name: `biz-executor-${suffix}`,
    permissions: ['mcp:*:tool.*', 'api:data:read'],
    denyPermissions: ['api:secret:*'],
  });
  assert(roleExecutor.id.startsWith('role_'), 'roleExecutor: created with role_ prefix');

  await client.roles.assign(agentA.agent.id, { roleId: roleExecutor.id, grantedBy: 'bizlogic-test' });

  const check1 = await runtimeA.checkPermission('mcp:server1:tool.invoke', 'invoke');
  assert(check1.allowed === true, 'rbac: mcp tool invoke is allowed');

  const check2 = await runtimeA.checkPermission('api:data:read', 'read');
  assert(check2.allowed === true, 'rbac: api data read is allowed');

  // ================================================================
  // SECTION 6: DENY ALWAYS WINS
  // ================================================================
  console.log('\n-- 6. DENY ALWAYS WINS --');

  const check3 = await runtimeA.checkPermission('api:secret:read', 'read');
  assert(check3.allowed === false, 'deny: api:secret:read is denied by denyPermissions');

  const check4 = await runtimeA.checkPermission('api:secret:write', 'write');
  assert(check4.allowed === false, 'deny: api:secret:write is denied by denyPermissions');

  const permsA = await runtimeA.fetchPermissions();
  assert(permsA.permissions.length > 0, 'fetchPermissions: has allow permissions');
  assert(permsA.denyPermissions.length > 0, 'fetchPermissions: has deny permissions');

  const hasMcp = await runtimeA.hasPermission('mcp:server1:tool.invoke');
  assert(hasMcp === true, 'hasPermission(cached): mcp tool allowed');

  const hasSecret = await runtimeA.hasPermission('api:secret:read');
  assert(hasSecret === false, 'hasPermission(cached): api:secret denied');

  const hasUnknown = await runtimeA.hasPermission('random:unknown:perm');
  assert(hasUnknown === false, 'hasPermission(cached): unassigned perm is denied');

  // ================================================================
  // SECTION 7: DELEGATION - Create, Verify, Scope Check
  // ================================================================
  console.log('\n-- 7. DELEGATION --');

  const agentB = await client.createAgent({
    workspaceId: WORKSPACE_ID,
    name: `biz-agent-b-${suffix}`,
    createdBy: 'bizlogic-test',
  });

  const delegation = await runtimeA.delegate({
    targetAgentId: agentB.agent.id,
    permissions: ['mcp:*:tool.*'],
  });
  assert(delegation.id.startsWith('del_'), 'delegation: id has del_ prefix');
  assert(delegation.issuerAgentId === agentA.agent.id, 'delegation: issuer is agentA');
  assert(delegation.targetAgentId === agentB.agent.id, 'delegation: target is agentB');
  assert(delegation.status.toLowerCase() === 'active', 'delegation: status is active');

  const verified = await client.delegations.verify({ delegationId: delegation.id });
  assert(verified.valid === true, 'delegation: verify returns valid');

  // Load delegated agent
  const runtimeBDelegated = client.loadDelegatedAgent({
    agentId: agentB.agent.id,
    privateKey: agentB.keyPair.privateKey,
    delegationToken: delegation.id,
  });
  assert(runtimeBDelegated.agentId === agentB.agent.id, 'delegatedAgent: loaded correctly');

  // ================================================================
  // SECTION 8: DELEGATION PRIVILEGE ESCALATION -> REJECTED
  // ================================================================
  console.log('\n-- 8. PRIVILEGE ESCALATION REJECTION --');

  await expectThrow(
    () => runtimeA.delegate({
      targetAgentId: agentB.agent.id,
      permissions: ['admin:*:*'],
    }),
    'escalation: cannot delegate permissions agent does not hold',
  );

  // ================================================================
  // SECTION 9: DELEGATION TTL ENFORCEMENT
  // ================================================================
  console.log('\n-- 9. DELEGATION TTL ENFORCEMENT --');

  const delWithExpiry = await runtimeA.delegate({
    targetAgentId: agentB.agent.id,
    permissions: ['mcp:*:tool.*'],
    constraints: { expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() },
  });
  assert(delWithExpiry.expiresAt !== undefined, 'ttl: delegation has expiresAt');
  const expiresTime = new Date(delWithExpiry.expiresAt!).getTime();
  const now = Date.now();
  assert(expiresTime > now, 'ttl: expiresAt is in the future');
  assert(expiresTime <= now + 24 * 60 * 60 * 1000 + 5000, 'ttl: expiresAt is within 24h cap');

  // ================================================================
  // SECTION 10: KEY ROTATION - Old Key Fails, New Key Works
  // ================================================================
  console.log('\n-- 10. KEY ROTATION --');

  const agentC = await client.createAgent({
    workspaceId: WORKSPACE_ID,
    name: `biz-agent-c-${suffix}`,
    createdBy: 'bizlogic-test',
  });
  const runtimeC = client.loadAgent({
    agentId: agentC.agent.id,
    privateKey: agentC.keyPair.privateKey,
  });

  const profileC = await runtimeC.getProfile();
  assert(profileC.status.toLowerCase() === 'active', 'rotation: agent starts active');

  const rotated = await runtimeC.rotateKey();
  assert(rotated.keyPair.privateKey !== agentC.keyPair.privateKey, 'rotation: new key is different');

  const oldKeyAgent = client.loadAgent({
    agentId: agentC.agent.id,
    privateKey: agentC.keyPair.privateKey,
  });
  await expectThrow(
    () => oldKeyAgent.getProfile(),
    'rotation: old key is rejected after rotation',
  );

  const newKeyAgent = client.loadAgent({
    agentId: agentC.agent.id,
    privateKey: rotated.keyPair.privateKey,
  });
  const profileAfterRotation = await newKeyAgent.getProfile();
  assert(profileAfterRotation.id === agentC.agent.id, 'rotation: new key works');

  // ================================================================
  // SECTION 11: SUSPEND -> ALL REQUESTS FAIL
  // ================================================================
  console.log('\n-- 11. SUSPEND AGENT --');

  await newKeyAgent.suspend();

  await expectThrow(
    () => newKeyAgent.getProfile(),
    'suspend: signed request fails after suspend',
  );

  // ================================================================
  // SECTION 12: REACTIVATE -> REQUESTS WORK AGAIN
  // ================================================================
  console.log('\n-- 12. REACTIVATE AGENT --');

  const reactivateKp = generateKeyPair();
  const reactivated = await client.agents.activate(agentC.agent.id, { publicKey: reactivateKp.publicKey });
  assert(reactivated.status.toLowerCase() === 'active', 'reactivate: status is active');

  const runtimeCReactivated = client.loadAgent({
    agentId: agentC.agent.id,
    privateKey: reactivateKp.privateKey,
  });
  const profileReactivated = await runtimeCReactivated.getProfile();
  assert(profileReactivated.status.toLowerCase() === 'active', 'reactivate: signed request works again');

  // ================================================================
  // SECTION 13: REVOKE -> PERMANENTLY BLOCKED
  // ================================================================
  console.log('\n-- 13. REVOKE AGENT --');

  await runtimeCReactivated.revoke();

  await expectThrow(
    () => runtimeCReactivated.getProfile(),
    'revoke: signed request fails permanently',
  );

  await expectThrow(
    () => client.agents.activate(agentC.agent.id, { publicKey: generateKeyPair().publicKey }),
    'revoke: cannot reactivate a revoked agent',
  );

  // ================================================================
  // SECTION 14: DELEGATION FROM REVOKED AGENT -> INVALID
  // ================================================================
  console.log('\n-- 14. DELEGATION FROM REVOKED ISSUER --');

  // AgentA is still active, but let's test revocation invalidation
  const agentD = await client.createAgent({
    workspaceId: WORKSPACE_ID,
    name: `biz-agent-d-${suffix}`,
    createdBy: 'bizlogic-test',
  });

  const delFromA = await runtimeA.delegate({
    targetAgentId: agentD.agent.id,
    permissions: ['mcp:*:tool.*'],
  });
  assert(delFromA.status.toLowerCase() === 'active', 'delFromA: delegation is active');

  // Revoke the delegation explicitly
  const revokedDel = await client.delegations.revoke(delFromA.id);
  assert(revokedDel.status.toLowerCase() === 'revoked', 'delRevoke: delegation status is revoked');

  // Verify revoked delegation fails
  try {
    const verResult = await client.delegations.verify({ delegationId: delFromA.id });
    assert(verResult.valid === false, 'delRevoke: verify returns invalid for revoked delegation');
  } catch {
    passed++; console.log('  [PASS] delRevoke: verify throws for revoked delegation');
  }

  // ================================================================
  // SECTION 15: MCP SERVER + TOOL REGISTRATION
  // ================================================================
  console.log('\n-- 15. MCP SERVER + TOOL REGISTRATION --');

  const mcpServer = await client.mcp.register({
    workspaceId: WORKSPACE_ID,
    name: `biz-mcp-${suffix}`,
    url: 'https://mcp-test.authora.dev/rpc',
  });
  assert(mcpServer.id.startsWith('mcp_'), 'mcp: server registered with mcp_ prefix');

  const mcpTool = await client.mcp.registerTool(mcpServer.id, {
    name: `biz-tool-${suffix}`,
    description: 'E2E test tool',
    inputSchema: { type: 'object', properties: { query: { type: 'string' } } },
  });
  assert(mcpTool.name === `biz-tool-${suffix}`, 'mcp: tool registered with correct name');

  const tools = await client.mcp.listTools(mcpServer.id);
  assert(tools.length >= 1, 'mcp: listTools returns at least 1');

  // ================================================================
  // SECTION 16: POLICY ENGINE - STRUCTURED PRINCIPALS
  // ================================================================
  console.log('\n-- 16. POLICY ENGINE --');

  const denyPolicy = await client.policies.create({
    workspaceId: WORKSPACE_ID,
    name: `biz-deny-policy-${suffix}`,
    effect: 'DENY',
    principals: { agents: [agentA.agent.id] },
    resources: [`mcp:${mcpServer.id}:tool.${mcpTool.name}`],
    actions: ['execute'],
  });
  assert(denyPolicy.id.startsWith('pol_'), 'policy: created with pol_ prefix');

  const simResult = await client.policies.simulate({
    workspaceId: WORKSPACE_ID,
    agentId: agentA.agent.id,
    resource: `mcp:${mcpServer.id}:tool.${mcpTool.name}`,
    action: 'execute',
  });
  assert(simResult !== undefined, 'policy: simulate returns result');

  // ================================================================
  // SECTION 17: AUDIT EVENTS
  // ================================================================
  console.log('\n-- 17. AUDIT EVENTS --');

  const events = await client.audit.listEvents({ workspaceId: WORKSPACE_ID, limit: 5 });
  assert(events.items !== undefined, 'audit: listEvents returns items');
  assert(events.total >= 0, 'audit: total is non-negative');

  // ================================================================
  // SECTION 18: BUILT-IN ROLES
  // ================================================================
  console.log('\n-- 18. BUILT-IN ROLES --');

  const allRoles = await client.roles.list({ workspaceId: WORKSPACE_ID, limit: 100 });
  const builtinNames = ['agent:viewer', 'agent:executor', 'agent:writer', 'agent:delegator', 'agent:admin'];
  for (const bn of builtinNames) {
    const found = allRoles.items.find((r: any) => r.name === bn);
    assert(found !== undefined, `builtin: ${bn} exists in workspace`);
    if (found) {
      assert(found.isBuiltin === true, `builtin: ${bn} has isBuiltin=true`);
    }
  }

  const viewerRole = allRoles.items.find((r: any) => r.name === 'agent:viewer');
  if (viewerRole) {
    await expectThrow(
      () => client.roles.update(viewerRole.id, { name: 'hacked' }),
      'builtin: cannot modify a built-in role',
    );
    await expectThrow(
      () => client.roles.delete(viewerRole.id),
      'builtin: cannot delete a built-in role',
    );
  }

  // ================================================================
  // SECTION 19: ORGANIZATION + WORKSPACE
  // ================================================================
  console.log('\n-- 19. ORGANIZATION + WORKSPACE --');

  const orgs = await client.organizations.list();
  assert(orgs.items.length >= 1, 'orgs: at least one org exists');

  const workspaces = await client.workspaces.list({ organizationId: ORG_ID });
  assert(workspaces.items.length >= 1, 'workspaces: at least one workspace');

  // ================================================================
  // SECTION 20: MULTIPLE ROLE STACKING
  // ================================================================
  console.log('\n-- 20. ROLE STACKING --');

  const roleWriter = await client.roles.create({
    workspaceId: WORKSPACE_ID,
    name: `biz-writer-${suffix}`,
    permissions: ['data:*:write'],
  });
  await client.roles.assign(agentA.agent.id, { roleId: roleWriter.id, grantedBy: 'bizlogic-test' });

  const writeCheck = await runtimeA.checkPermission('data:records:write', 'write');
  assert(writeCheck.allowed === true, 'stacking: second role grants data write');

  const mcpCheck = await runtimeA.checkPermission('mcp:server1:tool.invoke', 'invoke');
  assert(mcpCheck.allowed === true, 'stacking: first role still grants mcp');

  // ================================================================
  // SECTION 21: VERIFY AGENT (PUBLIC ENDPOINT)
  // ================================================================
  console.log('\n-- 21. VERIFY AGENT --');

  const agentAVerify = await client.verifyAgent(agentA.agent.id);
  assert(agentAVerify !== null && agentAVerify !== undefined, 'verify: agentA returns identity doc');

  const agentAGet = await client.agents.get(agentA.agent.id);
  assert(agentAGet.status.toUpperCase() === 'ACTIVE', 'verify: agentA status is ACTIVE');

  const agentCGet = await client.agents.get(agentC.agent.id);
  assert(agentCGet.status.toUpperCase() === 'REVOKED', 'verify: agentC status is REVOKED');

  // ================================================================
  // SECTION 22: BATCH PERMISSION CHECK
  // ================================================================
  console.log('\n-- 22. BATCH PERMISSION CHECK --');

  const batchResult = await runtimeA.checkPermissions([
    { resource: 'mcp:server1:tool.invoke', action: 'invoke' },
    { resource: 'api:data:read', action: 'read' },
    { resource: 'api:secret:admin', action: 'admin' },
    { resource: 'data:records:write', action: 'write' },
  ]);
  assert(batchResult.length === 4, 'batch: 4 results returned');
  assert(batchResult[0].allowed === true, 'batch: mcp tool allowed');
  assert(batchResult[1].allowed === true, 'batch: api data read allowed');
  assert(batchResult[2].allowed === false, 'batch: api secret denied');
  assert(batchResult[3].allowed === true, 'batch: data write allowed');

  // ================================================================
  // SECTION 23: DELEGATION REVOCATION
  // ================================================================
  console.log('\n-- 23. DELEGATION REVOCATION --');

  const agentE = await client.createAgent({
    workspaceId: WORKSPACE_ID,
    name: `biz-agent-e-${suffix}`,
    createdBy: 'bizlogic-test',
  });

  const del2 = await runtimeA.delegate({
    targetAgentId: agentE.agent.id,
    permissions: ['mcp:*:tool.*'],
  });
  assert(del2.status.toLowerCase() === 'active', 'del2: starts active');

  const revoked2 = await client.delegations.revoke(del2.id);
  assert(revoked2.status.toLowerCase() === 'revoked', 'del2: revoked');

  // ================================================================
  // CLEANUP
  // ================================================================
  console.log('\n-- CLEANUP --');

  try { await client.policies.delete(denyPolicy.id); } catch { /* ok */ }
  try { await client.roles.delete(roleExecutor.id); } catch { /* ok */ }
  try { await client.roles.delete(roleWriter.id); } catch { /* ok */ }
  try { await client.agents.revoke(agentA.agent.id); } catch { /* ok */ }
  try { await client.agents.revoke(agentB.agent.id); } catch { /* ok */ }
  try { await client.agents.revoke(agentD.agent.id); } catch { /* ok */ }
  try { await client.agents.revoke(agentE.agent.id); } catch { /* ok */ }
  console.log('  Cleanup done');

  // ================================================================
  // SUMMARY
  // ================================================================
  console.log('\n====================================================================');
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
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
