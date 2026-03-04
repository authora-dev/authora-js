import { AuthoraClient, AuthoraAgent, generateKeyPair, verify, buildSignaturePayload, matchPermission } from '../src/index.js';

const API_KEY = 'authora_live_076270f52d3fc0fe9af9d08fe49b2803eb8b64ba5132fc76';
const BASE_URL = 'https://api.authora.dev/api/v1';
const WORKSPACE_ID = 'ws_a7067ccce35d36b5';

const client = new AuthoraClient({ apiKey: API_KEY, baseUrl: BASE_URL });

let passed = 0;
let failed = 0;
const errors: string[] = [];

function assert(condition: boolean, msg: string) {
  if (condition) { passed++; console.log(`  [PASS] ${msg}`); }
  else { failed++; errors.push(msg); console.error(`  [FAIL] ${msg}`); }
}

async function run() {
  console.log('\n=== Authora SDK E2E Agent Runtime Tests ===\n');

  // 1. Crypto primitives
  console.log('-- Crypto --');
  const kp = generateKeyPair();
  assert(kp.privateKey.length > 0, 'keygen: private key exists');
  assert(kp.publicKey.length > 0, 'keygen: public key exists');
  assert(kp.privateKey !== kp.publicKey, 'keygen: keys are different');

  const payload = buildSignaturePayload('POST', '/test', '2025-01-01T00:00:00Z', '{"foo":"bar"}');
  assert(payload.startsWith('POST\n'), 'payload: starts with method');
  assert(payload.includes('/test\n'), 'payload: includes path');

  const { sign } = await import('../src/crypto.js');
  const sig = sign(payload, kp.privateKey);
  assert(sig.length > 0, 'sign: signature produced');
  assert(verify(payload, sig, kp.publicKey), 'verify: valid signature accepted');
  assert(!verify('tampered', sig, kp.publicKey), 'verify: tampered message rejected');

  // 2. Permission matching
  console.log('\n-- Permission Matching --');
  assert(matchPermission('*:*:*', 'mcp:server1:tool.read'), 'match: wildcard all');
  assert(matchPermission('mcp:*:tool.*', 'mcp:server1:tool.read'), 'match: prefix wildcard');
  assert(!matchPermission('mcp:*:tool.*', 'api:server1:tool.read'), 'match: segment mismatch');
  assert(!matchPermission('a:b', 'a:b:c'), 'match: segment count mismatch');

  // 3. Create agent via admin client
  console.log('\n-- Agent Creation --');
  const suffix = Date.now().toString(36);
  const result = await client.createAgent({
    workspaceId: WORKSPACE_ID,
    name: `e2e-agent-${suffix}`,
    createdBy: 'e2e-test',
  });
  assert(result.agent.id.startsWith('agt_'), 'createAgent: id prefix');
  assert(result.agent.status.toLowerCase() === 'active', 'createAgent: status active');
  assert(result.agent.publicKey !== undefined, 'createAgent: public key set');
  assert(result.keyPair.privateKey.length > 0, 'createAgent: keypair returned');
  console.log(`  Agent ID: ${result.agent.id}`);

  // 4. Load agent runtime
  console.log('\n-- Agent Runtime --');
  const agent = client.loadAgent({
    agentId: result.agent.id,
    privateKey: result.keyPair.privateKey,
  });
  assert(agent.agentId === result.agent.id, 'loadAgent: correct id');
  assert(agent.getPublicKey() === result.keyPair.publicKey, 'loadAgent: correct public key');

  // 5. Signed request - get profile
  console.log('\n-- Signed Requests --');
  const profile = await agent.getProfile();
  assert(profile.id === result.agent.id, 'getProfile: correct id');
  assert(profile.status.toLowerCase() === 'active', 'getProfile: status active');

  // 6. Identity document (public endpoint)
  const identity = await agent.getIdentityDocument();
  assert(identity !== null && identity !== undefined, 'identityDoc: returned');
  assert(typeof identity === 'object', 'identityDoc: is object');

  // 7. Assign role + check permission
  console.log('\n-- RBAC Permissions --');
  const role = await client.roles.create({
    workspaceId: WORKSPACE_ID,
    name: `e2e-role-${suffix}`,
    permissions: ['mcp:*:tool.*', 'api:*:read'],
    denyPermissions: ['api:secret:*'],
  });
  await client.roles.assign(result.agent.id, { roleId: role.id, grantedBy: 'e2e-test' });

  const check1 = await agent.checkPermission('mcp:server1:tool.invoke', 'invoke');
  assert(check1.allowed === true, 'checkPermission: allowed for mcp tool');

  const checks = await agent.checkPermissions([
    { resource: 'api:users:read', action: 'read' },
    { resource: 'api:secret:read', action: 'read' },
  ]);
  assert(checks.length === 2, 'checkPermissions: batch returned 2');

  // 8. Client-side permission cache
  const perms = await agent.fetchPermissions();
  assert(perms.permissions.length > 0, 'fetchPermissions: has permissions');
  const has = await agent.hasPermission('mcp:server1:tool.invoke');
  assert(has === true, 'hasPermission: cached check passes');
  const hasDenied = await agent.hasPermission('api:secret:read');
  assert(hasDenied === false, 'hasPermission: deny permission blocks');

  // 9. Delegation
  console.log('\n-- Delegation --');
  const subResult = await client.createAgent({
    workspaceId: WORKSPACE_ID,
    name: `e2e-sub-${suffix}`,
    createdBy: 'e2e-test',
  });
  const delegation = await agent.delegate({
    targetAgentId: subResult.agent.id,
    permissions: ['mcp:*:tool.*'],
  });
  assert(delegation.id.startsWith('del_'), 'delegate: id prefix');
  assert(delegation.issuerAgentId === result.agent.id, 'delegate: correct issuer');
  assert(delegation.targetAgentId === subResult.agent.id, 'delegate: correct target');

  // 10. Key rotation
  console.log('\n-- Key Rotation --');
  const rotated = await agent.rotateKey();
  assert(rotated.keyPair.privateKey !== result.keyPair.privateKey, 'rotateKey: new key');
  assert(rotated.agent.id === result.agent.id, 'rotateKey: same agent');

  const agent2 = client.loadAgent({
    agentId: result.agent.id,
    privateKey: rotated.keyPair.privateKey,
  });
  const profile2 = await agent2.getProfile();
  assert(profile2.id === result.agent.id, 'rotateKey: new key works');

  // 11. Suspend + reactivate
  console.log('\n-- Lifecycle --');
  await agent2.suspend();
  let threw = false;
  try { await agent2.getProfile(); } catch { threw = true; }
  assert(threw, 'suspend: signed request rejected after suspend');

  const reactivateKp = generateKeyPair();
  const reactivatedAgent = await client.agents.activate(result.agent.id, { publicKey: reactivateKp.publicKey });
  assert(reactivatedAgent.status.toLowerCase() === 'active', 'reactivate: agent active again');
  const agent3 = client.loadAgent({
    agentId: result.agent.id,
    privateKey: reactivateKp.privateKey,
  });
  const profile3 = await agent3.getProfile();
  assert(profile3.status.toLowerCase() === 'active', 'reactivate: profile confirms active');

  // 12. Revoke
  await agent3.revoke();
  let revThrew = false;
  try { await agent3.getProfile(); } catch { revThrew = true; }
  assert(revThrew, 'revoke: signed request rejected after revoke');

  // 13. Cleanup
  console.log('\n-- Cleanup --');
  try { await client.roles.delete(role.id); } catch { /* ok */ }
  try { await client.agents.revoke(subResult.agent.id); } catch { /* ok */ }

  // Summary
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (errors.length) {
    console.error('\nFailed tests:');
    errors.forEach((e) => console.error(`  - ${e}`));
  }
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
