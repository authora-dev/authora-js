import { createServer } from 'http';

const PORT = 9200;
const AUTHORA_BASE_URL = process.env.AUTHORA_BASE_URL || 'http://localhost:8000/api/v1';

const registeredKeys = new Map();

const MOCK_FS = {
  '/data/report.csv': 'date,value,status\n2025-01-01,100,ok\n2025-01-02,200,ok\n2025-01-03,150,warn',
  '/data/config.json': '{"version":"1.2.3","env":"production"}',
  '/data/output.txt': '',
};

const TOOLS = {
  read_file: {
    description: 'Reads a file and returns its contents',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to read' },
      },
      required: ['path'],
    },
  },
  write_file: {
    description: 'Writes content to a file',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to write' },
        content: { type: 'string', description: 'Content to write' },
      },
      required: ['path', 'content'],
    },
  },
  delete_file: {
    description: 'Deletes a file',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to delete' },
      },
      required: ['path'],
    },
  },
};

function handleReadFile(args) {
  const content = MOCK_FS[args.path];
  if (content === undefined) {
    return { content: [{ type: 'text', text: `Error: file not found: ${args.path}` }], isError: true };
  }
  return { content: [{ type: 'text', text: content }] };
}

function handleWriteFile(args) {
  MOCK_FS[args.path] = args.content;
  return { content: [{ type: 'text', text: `Written ${args.content.length} bytes to ${args.path}` }] };
}

function handleDeleteFile(args) {
  if (MOCK_FS[args.path] === undefined) {
    return { content: [{ type: 'text', text: `Error: file not found: ${args.path}` }], isError: true };
  }
  delete MOCK_FS[args.path];
  return { content: [{ type: 'text', text: `Deleted ${args.path}` }] };
}

async function verifySignature(meta) {
  if (!meta || !meta.agentId || !meta.signature || !meta.timestamp) {
    return { ok: false, reason: 'missing _authora metadata' };
  }

  const drift = Math.abs(Date.now() - new Date(meta.timestamp).getTime());
  if (drift > 5 * 60 * 1000) {
    return { ok: false, reason: 'timestamp expired' };
  }

  const pubKey = registeredKeys.get(meta.agentId);
  if (!pubKey) {
    return { ok: false, reason: `no key registered for ${meta.agentId}` };
  }

  try {
    const ed = await import('@noble/ed25519');
    const { sha512 } = await import('@noble/hashes/sha512');
    ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

    const payload = `POST\n/mcp/proxy\n${meta.timestamp}\n`;
    const msgBytes = new TextEncoder().encode(payload);

    const sigBytes = Buffer.from(meta.signature, 'base64url');
    const keyBytes = Buffer.from(pubKey, 'base64url');

    const valid = ed.verify(sigBytes, msgBytes, keyBytes);
    if (!valid) {
      return { ok: false, reason: 'signature verification failed' };
    }
  } catch (err) {
    return { ok: false, reason: `verification error: ${err.message}` };
  }

  return { ok: true };
}

async function checkPermission(agentId, toolName) {
  const resource = `mcp:server_files:tool.${toolName}`;
  try {
    const res = await fetch(`${AUTHORA_BASE_URL}/permissions/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-auth': process.env.S2S_SECRET || '',
      },
      body: JSON.stringify({ agentId, resource, action: 'execute' }),
    });
    if (!res.ok) {
      return { allowed: false, reason: `permission service returned ${res.status}` };
    }
    const data = await res.json();
    const result = data.data || data;
    return { allowed: result.allowed === true, reason: result.reason };
  } catch (err) {
    return { allowed: false, reason: `permission check failed: ${err.message}` };
  }
}

function handleJsonRpc(body, authResult, permResult) {
  const { jsonrpc, id, method, params } = body;

  if (jsonrpc !== '2.0') {
    return { jsonrpc: '2.0', id, error: { code: -32600, message: 'Invalid Request' } };
  }

  switch (method) {
    case 'initialize':
      return {
        jsonrpc: '2.0', id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'authora-file-server', version: '1.0.0' },
        },
      };

    case 'tools/list':
      return {
        jsonrpc: '2.0', id,
        result: {
          tools: Object.entries(TOOLS).map(([name, def]) => ({
            name, description: def.description, inputSchema: def.inputSchema,
          })),
        },
      };

    case 'tools/call': {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};

      if (!TOOLS[toolName]) {
        return { jsonrpc: '2.0', id, error: { code: -32602, message: `Unknown tool: ${toolName}` } };
      }

      if (!authResult.ok) {
        return { jsonrpc: '2.0', id, error: { code: -32001, message: `Authentication failed: ${authResult.reason}` } };
      }

      if (!permResult.allowed) {
        return { jsonrpc: '2.0', id, error: { code: -32003, message: `Permission denied: ${permResult.reason || 'no matching role'}` } };
      }

      let result;
      switch (toolName) {
        case 'read_file': result = handleReadFile(toolArgs); break;
        case 'write_file': result = handleWriteFile(toolArgs); break;
        case 'delete_file': result = handleDeleteFile(toolArgs); break;
      }
      return { jsonrpc: '2.0', id, result };
    }

    default:
      return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', server: 'authora-file-server', tools: Object.keys(TOOLS), registeredAgents: registeredKeys.size }));
    return;
  }

  if (req.method === 'POST' && req.url === '/admin/register-key') {
    try {
      const raw = await readBody(req);
      const { agentId, publicKey } = JSON.parse(raw);
      if (!agentId || !publicKey) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'agentId and publicKey required' }));
        return;
      }
      registeredKeys.set(agentId, publicKey);
      console.log(`Registered key for ${agentId}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, agentId }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === 'POST' && (req.url === '/' || req.url === '/mcp/proxy')) {
    try {
      const raw = await readBody(req);
      const parsed = JSON.parse(raw);
      const meta = parsed.params?._authora;
      const toolName = parsed.params?.name;

      const authResult = parsed.method === 'tools/call'
        ? await verifySignature(meta)
        : { ok: true };

      const permResult = (parsed.method === 'tools/call' && authResult.ok && toolName)
        ? await checkPermission(meta.agentId, toolName)
        : { allowed: true };

      const response = handleJsonRpc(parsed, authResult, permResult);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }));
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Authora File MCP Server running on http://0.0.0.0:${PORT}`);
  console.log(`Tools: ${Object.keys(TOOLS).join(', ')}`);
  console.log(`Authora API: ${AUTHORA_BASE_URL}`);
});
