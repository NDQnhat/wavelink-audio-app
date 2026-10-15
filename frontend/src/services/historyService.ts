import { axiosClient } from '@/lib/axiosClient';
import { ListeningHistoryItem, RecordHistoryPayload } from '@/types';
import { localDb } from './localDb';

export const historyService = {
  async getRecentHistory(isLive = true): Promise<ListeningHistoryItem[]> {
    if (isLive) {
      try {
        const res = await axiosClient.get<{ success: boolean; data: ListeningHistoryItem[] }>('/history');
        if (res.data.success && Array.isArray(res.data.data)) {
          return res.data.data;
        }
      } catch (err) {
        console.warn('getRecentHistory live API failed', err);
      }
    }

    const db = localDb.get();
    return db.recentHistory || [];
  },

  async recordHistory(payload: RecordHistoryPayload, isLive = true): Promise<void> {
    if (isLive) {
      try {
        await axiosClient.post('/history', {
          audioId: Number(payload.audioId),
          episodeId: Number(payload.episodeId),
          durationListened: Math.round(payload.durationListened),
        });
      } catch (err) {
        console.warn('recordHistory live API failed', err);
      }
    }
  },
};
