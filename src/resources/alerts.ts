import type { HttpClient } from '../http.js';
import type {
  Alert,
  CreateAlertParams,
  ListAlertsParams,
  UpdateAlertParams,
} from '../types.js';
import { toQuery } from '../utils.js';

export class AlertsResource {
  constructor(private readonly http: HttpClient) {}

  async create(params: CreateAlertParams): Promise<Alert> {
    return this.http.post<Alert>('/alerts', { body: params });
  }

  async list(params: ListAlertsParams): Promise<Alert[]> {
    const res = await this.http.get<{ items: Alert[] }>('/alerts', { query: toQuery(params) });
    return res.items ?? (res as unknown as Alert[]);
  }

  async update(alertId: string, params: UpdateAlertParams): Promise<Alert> {
    return this.http.patch<Alert>(`/alerts/${alertId}`, { body: params });
  }

  async delete(alertId: string): Promise<void> {
    await this.http.delete<void>(`/alerts/${alertId}`);
  }
}
