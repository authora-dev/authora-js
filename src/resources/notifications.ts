import type { HttpClient } from '../http.js';
import type {
  ListNotificationsParams,
  MarkAllReadParams,
  Notification,
  UnreadCountParams,
  UnreadCountResult,
} from '../types.js';
import { toQuery } from '../utils.js';

export class NotificationsResource {
  constructor(private readonly http: HttpClient) {}

  async list(params: ListNotificationsParams): Promise<Notification[]> {
    const res = await this.http.get<{ items: Notification[] }>('/notifications', { query: toQuery(params) });
    return res.items ?? (res as unknown as Notification[]);
  }

  async unreadCount(params: UnreadCountParams): Promise<UnreadCountResult> {
    return this.http.get<UnreadCountResult>('/notifications/unread-count', { query: toQuery(params) });
  }

  async markRead(notificationId: string): Promise<Notification> {
    return this.http.patch<Notification>(`/notifications/${notificationId}/read`);
  }

  async markAllRead(params: MarkAllReadParams): Promise<void> {
    await this.http.patch<void>('/notifications/read-all', { body: params });
  }
}
