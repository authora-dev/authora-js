/**
 * MCP Edge Error Classes
 *
 * Typed error classes for all 9 edge-specific JSON-RPC error codes.
 * These map to the error codes returned by the Cloudflare edge worker
 * when processing MCP proxy requests.
 */

import { AuthoraError } from './errors.js';

/** -32029: Rate limit exceeded at edge */
export class EdgeRateLimitError extends AuthoraError {
  public readonly jsonRpcCode = -32029;
  public readonly retryAfter: number;
  public readonly limit: number;
  public readonly remaining: number;
  public readonly resetAt: string;

  constructor(data: { retryAfter: number; limit: number; remaining: number; resetAt: string; message?: string }) {
    super(data.message ?? 'Rate limit exceeded', 429, 'EDGE_RATE_LIMIT');
    this.name = 'EdgeRateLimitError';
    this.retryAfter = data.retryAfter;
    this.limit = data.limit;
    this.remaining = data.remaining;
    this.resetAt = data.resetAt;
    Object.setPrototypeOf(this, EdgeRateLimitError.prototype);
  }
}

/** -32030: Human approval required before tool execution */
export class ApprovalRequiredError extends AuthoraError {
  public readonly jsonRpcCode = -32030;
  public readonly challengeId: string;
  public readonly pollUrl: string;

  constructor(data: { challengeId: string; pollUrl: string; message?: string }) {
    super(data.message ?? 'Approval required', 403, 'APPROVAL_REQUIRED');
    this.name = 'ApprovalRequiredError';
    this.challengeId = data.challengeId;
    this.pollUrl = data.pollUrl;
    Object.setPrototypeOf(this, ApprovalRequiredError.prototype);
  }
}

/** -32031: Edge routing failure (edge could not reach origin) */
export class EdgeRoutingError extends AuthoraError {
  public readonly jsonRpcCode = -32031;

  constructor(message?: string) {
    super(message ?? 'Edge routing failure', 502, 'EDGE_ROUTING_ERROR');
    this.name = 'EdgeRoutingError';
    Object.setPrototypeOf(this, EdgeRoutingError.prototype);
  }
}

/** -32032: Identity verification failed at edge */
export class EdgeIdentityError extends AuthoraError {
  public readonly jsonRpcCode = -32032;

  constructor(message?: string) {
    super(message ?? 'Identity verification failed at edge', 401, 'EDGE_IDENTITY_ERROR');
    this.name = 'EdgeIdentityError';
    Object.setPrototypeOf(this, EdgeIdentityError.prototype);
  }
}

/** -32033: Permission denied at edge */
export class EdgePermissionError extends AuthoraError {
  public readonly jsonRpcCode = -32033;

  constructor(message?: string) {
    super(message ?? 'Permission denied at edge', 403, 'EDGE_PERMISSION_ERROR');
    this.name = 'EdgePermissionError';
    Object.setPrototypeOf(this, EdgePermissionError.prototype);
  }
}

/** -32034: Delegation chain invalid or expired at edge */
export class EdgeDelegationError extends AuthoraError {
  public readonly jsonRpcCode = -32034;

  constructor(message?: string) {
    super(message ?? 'Delegation chain invalid or expired', 403, 'EDGE_DELEGATION_ERROR');
    this.name = 'EdgeDelegationError';
    Object.setPrototypeOf(this, EdgeDelegationError.prototype);
  }
}

/** -32035: Epoch mismatch (stale edge cache) */
export class EdgeEpochMismatchError extends AuthoraError {
  public readonly jsonRpcCode = -32035;

  constructor(message?: string) {
    super(message ?? 'Epoch mismatch -- stale edge cache', 409, 'EDGE_EPOCH_MISMATCH');
    this.name = 'EdgeEpochMismatchError';
    Object.setPrototypeOf(this, EdgeEpochMismatchError.prototype);
  }
}

/** -32036: Circuit breaker open (origin unhealthy) */
export class EdgeCircuitOpenError extends AuthoraError {
  public readonly jsonRpcCode = -32036;
  public readonly retryAfter: number;

  constructor(data?: { retryAfter?: number; message?: string }) {
    super(data?.message ?? 'Circuit breaker open -- origin unhealthy', 503, 'EDGE_CIRCUIT_OPEN');
    this.name = 'EdgeCircuitOpenError';
    this.retryAfter = data?.retryAfter ?? 30;
    Object.setPrototypeOf(this, EdgeCircuitOpenError.prototype);
  }
}

/** -32037: Request payload too large for edge processing */
export class EdgePayloadTooLargeError extends AuthoraError {
  public readonly jsonRpcCode = -32037;

  constructor(message?: string) {
    super(message ?? 'Request payload too large', 413, 'EDGE_PAYLOAD_TOO_LARGE');
    this.name = 'EdgePayloadTooLargeError';
    Object.setPrototypeOf(this, EdgePayloadTooLargeError.prototype);
  }
}

/**
 * Map a JSON-RPC error code to the appropriate edge error class.
 * Returns undefined if the code is not a recognized edge error.
 */
export function parseEdgeError(code: number, data?: Record<string, unknown>): AuthoraError | undefined {
  switch (code) {
    case -32029:
      return new EdgeRateLimitError({
        retryAfter: (data?.retryAfter as number) ?? 60,
        limit: (data?.limit as number) ?? 0,
        remaining: (data?.remaining as number) ?? 0,
        resetAt: (data?.resetAt as string) ?? '',
        message: data?.message as string,
      });
    case -32030:
      return new ApprovalRequiredError({
        challengeId: (data?.challengeId as string) ?? '',
        pollUrl: (data?.pollUrl as string) ?? '',
        message: data?.message as string,
      });
    case -32031:
      return new EdgeRoutingError(data?.message as string);
    case -32032:
      return new EdgeIdentityError(data?.message as string);
    case -32033:
      return new EdgePermissionError(data?.message as string);
    case -32034:
      return new EdgeDelegationError(data?.message as string);
    case -32035:
      return new EdgeEpochMismatchError(data?.message as string);
    case -32036:
      return new EdgeCircuitOpenError({
        retryAfter: data?.retryAfter as number,
        message: data?.message as string,
      });
    case -32037:
      return new EdgePayloadTooLargeError(data?.message as string);
    default:
      return undefined;
  }
}
