import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { NotificationPreferences } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import { playNotificationSound } from '@/lib/soundEffects';

const LAST_KNOWN_UNREAD_KEY = 'wavelink_last_known_unread_count';

function getInitialKnownUnreadCount(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(LAST_KNOWN_UNREAD_KEY);
    return v !== null ? Number(v) : null;
  } catch {
    return null;
  }
}

let prevUnreadCount: number | null = getInitialKnownUnreadCount();
let isInitialFetch = true;

/**
 * Kích hoạt đồng bộ thông báo thời gian thực và phát chuông ngay lập tức
 */
export function triggerNotificationSync(playChime = true) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('wavelink:notification:sync', { detail: { playChime } }));
  }
}

export function useNotifications() {
  const { isLive } = useAuthStore();
  return useQuery({
    queryKey: ['notifications', isLive],
    queryFn: () => api.notification.getNotifications(isLive),
  });
}

export function useUnreadNotificationCount() {
  const queryClient = useQueryClient();
  const { isLive } = useAuthStore();

  // Lắng nghe sự kiện đồng bộ thông báo thời gian thực từ các component/tab khác
  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<{ playChime?: boolean }>;
      if (customEvent.detail?.playChime) {
        playNotificationSound();
      }
      queryClient.invalidateQueries({ queryKey: ['unread-notification-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    window.addEventListener('wavelink:notification:sync', handleSync);
    return () => window.removeEventListener('wavelink:notification:sync', handleSync);
  }, [queryClient]);

  return useQuery({
    queryKey: ['unread-notification-count', isLive],
    queryFn: async () => {
      const count = await api.notification.getUnreadCount(isLive);
      // Chỉ phát chuông khi có thông báo MỚI phát sinh trong phiên, không kêu khi reload lại trang
      if (!isInitialFetch && prevUnreadCount !== null && count > prevUnreadCount) {
        playNotificationSound();
      }
      isInitialFetch = false;
      prevUnreadCount = count;
      try {
        localStorage.setItem(LAST_KNOWN_UNREAD_KEY, String(count));
      } catch {}
      return count;
    },
    refetchInterval: 8000, // Thăm dò mỗi 8 giây đảm bảo thời gian thực
    refetchOnWindowFocus: true,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  const { isLive } = useAuthStore();

  return useMutation({
    mutationFn: (id: number | string) => api.notification.markAsRead(id, isLive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notification-count'] });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  const { isLive } = useAuthStore();

  return useMutation({
    mutationFn: () => api.notification.markAllAsRead(isLive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notification-count'] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  const { isLive } = useAuthStore();

  return useMutation({
    mutationFn: (id: number | string) => api.notification.deleteNotification(id, isLive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notification-count'] });
    },
  });
}

export function useDeleteAllNotifications() {
  const queryClient = useQueryClient();
  const { isLive } = useAuthStore();

  return useMutation({
    mutationFn: () => api.notification.deleteAllNotifications(isLive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notification-count'] });
    },
  });
}

export function useNotificationPreferences() {
  const { isLive } = useAuthStore();
  return useQuery({
    queryKey: ['notification-preferences', isLive],
    queryFn: () => api.notification.getPreferences(isLive),
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  const { isLive } = useAuthStore();

  return useMutation({
    mutationFn: (prefs: NotificationPreferences) => api.notification.updatePreferences(prefs, isLive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });
}
