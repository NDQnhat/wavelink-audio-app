import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { CreateTagPayload } from '@/types';
import { useAuthStore } from '@/stores/authStore';

export function useTags() {
  const { isLive } = useAuthStore();
  return useQuery({
    queryKey: ['tags', isLive],
    queryFn: () => api.tag.getTags(isLive),
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  const { isLive } = useAuthStore();

  return useMutation({
    mutationFn: (payload: CreateTagPayload) => api.tag.createTag(payload, isLive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  const { isLive } = useAuthStore();

  return useMutation({
    mutationFn: (id: number | string) => api.tag.deleteTag(id, isLive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}
