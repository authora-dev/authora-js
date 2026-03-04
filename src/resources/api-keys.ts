import type { HttpClient } from '../http.js';
import type {
  ApiKey,
  CreateApiKeyParams,
  ListApiKeysParams,
} from '../types.js';
import { toQuery } from '../utils.js';

/**
 * Resource class for managing API keys.
 *
 * API keys provide programmatic access to the Authora platform
 * and can be scoped to specific permissions.
 */
export class ApiKeysResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Create a new API key for an organization.
   *
   * @param params - API key creation parameters.
   * @returns The created API key (the full key value is only returned on creation).
   */
  async create(params: CreateApiKeyParams): Promise<ApiKey> {
    return this.http.post<ApiKey>('/api-keys', { body: params });
  }

  /**
   * List API keys for an organization.
   *
   * @param params - Query parameters including organizationId.
   * @returns Array of API keys (key values are not included in list responses).
   */
  async list(params: ListApiKeysParams): Promise<ApiKey[]> {
    const res = await this.http.get<{ items: ApiKey[] }>('/api-keys', { query: toQuery(params) });
    return res.items ?? (res as unknown as ApiKey[]);
  }

  /**
   * Revoke (delete) an API key.
   *
   * @param keyId - The unique identifier of the API key to revoke.
   */
  async revoke(keyId: string): Promise<void> {
    await this.http.delete<void>(`/api-keys/${keyId}`);
  }
}
