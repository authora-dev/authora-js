import type { HttpClient } from '../http.js';
import type {
  ListNotificationsParams,
  MarkAllReadParams,
  Notification,
  UnreadCountParams,
  UnreadCountResult,
} from '../types.js';
import { toQuery } from '../utils.js';

/**
 * Resource class for managing user notifications.
 */
export class NotificationsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * List notifications with optional filters.
   *
   * @param params - Query parameters including organizationId and optional filters.
   * @returns Array of notifications.
   */
  async list(params: ListNotificationsParams): Promise<Notification[]> {
    const res = await this.http.get<{ items: Notification[] }>('/notifications', { query: toQuery(params) });
    return res.items ?? (res as unknown as Notification[]);
  }

  /**
   * Get the count of unread notifications.
   *
   * @param params - Query parameters including organizationId.
   * @returns The unread notification count.
   */
  async unreadCount(params: UnreadCountParams): Promise<UnreadCountResult> {
    return this.http.get<UnreadCountResult>('/notifications/unread-count', { query: toQuery(params) });
  }

  /**
   * Mark a single notification as read.
   *
   * @param notificationId - The unique identifier of the notification.
   * @returns The updated notification.
   */
  async markRead(notificationId: string): Promise<Notification> {
    return this.http.patch<Notification>(`/notifications/${notificationId}/read`);
  }

  /**
   * Mark all notifications as read for an organization (and optionally a user).
   *
   * @param params - Parameters including organizationId and optional userId.
   */
  async markAllRead(params: MarkAllReadParams): Promise<void> {
    await this.http.patch<void>('/notifications/read-all', { body: params });
  }
}
