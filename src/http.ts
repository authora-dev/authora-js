import {
  AuthoraError,
  AuthenticationError,
  AuthorizationError,
  NetworkError,
  NotFoundError,
  RateLimitError,
  TimeoutError,
} from './errors.js';

/** HTTP methods supported by the client. */
type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

/** Options for an individual request. */
interface RequestOptions {
  /** Query parameters to append to the URL. */
  query?: Record<string, string | number | boolean | undefined>;
  /** JSON body to send. */
  body?: unknown;
  /** Additional headers for this request only. */
  headers?: Record<string, string>;
  /** Whether the request requires authentication. Defaults to true. */
  auth?: boolean;
}

/**
 * Low-level HTTP client wrapping the native `fetch` API.
 *
 * Handles serialization, authentication headers, query-string construction,
 * and maps HTTP error responses to typed SDK errors.
 */
export class HttpClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly defaultHeaders: Record<string, string>;

  constructor(options: {
    baseUrl: string;
    apiKey: string;
    timeout: number;
    headers?: Record<string, string>;
  }) {
    // Strip trailing slash to avoid double-slashing
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.apiKey = options.apiKey;
    this.timeout = options.timeout;
    this.defaultHeaders = options.headers ?? {};
  }

  // -----------------------------------------------------------------------
  // Public convenience methods
  // -----------------------------------------------------------------------

  /** Send a GET request and return the parsed JSON response. */
  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, options);
  }

  /** Send a POST request and return the parsed JSON response. */
  async post<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', path, options);
  }

  /** Send a PATCH request and return the parsed JSON response. */
  async patch<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('PATCH', path, options);
  }

  /** Send a DELETE request and return the parsed JSON response. */
  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, options);
  }

  // -----------------------------------------------------------------------
  // Core request implementation
  // -----------------------------------------------------------------------

  private async request<T>(
    method: HttpMethod,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = this.buildUrl(path, options.query);
    const requiresAuth = options.auth !== false;

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...this.defaultHeaders,
      ...options.headers,
    };

    if (requiresAuth) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const init: RequestInit = { method, headers };

    // Only set Content-Type and body when there is actual content to send.
    // Sending Content-Type: application/json with an empty body causes Fastify
    // to reject the request with FST_ERR_CTP_EMPTY_JSON_BODY.
    if (options.body !== undefined && method !== 'GET') {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(options.body);
    }

    // Timeout via AbortController
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    init.signal = controller.signal;

    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (err: unknown) {
      clearTimeout(timer);
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new TimeoutError(`Request to ${method} ${path} timed out after ${this.timeout}ms`);
      }
      const message = err instanceof Error ? err.message : 'Unknown network error';
      throw new NetworkError(`Request to ${method} ${path} failed: ${message}`, err);
    } finally {
      clearTimeout(timer);
    }

    // Parse the response body (may be empty for 204, etc.)
    let body: unknown;
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      body = await response.json();
    } else {
      const text = await response.text();
      body = text.length > 0 ? text : undefined;
    }

    if (!response.ok) {
      this.throwForStatus(response.status, body, method, path);
    }

    // Unwrap the backend's { data: T } / { data: T[], pagination: {...} } envelope
    return this.unwrapResponse<T>(body);
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  /**
   * Unwrap the standard backend response envelope.
   *
   * The Authora API returns responses in one of these shapes:
   * - `{ data: T }` for single entities
   * - `{ data: T[], pagination: { total, page, limit } }` for lists
   * - `{ data: T[], meta: { total, page, limit } }` for some lists
   *
   * For paginated lists, this returns `{ items: T[], total, page, limit }`.
   * For single entities, this returns the unwrapped `T`.
   */
  private unwrapResponse<T>(body: unknown): T {
    if (body && typeof body === 'object' && 'data' in (body as Record<string, unknown>)) {
      const obj = body as Record<string, unknown>;
      const data = obj['data'];
      const pagination = (obj['pagination'] ?? obj['meta']) as Record<string, unknown> | undefined;

      // If data is an array and we have pagination, return a PaginatedList
      if (Array.isArray(data) && pagination) {
        return {
          items: data,
          total: pagination['total'] ?? data.length,
          page: pagination['page'],
          limit: pagination['limit'],
        } as T;
      }

      // If data is an array without pagination, return { items: data }
      if (Array.isArray(data)) {
        return { items: data } as T;
      }

      // Single entity: unwrap data
      return data as T;
    }

    // No envelope, return as-is
    return body as T;
  }

  /** Build the full URL including query parameters. */
  private buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(`${this.baseUrl}${path}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  /** Map an HTTP error status to the appropriate SDK error. */
  private throwForStatus(status: number, body: unknown, method: string, path: string): never {
    const parsed = this.parseErrorBody(body);
    const prefix = `${method} ${path}`;

    switch (status) {
      case 401:
        throw new AuthenticationError(
          parsed.message ?? `${prefix}: Authentication failed`,
          parsed.details,
        );
      case 403:
        throw new AuthorizationError(
          parsed.message ?? `${prefix}: Forbidden`,
          parsed.details,
        );
      case 404:
        throw new NotFoundError(
          parsed.message ?? `${prefix}: Not found`,
          parsed.details,
        );
      case 429: {
        throw new RateLimitError(
          parsed.message ?? `${prefix}: Rate limit exceeded`,
          parsed.retryAfter,
          parsed.details,
        );
      }
      default:
        throw new AuthoraError(
          parsed.message ?? `${prefix}: Request failed with status ${status}`,
          status,
          parsed.code,
          parsed.details,
        );
    }
  }

  /** Attempt to extract structured error information from the response body. */
  private parseErrorBody(body: unknown): {
    message?: string;
    code?: string;
    details?: unknown;
    retryAfter?: number;
  } {
    if (body && typeof body === 'object') {
      const obj = body as Record<string, unknown>;
      return {
        message: typeof obj['message'] === 'string' ? obj['message'] : undefined,
        code: typeof obj['code'] === 'string' ? obj['code'] : undefined,
        details: obj['details'],
        retryAfter: typeof obj['retryAfter'] === 'number' ? obj['retryAfter'] : undefined,
      };
    }
    if (typeof body === 'string') {
      return { message: body };
    }
    return {};
  }
}
