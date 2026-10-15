import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Category, CreateCategoryPayload } from '@/types';
import { useAuthStore } from '@/stores/authStore';

export function useCategories() {
  const { isLive } = useAuthStore();
  return useQuery({
    queryKey: ['categories', isLive],
    queryFn: () => api.category.getCategories(isLive),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { isLive } = useAuthStore();

  return useMutation({
    mutationFn: (payload: CreateCategoryPayload) => api.category.createCategory(payload, isLive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const { isLive } = useAuthStore();

  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: Partial<Category> }) =>
      api.category.updateCategory(id, data, isLive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const { isLive } = useAuthStore();

  return useMutation({
    mutationFn: (id: number | string) => api.category.deleteCategory(id, isLive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}
