import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { AudioFilter, AudioItem, ImportYouTubePayload } from '@/types';
import { useAuthStore } from '@/stores/authStore';

export function useAudios(filter: AudioFilter = {}) {
  const { isLive, user } = useAuthStore();
  return useQuery({
    queryKey: ['audios', filter, isLive, user?.id],
    queryFn: () => api.audio.getAudios(filter, isLive, user?.id),
  });
}

export function useAudio(id: number | string | undefined) {
  const { isLive } = useAuthStore();
  return useQuery({
    queryKey: ['audio', id, isLive],
    queryFn: () => (id ? api.audio.getAudioById(id, isLive) : null),
    enabled: Boolean(id),
  });
}

export function useAudioEpisodes(audioId: number | string | undefined) {
  const { isLive } = useAuthStore();
  return useQuery({
    queryKey: ['episodes', audioId, isLive],
    queryFn: () => (audioId ? api.episode.getEpisodes(audioId, isLive) : []),
    enabled: Boolean(audioId),
  });
}

export function useImportQuota() {
  const { isLive, user } = useAuthStore();
  return useQuery({
    queryKey: ['import-quota', isLive, user?.id, user?.role, user?.membership],
    queryFn: () => api.audio.getImportQuota(isLive, user),
  });
}

export function useImportYouTube() {
  const queryClient = useQueryClient();
  const { isLive, user } = useAuthStore();

  return useMutation({
    mutationFn: (payload: ImportYouTubePayload) => api.audio.importYouTube(payload, isLive, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audios'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['import-quota'] });
    },
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const { isLive } = useAuthStore();

  return useMutation({
    mutationFn: (audioId: number | string) => api.audio.toggleFavorite(audioId, isLive),
    onMutate: async (audioId) => {
      await queryClient.cancelQueries({ queryKey: ['audio'] });
      await queryClient.cancelQueries({ queryKey: ['audios'] });

      // Optimistically update single audio query cache
      queryClient.setQueriesData({ queryKey: ['audio'] }, (old: any) => {
        if (!old) return old;
        if (String(old.id) === String(audioId)) {
          return { ...old, isFavorite: !old.isFavorite };
        }
        return old;
      });

      // Optimistically update audios list cache
      queryClient.setQueriesData({ queryKey: ['audios'] }, (old: any) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return old.map((a) => (String(a.id) === String(audioId) ? { ...a, isFavorite: !a.isFavorite } : a));
        }
        if (old.data && Array.isArray(old.data)) {
          return {
            ...old,
            data: old.data.map((a: any) =>
              String(a.id) === String(audioId) ? { ...a, isFavorite: !a.isFavorite } : a
            ),
          };
        }
        return old;
      });
    },
    onSuccess: (newStatus, audioId) => {
      if (typeof newStatus === 'boolean') {
        queryClient.setQueriesData({ queryKey: ['audio'] }, (old: any) => {
          if (old && String(old.id) === String(audioId)) {
            return { ...old, isFavorite: newStatus };
          }
          return old;
        });
      }
      queryClient.invalidateQueries({ queryKey: ['audios'] });
      queryClient.invalidateQueries({ queryKey: ['audio'] });
    },
  });
}

export function useUpdateAudio() {
  const queryClient = useQueryClient();
  const { isLive } = useAuthStore();

  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: Partial<AudioItem> }) =>
      api.audio.updateAudio(id, data, isLive),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['audios'] });
      queryClient.invalidateQueries({ queryKey: ['audio', id] });
    },
  });
}

export function useDeleteAudio() {
  const queryClient = useQueryClient();
  const { isLive } = useAuthStore();

  return useMutation({
    mutationFn: (id: number | string) => api.audio.deleteAudio(id, isLive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audios'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}
