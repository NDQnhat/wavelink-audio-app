import { axiosClient } from '@/lib/axiosClient';
import { NotificationItem, NotificationPreferences } from '@/types';

export const notificationService = {
  async getNotifications(isLive = true): Promise<NotificationItem[]> {
    if (isLive) {
      try {
        const res = await axiosClient.get<{ success: boolean; data: NotificationItem[] }>('/notifications');
        if (res.data.success && Array.isArray(res.data.data)) {
          return res.data.data;
        }
      } catch (err) {
        console.warn('getNotifications failed:', err);
      }
    }
    return [];
  },

  async getUnreadCount(isLive = true): Promise<number> {
    if (isLive) {
      try {
        const res = await axiosClient.get<{ success: boolean; data: { count: number } }>('/notifications/unread-count');
        if (res.data.success && res.data.data) {
          return res.data.data.count || 0;
        }
      } catch (err) {
        console.warn('getUnreadCount failed:', err);
      }
    }
    return 0;
  },

  async markAsRead(id: number | string, isLive = true): Promise<boolean> {
    if (isLive) {
      try {
        const res = await axiosClient.put<{ success: boolean }>(`/notifications/${id}/read`);
        return Boolean(res.data.success);
      } catch {
        return false;
      }
    }
    return false;
  },

  async markAllAsRead(isLive = true): Promise<boolean> {
    if (isLive) {
      try {
        const res = await axiosClient.put<{ success: boolean }>('/notifications/read-all');
        return Boolean(res.data.success);
      } catch {
        return false;
      }
    }
    return false;
  },

  async getPreferences(isLive = true): Promise<NotificationPreferences> {
    if (isLive) {
      try {
        const res = await axiosClient.get<{ success: boolean; data: NotificationPreferences }>(
          '/notifications/preferences'
        );
        if (res.data.success && res.data.data) {
          return res.data.data;
        }
      } catch {
        // Fallback
      }
    }
    return { notifyNewEpisodes: true, notifyMembership: true, notifySystem: true };
  },

  async updatePreferences(prefs: NotificationPreferences, isLive = true): Promise<boolean> {
    if (isLive) {
      try {
        const res = await axiosClient.put<{ success: boolean }>('/notifications/preferences', prefs);
        return Boolean(res.data.success);
      } catch {
        return false;
      }
    }
    return false;
  },
};
