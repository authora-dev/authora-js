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

export interface AuditStreamOptions {
  onEvent: (event: AuditEvent) => void;
  onError?: (error: Error) => void;
  signal?: AbortSignal;
}

export class AuditResource {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly http: HttpClient, baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
  }

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

  async streamEvents(options: AuditStreamOptions): Promise<() => void> {
    const controller = new AbortController();
    const signal = options.signal
      ? AbortSignal.any([options.signal, controller.signal])
      : controller.signal;

    const url = `${this.baseUrl}/audit/stream`;
    const run = async () => {
      try {
        const res = await fetch(url, {
          headers: {
            Accept: 'text/event-stream',
            Authorization: `Bearer ${this.apiKey}`,
          },
          signal,
        });

        if (!res.ok || !res.body) {
          options.onError?.(new Error(`SSE connection failed: ${res.status}`));
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          let eventType = '';
          let data = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              data = line.slice(6);
            } else if (line === '' && data) {
              if (eventType === 'audit') {
                try {
                  options.onEvent(JSON.parse(data) as AuditEvent);
                } catch {}
              }
              eventType = '';
              data = '';
            }
          }
        }
      } catch (err) {
        if (!signal.aborted) {
          options.onError?.(err instanceof Error ? err : new Error(String(err)));
        }
      }
    };

    run();
    return () => controller.abort();
  }
}
