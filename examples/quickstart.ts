import { AuthoraClient } from '@authora/sdk';

const client = new AuthoraClient({
  apiKey: process.env.AUTHORA_API_KEY!,
});

const agent = await client.agents.create({
  name: 'my-agent',
  workspaceId: 'ws_...',
});

console.log('Created agent:', agent.id);

const roles = await client.roles.list({ workspaceId: agent.workspaceId });
console.log('Available roles:', roles.data.length);

await client.agents.suspend(agent.id);
console.log('Agent suspended');
