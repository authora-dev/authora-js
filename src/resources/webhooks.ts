import type { HttpClient } from '../http.js';
import type {
  CreateWebhookParams,
  ListWebhooksParams,
  UpdateWebhookParams,
  Webhook,
} from '../types.js';
import { toQuery } from '../utils.js';

/**
 * Resource class for managing webhook subscriptions.
 *
 * Webhooks allow external systems to receive HTTP callbacks
 * when specific events occur in Authora.
 */
export class WebhooksResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Create a new webhook subscription.
   *
   * @param params - Webhook creation parameters.
   * @returns The created webhook.
   */
  async create(params: CreateWebhookParams): Promise<Webhook> {
    return this.http.post<Webhook>('/webhooks', { body: params });
  }

  /**
   * List webhooks for an organization.
   *
   * @param params - Query parameters including organizationId.
   * @returns Array of webhooks.
   */
  async list(params: ListWebhooksParams): Promise<Webhook[]> {
    const res = await this.http.get<{ items: Webhook[] }>('/webhooks', { query: toQuery(params) });
    return res.items ?? (res as unknown as Webhook[]);
  }

  /**
   * Update an existing webhook. Only provided fields are modified.
   *
   * @param webhookId - The unique identifier of the webhook to update.
   * @param params - Fields to update.
   * @returns The updated webhook.
   */
  async update(webhookId: string, params: UpdateWebhookParams): Promise<Webhook> {
    return this.http.patch<Webhook>(`/webhooks/${webhookId}`, { body: params });
  }

  /**
   * Delete a webhook subscription.
   *
   * @param webhookId - The unique identifier of the webhook to delete.
   */
  async delete(webhookId: string): Promise<void> {
    await this.http.delete<void>(`/webhooks/${webhookId}`);
  }
}
