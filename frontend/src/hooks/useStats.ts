import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

export function useStats() {
  const { isLive } = useAuthStore();
  return useQuery({
    queryKey: ['stats', isLive],
    queryFn: () => api.stats.getStats(isLive),
  });
}
