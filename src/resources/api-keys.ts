import type { HttpClient } from '../http.js';
import type {
  ApiKey,
  CreateApiKeyParams,
  ListApiKeysParams,
} from '../types.js';
import { toQuery } from '../utils.js';

export class ApiKeysResource {
  constructor(private readonly http: HttpClient) {}

  async create(params: CreateApiKeyParams): Promise<ApiKey> {
    return this.http.post<ApiKey>('/api-keys', { body: params });
  }

  async list(params: ListApiKeysParams): Promise<ApiKey[]> {
    const res = await this.http.get<{ items: ApiKey[] }>('/api-keys', { query: toQuery(params) });
    return res.items ?? (res as unknown as ApiKey[]);
  }

  async revoke(keyId: string): Promise<void> {
    await this.http.delete<void>(`/api-keys/${keyId}`);
  }
}
