import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

export function useRecentHistory() {
  const { isLive, user } = useAuthStore();
  return useQuery({
    queryKey: ['recent-history', isLive, user?.id || 'guest'],
    queryFn: () => api.history.getRecentHistory(isLive),
  });
}
