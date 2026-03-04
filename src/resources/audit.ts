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

/**
 * Resource class for querying audit events, generating reports,
 * and retrieving audit metrics.
 */
export class AuditResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * List audit events with optional filters and pagination.
   *
   * @param params - Query parameters for filtering events.
   * @returns A paginated list of audit events.
   */
  async listEvents(params?: ListAuditEventsParams): Promise<PaginatedList<AuditEvent>> {
    return this.http.get<PaginatedList<AuditEvent>>(
      '/audit/events',
      params ? { query: toQuery(params) } : undefined,
    );
  }

  /**
   * Retrieve a single audit event by its ID.
   *
   * @param eventId - The unique identifier of the audit event.
   * @returns The audit event.
   */
  async getEvent(eventId: string): Promise<AuditEvent> {
    return this.http.get<AuditEvent>(`/audit/events/${eventId}`);
  }

  /**
   * Generate an audit report for a date range.
   *
   * @param params - Report generation parameters.
   * @returns The generated audit report.
   */
  async generateReport(params: GenerateReportParams): Promise<AuditReport> {
    return this.http.post<AuditReport>('/audit/reports', { body: params });
  }

  /**
   * Retrieve aggregated audit metrics.
   *
   * @param params - Metrics query parameters.
   * @returns Aggregated audit metrics.
   */
  async getMetrics(params: AuditMetricsParams): Promise<AuditMetrics> {
    return this.http.get<AuditMetrics>('/audit/metrics', { query: toQuery(params) });
  }
}
