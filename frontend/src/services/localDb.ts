import { AudioItem, Category, Tag, SystemStats, ListeningHistoryItem, Episode } from '@/types';
import { formatTime, formatDuration } from '@/lib/utils';

export interface LocalDbSchema {
  systemStats: Partial<SystemStats>;
  categories: Category[];
  tags: Tag[];
  audios: AudioItem[];
  recentHistory: ListeningHistoryItem[];
}

const DB_KEY = 'audio_library_db';

class LocalDbManager {
  private db: LocalDbSchema | null = null;
  private isLoaded = false;

  async init(): Promise<LocalDbSchema> {
    if (this.isLoaded && this.db) return this.db;

    try {
      const cached = typeof localStorage !== 'undefined' ? localStorage.getItem(DB_KEY) : null;
      if (cached) {
        this.db = JSON.parse(cached);
      } else {
        const res = await fetch('./data/db.json');
        if (res.ok) {
          this.db = await res.json();
          this.save();
        } else {
          throw new Error('Failed to fetch db.json');
        }
      }
    } catch {
      this.db = {
        systemStats: { totalAudios: 0, listeningCount: 0, completedCount: 0, totalHoursListened: 0 },
        categories: [
          { id: 1, name: 'Tiên hiệp', slug: 'tien-hiep' },
          { id: 2, name: 'Huyền huyễn', slug: 'huyen-huyen' },
        ],
        tags: [
          { id: 1, name: 'Tu tiên', slug: 'tu-tien' },
          { id: 2, name: 'Audiobook', slug: 'audiobook' },
        ],
        audios: [],
        recentHistory: [],
      };
    }
    this.isLoaded = true;
    return this.db!;
  }

  get(): LocalDbSchema {
    if (!this.db) {
      const cached = typeof localStorage !== 'undefined' ? localStorage.getItem(DB_KEY) : null;
      if (cached) {
        this.db = JSON.parse(cached);
      } else {
        this.db = { systemStats: {}, categories: [], tags: [], audios: [], recentHistory: [] };
      }
    }
    return this.db!;
  }

  save() {
    if (this.db && typeof localStorage !== 'undefined') {
      localStorage.setItem(DB_KEY, JSON.stringify(this.db));
    }
  }

  clear() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(DB_KEY);
    }
    this.db = null;
    this.isLoaded = false;
  }

  // Helper generators for fallback
  generateEpisodes(totalDuration: number, blockSize: number = 14400, audioId: number = Date.now(), isVip: boolean = false): Episode[] {
    const duration = totalDuration > 0 ? totalDuration : (blockSize > 0 ? blockSize : 3600);
    const count = Math.ceil(duration / blockSize);
    const eps: Episode[] = [];
    for (let i = 0; i < count; i++) {
      const start = i * blockSize;
      const end = Math.min((i + 1) * blockSize, duration);
      eps.push({
        id: Date.now() + i,
        audioId,
        episodeNumber: i + 1,
        title: `Tập ${i + 1} (${formatTime(start)} - ${formatTime(end)})`,
        startSeconds: start,
        endSeconds: end,
        duration: end - start,
        completed: false,
        progressPercent: 0,
        isVip,
      });
    }
    return eps;
  }
}

export const localDb = new LocalDbManager();
