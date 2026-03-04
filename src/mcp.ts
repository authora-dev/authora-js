import { buildSignaturePayload, verify } from './crypto.js';
import { matchAnyPermission } from './permissions.js';
import { AuthorizationError, AuthenticationError } from './errors.js';
import type { McpAuthoraMetadata, McpGuardOptions, McpToolContext } from './types.js';

const MAX_DRIFT_MS = 5 * 60 * 1000;

interface McpReq { body: unknown; method?: string; url?: string }
interface McpRes { status(code: number): McpRes; json(body: unknown): void }
type McpNext = (err?: unknown) => void;

function reqId(req: McpReq): string | number | null {
  if (req.body && typeof req.body === 'object') {
    const id = (req.body as Record<string, unknown>)['id'];
    if (typeof id === 'string' || typeof id === 'number') return id;
  }
  return null;
}

export class AuthoraMCPGuard {
  private readonly resolve: (agentId: string) => Promise<string | null>;
  private readonly perms?: string[];
  private readonly denied?: (agentId: string, reason: string) => void;

  constructor(opts: McpGuardOptions) {
    if (!opts.resolvePublicKey) throw new Error('resolvePublicKey required');
    this.resolve = opts.resolvePublicKey;
    this.perms = opts.requiredPermissions;
    this.denied = opts.onDenied;
  }

  middleware(): (req: McpReq, res: McpRes, next: McpNext) => Promise<void> {
    return async (req, res, next) => {
      try {
        (req as McpReq & { authora: McpToolContext }).authora = await this.verifyRequest(req);
        next();
      } catch (err) {
        if (err instanceof AuthenticationError || err instanceof AuthorizationError)
          res.status(err.statusCode).json({ jsonrpc: '2.0', error: { code: -32001, message: err.message }, id: reqId(req) });
        else next(err);
      }
    };
  }

  async verifyRequest(req: McpReq): Promise<McpToolContext> {
    const body = req.body as Record<string, unknown> | undefined;
    if (!body) throw new AuthenticationError('invalid request body');

    const params = body['params'] as Record<string, unknown> | undefined;
    if (!params) throw new AuthenticationError('missing params');

    const meta = params['_authora'] as McpAuthoraMetadata | undefined;
    if (!meta?.agentId || !meta.signature || !meta.timestamp)
      throw new AuthenticationError('missing or incomplete _authora metadata');

    const ts = new Date(meta.timestamp).getTime();
    if (Number.isNaN(ts) || Math.abs(Date.now() - ts) > MAX_DRIFT_MS)
      throw new AuthenticationError('timestamp expired or invalid');

    const pubKey = await this.resolve(meta.agentId);
    if (!pubKey) throw new AuthenticationError(`cannot resolve key for ${meta.agentId}`);

    const payload = buildSignaturePayload('POST', '/mcp/proxy', meta.timestamp, null);
    if (!verify(payload, meta.signature, pubKey)) {
      this.denied?.(meta.agentId, 'signature verification failed');
      throw new AuthenticationError('signature verification failed');
    }

    if (this.perms?.length) {
      const tool = (params['name'] as string) ?? '';
      const resource = tool ? `mcp:*:tool.${tool}` : '*:*:*';
      if (!matchAnyPermission(this.perms, resource)) {
        this.denied?.(meta.agentId, `denied for tool ${tool}`);
        throw new AuthorizationError(`permission denied for tool ${tool}`);
      }
    }

    return { agentId: meta.agentId, timestamp: meta.timestamp, delegationToken: meta.delegationToken, verified: true };
  }
}

export function protectTool<TArgs = Record<string, unknown>, TResult = unknown>(
  guard: AuthoraMCPGuard,
  handler: (args: TArgs, context: McpToolContext) => Promise<TResult>,
): (req: McpReq, res: McpRes) => Promise<void> {
  return async (req, res) => {
    try {
      const ctx = await guard.verifyRequest(req);
      const params = (req.body as Record<string, unknown>)['params'] as Record<string, unknown>;
      const result = await handler((params['arguments'] ?? {}) as TArgs, ctx);
      res.json({ jsonrpc: '2.0', result, id: reqId(req) });
    } catch (err) {
      if (err instanceof AuthenticationError || err instanceof AuthorizationError)
        res.status(err.statusCode).json({ jsonrpc: '2.0', error: { code: -32001, message: err.message }, id: reqId(req) });
      else
        res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: err instanceof Error ? err.message : 'internal error' }, id: reqId(req) });
    }
  };
}
