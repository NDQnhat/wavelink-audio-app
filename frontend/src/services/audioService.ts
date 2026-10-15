import { axiosClient } from '@/lib/axiosClient';
import { AudioItem, AudioFilter, YouTubePreviewData, ImportYouTubePayload, ImportResult } from '@/types';
import { localDb } from './localDb';
import { extractYouTubeId, formatTime, formatDuration } from '@/lib/utils';

export const audioService = {
  async getAudios(filter: AudioFilter = {}, isLive = true, currentUserId?: number): Promise<AudioItem[]> {
    if (isLive) {
      try {
        const params = new URLSearchParams();
        if (filter.search) params.append('search', filter.search);
        if (filter.categoryId) params.append('categoryId', String(filter.categoryId));
        if (filter.status) params.append('status', filter.status);
        if (filter.tag) params.append('tag', filter.tag);
        if (filter.page) params.append('page', String(filter.page));
        if (filter.limit || filter.pageSize) params.append('limit', String(filter.limit || filter.pageSize));
        if (filter.my || filter.status === 'my') params.append('status', 'my');
        if (filter.sort) params.append('sort', filter.sort);

        const res = await axiosClient.get<{ success: boolean; data: AudioItem[] }>(`/audios?${params.toString()}`);
        if (res.data.success && Array.isArray(res.data.data)) {
          const map = new Map<number | string, AudioItem>();
          for (const item of res.data.data) {
            if (!map.has(item.id)) map.set(item.id, item);
          }
          return Array.from(map.values());
        }
      } catch (err) {
        console.warn('getAudios live API failed, fallback to local', err);
      }
    }

    // Local DB fallback
    const db = localDb.get();
    let list = [...(db.audios || [])];

    if (filter.status === 'my' || filter.my) {
      list = list.filter((a) => a.createdBy && a.createdBy === currentUserId);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.author.toLowerCase().includes(q) ||
          (a.tags && a.tags.some((t) => t.toLowerCase().includes(q))) ||
          (a.youtubeVideoId && a.youtubeVideoId.toLowerCase().includes(q))
      );
    }
    if (filter.categoryId) {
      list = list.filter((a) => a.categoryId === filter.categoryId);
    }
    if (filter.tag) {
      list = list.filter((a) => a.tags && a.tags.includes(filter.tag!));
    }
    if (filter.status === 'listening') {
      list = list.filter((a) => (a.progressPercent || 0) > 0 && (a.progressPercent || 0) < 100);
    } else if (filter.status === 'completed') {
      list = list.filter((a) => (a.progressPercent || 0) >= 100);
    } else if (filter.status === 'favorite') {
      list = list.filter((a) => a.isFavorite);
    }

    if (filter.sort === 'popular') {
      list.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
    } else {
      list.sort((a, b) => Number(b.id) - Number(a.id));
    }

    const seenIds = new Set<number | string>();
    return list.filter((a) => {
      if (seenIds.has(a.id)) return false;
      seenIds.add(a.id);
      return true;
    });
  },

  async getAudioById(id: number | string, isLive = true): Promise<AudioItem | null> {
    if (isLive) {
      try {
        const res = await axiosClient.get<{ success: boolean; data: AudioItem }>(`/audios/${id}`);
        if (res.data.success && res.data.data) {
          return res.data.data;
        }
      } catch (err) {
        console.warn('getAudioById live API failed, fallback to local', err);
      }
    }

    const db = localDb.get();
    const item = db.audios.find((a) => String(a.id) === String(id));
    return item || null;
  },

  async updateAudio(id: number | string, data: Partial<AudioItem>, isLive = true): Promise<AudioItem | null> {
    if (isLive) {
      try {
        const res = await axiosClient.put<{ success: boolean; data: AudioItem }>(`/audios/${id}`, data);
        if (res.data.success && res.data.data) {
          return res.data.data;
        }
      } catch (err) {
        console.warn('updateAudio live API failed, fallback to local', err);
      }
    }

    const db = localDb.get();
    const audio = db.audios.find((a) => String(a.id) === String(id));
    if (audio) {
      Object.assign(audio, data);
      localDb.save();
      return audio;
    }
    return null;
  },

  async deleteAudio(id: number | string, isLive = true): Promise<boolean> {
    if (isLive) {
      try {
        const res = await axiosClient.delete<{ success: boolean }>(`/audios/${id}`);
        if (res.data.success) return true;
      } catch (err) {
        console.warn('deleteAudio live API failed, fallback to local', err);
      }
    }

    const db = localDb.get();
    db.audios = db.audios.filter((a) => String(a.id) !== String(id));
    localDb.save();
    return true;
  },

  async refreshAudio(id: number | string, isLive = true): Promise<AudioItem | null> {
    if (isLive) {
      try {
        const res = await axiosClient.post<{ success: boolean; data: AudioItem }>(`/audios/${id}/refresh`);
        if (res.data.success && res.data.data) {
          return res.data.data;
        }
      } catch (err) {
        console.warn('refreshAudio live API failed', err);
      }
    }
    return this.getAudioById(id, isLive);
  },

  async toggleFavorite(audioId: number | string, isLive = true): Promise<boolean> {
    if (isLive) {
      try {
        const res = await axiosClient.post<{ success: boolean; data: { isFavorite: boolean } }>(
          `/favorites/${audioId}/toggle`
        );
        if (res.data.success && res.data.data) {
          return res.data.data.isFavorite;
        }
      } catch (err) {
        console.warn('toggleFavorite live API failed', err);
      }
    }

    const db = localDb.get();
    const audio = db.audios.find((a) => String(a.id) === String(audioId));
    if (audio) {
      audio.isFavorite = !audio.isFavorite;
      localDb.save();
      return audio.isFavorite;
    }
    return false;
  },

  async previewYouTube(url: string, isLive = true): Promise<YouTubePreviewData | null> {
    const videoId = extractYouTubeId(url);
    if (!videoId) return null;

    if (isLive) {
      try {
        const res = await axiosClient.get<{ success: boolean; data: Partial<YouTubePreviewData> }>(
          `/audios/preview-youtube?url=${encodeURIComponent(url)}`
        );
        if (res.data.success && res.data.data) {
          return {
            videoId: res.data.data.videoId || videoId,
            title: res.data.data.title || `Audio YouTube - ${videoId}`,
            author: res.data.data.author || 'YouTube Creator',
            durationSeconds: res.data.data.durationSeconds || 0,
            formattedDuration: res.data.data.formattedDuration || '',
            thumbnailUrl: res.data.data.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          };
        }
      } catch (err) {
        console.warn('previewYouTube live backend failed, fallback to noembed', err);
      }
    }

    try {
      const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
      if (res.ok) {
        const json = await res.json();
        return {
          videoId,
          title: json.title || `Audio YouTube - ${videoId}`,
          author: json.author_name || 'YouTube Creator',
          durationSeconds: 0,
          formattedDuration: '',
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        };
      }
    } catch {
      // Ignore
    }

    return {
      videoId,
      title: `Audio YouTube - ${videoId}`,
      author: 'YouTube Creator',
      durationSeconds: 0,
      formattedDuration: '',
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  },

  async importYouTube(payload: ImportYouTubePayload, isLive = true, currentUserId?: number): Promise<ImportResult> {
    const videoId = extractYouTubeId(payload.url);
    if (!videoId) throw new Error('URL YouTube không hợp lệ!');

    const duration = payload.durationSeconds && payload.durationSeconds > 0 ? payload.durationSeconds : 57600;
    const blockSize = payload.blockSizeSeconds || 14400;

    if (isLive) {
      try {
        const res = await axiosClient.post<{
          success: boolean;
          data: { audio?: AudioItem; duplicate?: boolean } | AudioItem;
          error?: { message?: string };
        }>('/audios/import-youtube', {
          url: payload.url,
          categoryId: payload.categoryId,
          tags: payload.tags || [],
          durationSeconds: duration,
          blockSizeSeconds: blockSize,
          isVipOnly: payload.isVipOnly,
        });

        if (res.data.success) {
          const raw = res.data.data as Record<string, unknown>;
          const audio = (raw.audio || raw) as AudioItem;
          const duplicate = Boolean(raw.duplicate);

          if (audio && audio.id) {
            const db = localDb.get();
            const exists = db.audios.find((a) => a.id === audio.id);
            if (!exists) {
              db.audios.unshift(audio);
              localDb.save();
            }
          }
          return { duplicate, audio };
        } else {
          throw new Error(res.data.error?.message || 'Lỗi nhập URL YouTube');
        }
      } catch (err: unknown) {
        const msg = (err as Error).message;
        console.warn('importYouTube live API error, fallback to local:', err);
        if (msg && !msg.includes('Network Error') && !msg.includes('timeout')) throw err;
      }
    }

    // Local fallback
    const db = localDb.get();
    const exists = db.audios.find((a) => a.youtubeVideoId === videoId);
    if (exists) {
      return { duplicate: true, audio: exists };
    }

    const preview = (await this.previewYouTube(payload.url, isLive)) || {
      videoId,
      title: 'Audio mới nhập - ' + videoId,
      author: 'YouTube Creator',
      durationSeconds: duration,
      formattedDuration: formatDuration(duration),
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };

    const cat = db.categories.find((c) => c.id === payload.categoryId) || { id: 1, name: 'Tiên hiệp', slug: 'tien-hiep' };
    const episodes = localDb.generateEpisodes(duration, blockSize);

    const newAudio: AudioItem = {
      id: Date.now(),
      youtubeVideoId: videoId,
      youtubeUrl: payload.url,
      title: preview.title,
      author: preview.author,
      channel: preview.author,
      categoryId: cat.id,
      categoryName: cat.name,
      tags: payload.tags.length ? payload.tags : ['Audiobook', 'Tu tiên'],
      thumbnailUrl: preview.thumbnailUrl,
      totalDurationSeconds: duration,
      formattedDuration: formatDuration(duration),
      totalEpisodes: episodes.length,
      status: 'ACTIVE',
      currentEpisodeNumber: 1,
      currentEpisodeTitle: episodes[0]?.title || 'Tập 1',
      lastPositionSeconds: 0,
      formattedPosition: '00:00:00',
      progressPercent: 0,
      isFavorite: false,
      isVIPOnly: payload.isVipOnly,
      createdBy: currentUserId,
      episodes,
    };

    db.audios.unshift(newAudio);
    if (db.systemStats.totalAudios) db.systemStats.totalAudios++;
    localDb.save();

    return { duplicate: false, audio: newAudio };
  },
};
