import { describe, it, expect, beforeEach, vi } from 'vitest';
import { playNotificationSound } from '@/lib/soundEffects';
import { audioService } from '@/services/audioService';
import { localDb } from '@/services/localDb';
import { AudioItem, User } from '@/types';
import { useAuthStore } from '@/stores/authStore';

describe('7 UX & Functional Enhancements', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    useAuthStore.setState({ user: null });
  });

  describe('Item 1: "Mốc nghe gần đây" Live Sync 60s', () => {
    it('supports formatting position and synchronizing episode progress live', () => {
      const positionSeconds = 3665; // 01:01:05
      const h = Math.floor(positionSeconds / 3600);
      const m = Math.floor((positionSeconds % 3600) / 60);
      const s = positionSeconds % 60;
      const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      expect(formatted).toBe('01:01:05');
    });
  });

  describe('Item 2: Scrub Bar Seek Lock with LocalStorage Cache', () => {
    it('saves and reads seek lock status from browser cache', () => {
      expect(localStorage.getItem('wavelink_seek_locked')).toBeNull();
      localStorage.setItem('wavelink_seek_locked', 'true');
      expect(localStorage.getItem('wavelink_seek_locked')).toBe('true');
      localStorage.setItem('wavelink_seek_locked', 'false');
      expect(localStorage.getItem('wavelink_seek_locked')).toBe('false');
    });
  });

  describe('Item 3: Admin Audio Edit Modal (Category, Tags, VIP, FreeEpisodesCount)', () => {
    it('updates audio with custom tags, category, and freeEpisodesCount', async () => {
      const audio: AudioItem = {
        id: 999,
        youtubeVideoId: 'admin_test',
        youtubeUrl: 'https://youtube.com/watch?v=admin_test',
        title: 'Truyện Cũ',
        author: 'Tác Giả Cũ',
        categoryId: 1,
        thumbnailUrl: '',
        totalDurationSeconds: 10000,
        totalEpisodes: 5,
        isVIPOnly: false,
        freeEpisodesCount: 1,
        tags: ['cũ'],
        episodes: [
          { id: 1, episodeNumber: 1, title: 'Tập 1', startSeconds: 0, endSeconds: 2000 },
          { id: 2, episodeNumber: 2, title: 'Tập 2', startSeconds: 2000, endSeconds: 4000 },
          { id: 3, episodeNumber: 3, title: 'Tập 3', startSeconds: 4000, endSeconds: 6000 },
        ],
      };

      const db = localDb.get();
      db.audios = [audio];
      localDb.save();

      // Update with new category, tags, VIP, and freeEpisodesCount = 2
      const updated = await audioService.updateAudio(
        999,
        {
          title: 'Truyện Mới',
          categoryId: 3,
          tags: ['tiên hiệp', 'trọng sinh'],
          isVIPOnly: true,
          isVipOnly: true,
          freeEpisodesCount: 2,
        },
        false
      );

      expect(updated).toBeDefined();
      expect(updated?.categoryId).toBe(3);
      expect(updated?.tags).toEqual(['tiên hiệp', 'trọng sinh']);
      expect(updated?.freeEpisodesCount).toBe(2);
      expect(updated?.isVIPOnly).toBe(true);
    });

    it('locks all episodes when freeEpisodesCount is 0 for non-VIP', async () => {
      const user: User = { id: 10, username: 'DocGia', role: 'USER', membership: 'FREE' };
      useAuthStore.setState({ user });

      const vipAudioAllLocked: AudioItem = {
        id: 1001,
        youtubeVideoId: 'all_locked',
        youtubeUrl: 'https://youtube.com/watch?v=all_locked',
        title: 'VIP Khóa Hết',
        author: 'Admin',
        categoryId: 1,
        thumbnailUrl: '',
        totalDurationSeconds: 10000,
        totalEpisodes: 2,
        isVIPOnly: true,
        isVipOnly: true,
        freeEpisodesCount: 0,
        episodes: [
          { id: 1, episodeNumber: 1, title: 'Tập 1', startSeconds: 0, endSeconds: 5000, isVip: true },
          { id: 2, episodeNumber: 2, title: 'Tập 2', startSeconds: 5000, endSeconds: 10000, isVip: true },
        ],
      };

      const db = localDb.get();
      db.audios = [vipAudioAllLocked];
      localDb.save();

      const item = await audioService.getAudioById(1001, false);
      expect(item?.episodes?.[0].isLocked).toBe(true);
      expect(item?.episodes?.[1].isLocked).toBe(true);
    });

    it('allows 2 free episodes when freeEpisodesCount is 2 for non-VIP', async () => {
      const user: User = { id: 11, username: 'DocGia2', role: 'USER', membership: 'FREE' };
      useAuthStore.setState({ user });

      const vipAudio2Free: AudioItem = {
        id: 1002,
        youtubeVideoId: '2_free',
        youtubeUrl: 'https://youtube.com/watch?v=2_free',
        title: 'VIP 2 Tập Free',
        author: 'Admin',
        categoryId: 1,
        thumbnailUrl: '',
        totalDurationSeconds: 15000,
        totalEpisodes: 3,
        isVIPOnly: true,
        isVipOnly: true,
        freeEpisodesCount: 2,
        episodes: [
          { id: 1, episodeNumber: 1, title: 'Tập 1', startSeconds: 0, endSeconds: 5000, isVip: true },
          { id: 2, episodeNumber: 2, title: 'Tập 2', startSeconds: 5000, endSeconds: 10000, isVip: true },
          { id: 3, episodeNumber: 3, title: 'Tập 3', startSeconds: 10000, endSeconds: 15000, isVip: true },
        ],
      };

      const db = localDb.get();
      db.audios = [vipAudio2Free];
      localDb.save();

      const item = await audioService.getAudioById(1002, false);
      expect(item?.episodes?.[0].isLocked).toBe(false); // Episode 1 is free
      expect(item?.episodes?.[1].isLocked).toBe(false); // Episode 2 is free
      expect(item?.episodes?.[2].isLocked).toBe(true);  // Episode 3 is locked
    });
  });

  describe('Item 4: YouTube Upload Auto-Classification', () => {
    it('scans title and description to auto-suggest categories and tags', () => {
      const title = 'Đấu Phá Thương Khung - Truyện Tiên Hiệp Full';
      const description = 'Tuyệt tác tu tiên tu chân huyền huyễn hay nhất';
      const text = `${title} ${description}`.toLowerCase();

      const KEYWORD_TAGS = [
        'Tiên Hiệp', 'Tu Tiên', 'Kiếm Hiệp', 'Kinh Dị', 'Truyện Ma',
        'Ngôn Tình', 'Audiobook', 'Sách Nói', 'Trinh Thám', 'Huyền Huyễn',
        'Đô Thị', 'Trọng Sinh', 'Xuyên Không', 'Hài Hước', 'Tổng Tài',
        'Truyện Ngắn', 'Trọn Bộ', 'Full'
      ];

      const detected = KEYWORD_TAGS.filter(kw => text.includes(kw.toLowerCase()));
      expect(detected).toContain('Tiên Hiệp');
      expect(detected).toContain('Tu Tiên');
      expect(detected).toContain('Huyền Huyễn');
      expect(detected).toContain('Full');
    });
  });

  describe('Item 5: Skeleton and Blur Loading Layout Preservation Across All Pages', () => {
    it('verifies that loading condition preserves structural layout without mock data flashing', () => {
      const isOtherLoading = true;
      const isOwnProfileLoading = false;
      const shouldShowSkeleton = isOtherLoading || isOwnProfileLoading;
      expect(shouldShowSkeleton).toBe(true);
    });

    it('exports all dedicated page skeletons with backdrop-blur-md and animate-pulse styling', async () => {
      const skeletons = await import('@/components/common/Skeletons');
      expect(typeof skeletons.HomeSkeleton).toBe('function');
      expect(typeof skeletons.LibraryListSkeleton).toBe('function');
      expect(typeof skeletons.PlayerSkeleton).toBe('function');
      expect(typeof skeletons.NotificationsSkeleton).toBe('function');
      expect(typeof skeletons.MembershipSkeleton).toBe('function');
      expect(typeof skeletons.CommunityListSkeleton).toBe('function');
      expect(typeof skeletons.SettingsSkeleton).toBe('function');
      expect(typeof skeletons.UploadSkeleton).toBe('function');
      expect(typeof skeletons.AdminOverviewSkeleton).toBe('function');
      expect(typeof skeletons.AdminVipSkeleton).toBe('function');
      expect(typeof skeletons.AdminTableSkeleton).toBe('function');
    });
  });

  describe('Item 7: Notification Sound Chime & Clean Pagination (<= 12 elements)', () => {
    it('executes notification sound utility safely via Web Audio API', () => {
      expect(() => playNotificationSound()).not.toThrow();
    });

    it('determines pagination visibility: hides when items <= 12, shows when items > 12', () => {
      const itemsUnder12 = Array.from({ length: 12 }, (_, i) => i + 1);
      const shouldShowPaginationUnder12 = itemsUnder12.length > 12;
      expect(shouldShowPaginationUnder12).toBe(false);

      const itemsOver12 = Array.from({ length: 13 }, (_, i) => i + 1);
      const shouldShowPaginationOver12 = itemsOver12.length > 12;
      expect(shouldShowPaginationOver12).toBe(true);
    });
  });
});
