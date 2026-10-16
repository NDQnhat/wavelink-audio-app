import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { NotificationPreferences } from '@/types';
import { useAuthStore } from '@/stores/authStore';

export function useNotifications() {
  const { isLive } = useAuthStore();
  return useQuery({
    queryKey: ['notifications', isLive],
    queryFn: () => api.notification.getNotifications(isLive),
  });
}

export function useUnreadNotificationCount() {
  const { isLive } = useAuthStore();
  return useQuery({
    queryKey: ['unread-notification-count', isLive],
    queryFn: () => api.notification.getUnreadCount(isLive),
    refetchInterval: 30000,
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
