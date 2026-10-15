import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

export function useMembershipPackages() {
  const { isLive } = useAuthStore();
  return useQuery({
    queryKey: ['membership-packages', isLive],
    queryFn: () => api.membership.getPackages(isLive),
  });
}

export function useMyMembership() {
  const { isLive, user } = useAuthStore();
  return useQuery({
    queryKey: ['my-membership', isLive, user?.id],
    queryFn: () => api.membership.getMyMembership(isLive),
  });
}

export function useCreateMembershipOrder() {
  const { isLive } = useAuthStore();
  return useMutation({
    mutationFn: (packageId: string) => api.membership.createOrder(packageId, isLive),
  });
}

export function useSimulatePayment() {
  const queryClient = useQueryClient();
  const { isLive, refreshUser } = useAuthStore();

  return useMutation({
    mutationFn: ({ orderCode, status }: { orderCode: string; status: 'SUCCESS' | 'FAILED' }) =>
      api.membership.simulatePayment(orderCode, status, isLive),
    onSuccess: async () => {
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ['my-membership'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}
