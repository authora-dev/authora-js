import type { HttpClient } from '../http.js';
import type {
  AuditEvent,
  AuditMetrics,
  AuditMetricsParams,
  AuditReport,
  GenerateReportParams,
  ListAuditEventsParams,
  PaginatedList,
} from '../types.js';
import { toQuery } from '../utils.js';

export class AuditResource {
  constructor(private readonly http: HttpClient) {}

  async listEvents(params?: ListAuditEventsParams): Promise<PaginatedList<AuditEvent>> {
    return this.http.get<PaginatedList<AuditEvent>>(
      '/audit/events',
      params ? { query: toQuery(params) } : undefined,
    );
  }

  async getEvent(eventId: string): Promise<AuditEvent> {
    return this.http.get<AuditEvent>(`/audit/events/${eventId}`);
  }

  async generateReport(params: GenerateReportParams): Promise<AuditReport> {
    return this.http.post<AuditReport>('/audit/reports', { body: params });
  }

  async getMetrics(params: AuditMetricsParams): Promise<AuditMetrics> {
    return this.http.get<AuditMetrics>('/audit/metrics', { query: toQuery(params) });
  }
}
