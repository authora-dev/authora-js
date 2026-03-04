/**
 * Base error class for all Authora SDK errors.
 */
export class AuthoraError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number,
    code?: string,
    details?: unknown,
  ) {
    super(message);
    this.name = 'AuthoraError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    // Restore prototype chain (required for extending built-ins in TS)
    Object.setPrototypeOf(this, AuthoraError.prototype);
  }
}

/**
 * Thrown when an API request fails due to a network or connectivity issue.
 */
export class NetworkError extends AuthoraError {
  constructor(message: string, details?: unknown) {
    super(message, 0, 'NETWORK_ERROR', details);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * Thrown when the request times out.
 */
export class TimeoutError extends AuthoraError {
  constructor(message: string = 'Request timed out') {
    super(message, 408, 'TIMEOUT');
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Thrown when authentication fails (401).
 */
export class AuthenticationError extends AuthoraError {
  constructor(message: string = 'Authentication failed', details?: unknown) {
    super(message, 401, 'AUTHENTICATION_ERROR', details);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Thrown when authorization fails (403).
 */
export class AuthorizationError extends AuthoraError {
  constructor(message: string = 'Forbidden', details?: unknown) {
    super(message, 403, 'AUTHORIZATION_ERROR', details);
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * Thrown when a requested resource is not found (404).
 */
export class NotFoundError extends AuthoraError {
  constructor(message: string = 'Resource not found', details?: unknown) {
    super(message, 404, 'NOT_FOUND', details);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Thrown when the request is rate-limited (429).
 */
export class RateLimitError extends AuthoraError {
  public readonly retryAfter?: number;

  constructor(message: string = 'Rate limit exceeded', retryAfter?: number, details?: unknown) {
    super(message, 429, 'RATE_LIMIT', details);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}
