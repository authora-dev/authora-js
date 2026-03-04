import type { HttpClient } from '../http.js';
import type {
  CreateWebhookParams,
  ListWebhooksParams,
  UpdateWebhookParams,
  Webhook,
} from '../types.js';
import { toQuery } from '../utils.js';

export class WebhooksResource {
  constructor(private readonly http: HttpClient) {}

  async create(params: CreateWebhookParams): Promise<Webhook> {
    return this.http.post<Webhook>('/webhooks', { body: params });
  }

  async list(params: ListWebhooksParams): Promise<Webhook[]> {
    const res = await this.http.get<{ items: Webhook[] }>('/webhooks', { query: toQuery(params) });
    return res.items ?? (res as unknown as Webhook[]);
  }

  async update(webhookId: string, params: UpdateWebhookParams): Promise<Webhook> {
    return this.http.patch<Webhook>(`/webhooks/${webhookId}`, { body: params });
  }

  async delete(webhookId: string): Promise<void> {
    await this.http.delete<void>(`/webhooks/${webhookId}`);
  }
}
