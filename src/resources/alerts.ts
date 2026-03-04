import type { HttpClient } from '../http.js';
import type {
  Alert,
  CreateAlertParams,
  ListAlertsParams,
  UpdateAlertParams,
} from '../types.js';
import { toQuery } from '../utils.js';

/**
 * Resource class for managing alert rules.
 *
 * Alerts define conditions under which notifications are triggered
 * and the channels through which they are delivered.
 */
export class AlertsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Create a new alert rule.
   *
   * @param params - Alert creation parameters.
   * @returns The created alert.
   */
  async create(params: CreateAlertParams): Promise<Alert> {
    return this.http.post<Alert>('/alerts', { body: params });
  }

  /**
   * List alerts for an organization.
   *
   * @param params - Query parameters including organizationId.
   * @returns Array of alerts.
   */
  async list(params: ListAlertsParams): Promise<Alert[]> {
    const res = await this.http.get<{ items: Alert[] }>('/alerts', { query: toQuery(params) });
    return res.items ?? (res as unknown as Alert[]);
  }

  /**
   * Update an existing alert rule. Only provided fields are modified.
   *
   * @param alertId - The unique identifier of the alert to update.
   * @param params - Fields to update.
   * @returns The updated alert.
   */
  async update(alertId: string, params: UpdateAlertParams): Promise<Alert> {
    return this.http.patch<Alert>(`/alerts/${alertId}`, { body: params });
  }

  /**
   * Delete an alert rule.
   *
   * @param alertId - The unique identifier of the alert to delete.
   */
  async delete(alertId: string): Promise<void> {
    await this.http.delete<void>(`/alerts/${alertId}`);
  }
}
