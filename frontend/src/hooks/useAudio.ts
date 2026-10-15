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

export function useImportYouTube() {
  const queryClient = useQueryClient();
  const { isLive, user } = useAuthStore();

  return useMutation({
    mutationFn: (payload: ImportYouTubePayload) => api.audio.importYouTube(payload, isLive, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audios'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const { isLive } = useAuthStore();

  return useMutation({
    mutationFn: (audioId: number | string) => api.audio.toggleFavorite(audioId, isLive),
    onSuccess: (_, audioId) => {
      queryClient.invalidateQueries({ queryKey: ['audios'] });
      queryClient.invalidateQueries({ queryKey: ['audio', audioId] });
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
