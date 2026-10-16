import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { PaymentInfo, MembershipPackage } from '@/types';

export function useMembershipPackages() {
  const { isLive, user } = useAuthStore();
  return useQuery({
    queryKey: ['membership-packages', isLive, user?.id, user?.role, user?.membership],
    queryFn: () => api.membership.getPackages(isLive),
  });
}

export function usePaymentInfo() {
  const { isLive } = useAuthStore();
  return useQuery({
    queryKey: ['payment-info', isLive],
    queryFn: () => api.membership.getPaymentInfo(isLive),
  });
}

export function useUpdatePaymentInfo() {
  const queryClient = useQueryClient();
  const { isLive } = useAuthStore();

  return useMutation({
    mutationFn: (info: PaymentInfo) => api.membership.updatePaymentInfo(info, isLive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-info'] });
      queryClient.invalidateQueries({ queryKey: ['membership-packages'] });
    },
  });
}

export function useUpdatePackages() {
  const queryClient = useQueryClient();
  const { isLive } = useAuthStore();

  return useMutation({
    mutationFn: (packages: MembershipPackage[]) => api.membership.updatePackages(packages, isLive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-packages'] });
    },
  });
}

export function useResetPackages() {
  const queryClient = useQueryClient();
  const { isLive } = useAuthStore();

  return useMutation({
    mutationFn: () => api.membership.resetPackages(isLive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-packages'] });
    },
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
      queryClient.invalidateQueries({ queryKey: ['membership-packages'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['import-quota'] });
    },
  });
}
