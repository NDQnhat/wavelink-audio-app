import { axiosClient } from '@/lib/axiosClient';
import { SystemStats } from '@/types';
import { localDb } from './localDb';

export const statsService = {
  async getStats(isLive = true): Promise<SystemStats> {
    if (isLive) {
      try {
        const res = await axiosClient.get<{ success: boolean; data: SystemStats }>('/stats');
        if (res.data.success && res.data.data) {
          return res.data.data;
        }
      } catch (err) {
        console.warn('getStats live API failed, fallback to local', err);
      }
    }

    const db = localDb.get();
    const totalAudios = db.audios?.length || 0;
    const listeningCount = db.audios?.filter((a) => (a.progressPercent || 0) > 0 && (a.progressPercent || 0) < 100).length || 0;
    const completedCount = db.audios?.filter((a) => (a.progressPercent || 0) >= 100).length || 0;
    let totalSecs = 0;
    let totalEpisodes = 0;
    db.audios?.forEach((a) => {
      totalSecs += a.lastPositionSeconds || 0;
      totalEpisodes += a.totalEpisodes || a.episodes?.length || 1;
    });

    return {
      totalAudios,
      listeningCount,
      completedCount,
      totalHoursListened: Math.round(totalSecs / 3600),
      totalEpisodes: totalEpisodes || 48,
    };
  },
};
