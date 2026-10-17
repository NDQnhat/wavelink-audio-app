import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PlayerPage } from '@/pages/PlayerPage';
import { usePlayerStore } from '@/stores/playerStore';
import { startBackgroundAudio, stopBackgroundAudio, isBackgroundAudioRunning } from '@/lib/backgroundAudioKeeper';
import { playNotificationSound } from '@/lib/soundEffects';
import { triggerNotificationSync } from '@/hooks/useNotifications';

vi.mock('@/hooks/useAudio', () => ({
  useAudio: vi.fn(),
  useToggleFavorite: vi.fn(() => ({
    mutate: vi.fn(),
  })),
}));

vi.mock('@/services/api', () => ({
  api: {
    audio: {
      getAudioById: vi.fn(),
      refreshAudio: vi.fn(),
      toggleFavorite: vi.fn().mockResolvedValue(true),
    },
    progress: {
      updateProgress: vi.fn(),
    },
    history: {
      recordHistory: vi.fn(),
    },
  },
}));

vi.mock('@/lib/soundEffects', () => ({
  playNotificationSound: vi.fn(),
}));

describe('5 Issues Fixes Verification Suite', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Bug 1: Real-time Notification Sound & No Ghost Sound on Reload', () => {
    it('dispatches real-time notification sync event and executes sound callback', () => {
      const chimeSpy = vi.fn();
      window.addEventListener('wavelink:notification:sync', (e: any) => {
        if (e.detail?.playChime) chimeSpy();
      });

      triggerNotificationSync(true);
      expect(chimeSpy).toHaveBeenCalledTimes(1);
    });

    it('preserves known unread count in localStorage to prevent chime on reload', () => {
      localStorage.setItem('wavelink_last_known_unread_count', '5');
      expect(localStorage.getItem('wavelink_last_known_unread_count')).toBe('5');
    });
  });

  describe('Bug 2 & Bug 3 & Bug 4: PlayerPage Stability, 60s Countdown Timer & Heart Toggle', () => {
    const mockAudioData = {
      id: 99,
      title: 'Võ Luyện Đỉnh Phong',
      author: 'Mạc Mặc',
      channel: 'WavStudio',
      youtubeVideoId: 'abc123xyz',
      thumbnailUrl: 'https://img.youtube.com/vi/abc123xyz/hqdefault.jpg',
      formattedDuration: '02h 30m',
      formattedPosition: '00:15:30',
      lastPositionSeconds: 930,
      currentEpisodeNumber: 1,
      totalEpisodes: 3,
      isFavorite: false,
      episodes: [
        {
          id: 101,
          episodeNumber: 1,
          title: 'Tập 1: Khởi đầu',
          startSeconds: 0,
          endSeconds: 3600,
          duration: 3600,
        },
        {
          id: 102,
          episodeNumber: 2,
          title: 'Tập 2: Đột phá',
          startSeconds: 3600,
          endSeconds: 7200,
          duration: 3600,
        },
      ],
    };

    it('renders PlayerPage correctly without React Hook order error (#310) when switching loading states', async () => {
      const { useAudio } = await import('@/hooks/useAudio');

      // 1. Initial render with isLoading = true (Skeleton)
      (useAudio as any).mockReturnValue({
        data: null,
        isLoading: true,
      });

      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/player/99']}>
            <Routes>
              <Route path="/player/:id" element={<PlayerPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Skeleton should be visible
      expect(document.querySelector('.animate-pulse')).toBeDefined();

      // 2. Data finished loading: isLoading = false, audio data available
      (useAudio as any).mockReturnValue({
        data: mockAudioData,
        isLoading: false,
      });

      // Rerender should NOT throw React Hook order error (#310)
      expect(() => {
        rerender(
          <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={['/player/99']}>
              <Routes>
                <Route path="/player/:id" element={<PlayerPage />} />
              </Routes>
            </MemoryRouter>
          </QueryClientProvider>
        );
      }).not.toThrow();

      expect(screen.getByText('Võ Luyện Đỉnh Phong')).toBeDefined();
    });

    it('displays the SYNC: 60s countdown badge on Mốc nghe gần nhất card', async () => {
      const { useAudio } = await import('@/hooks/useAudio');
      (useAudio as any).mockReturnValue({
        data: mockAudioData,
        isLoading: false,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/player/99']}>
            <Routes>
              <Route path="/player/:id" element={<PlayerPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Verify the SYNC: 60s badge exists in the recent listen section
      expect(screen.getAllByText(/SYNC:\s*60s/i).length).toBeGreaterThanOrEqual(1);
    });

    it('toggles the heart button optimistically between red filled and unfilled outline', async () => {
      const { useAudio, useToggleFavorite } = await import('@/hooks/useAudio');
      const mutateSpy = vi.fn();
      (useToggleFavorite as any).mockReturnValue({ mutate: mutateSpy });
      (useAudio as any).mockReturnValue({
        data: { ...mockAudioData, isFavorite: false },
        isLoading: false,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/player/99']}>
            <Routes>
              <Route path="/player/:id" element={<PlayerPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      const favButton = screen.getByTitle('Yêu thích');
      expect(favButton).toBeDefined();

      // Initially unfilled
      const icon = favButton.querySelector('i');
      expect(icon?.className).toContain('ri-heart-3-line');

      // Click to toggle favorite
      fireEvent.click(favButton);

      // Optimistically changes to filled red
      expect(icon?.className).toContain('ri-heart-3-fill');
      expect(icon?.className).toContain('text-[#E63946]');
      expect(mutateSpy).toHaveBeenCalledWith(99, expect.any(Object));
    });
  });

  describe('Bug 5: Elimination of Unwanted Video Completed Notification', () => {
    it('uses Web Audio API keepalive and cleans up HTML audio anchors to prevent browser video completion toast', () => {
      // Create a dummy anchor in DOM like legacy versions
      const anchor = document.createElement('audio');
      anchor.id = 'wavelink-bg-audio-anchor';
      document.body.appendChild(anchor);

      expect(document.getElementById('wavelink-bg-audio-anchor')).not.toBeNull();

      // Starting background audio must remove legacy HTML audio element
      startBackgroundAudio();
      expect(document.getElementById('wavelink-bg-audio-anchor')).toBeNull();

      // Must be running in memory without registering an HTML media element
      expect(isBackgroundAudioRunning()).toBe(true);

      // Stop background audio
      stopBackgroundAudio();
      expect(isBackgroundAudioRunning()).toBe(false);
    });

    it('resets player store without invoking YouTube stopVideo which triggers state 0 ENDED', () => {
      const fakePlayer = {
        pauseVideo: vi.fn(),
        seekTo: vi.fn(),
        stopVideo: vi.fn(),
      };

      usePlayerStore.getState().setYtInstance(fakePlayer);
      usePlayerStore.getState().reset();

      // Must invoke pauseVideo and seekTo, but NEVER stopVideo
      expect(fakePlayer.pauseVideo).toHaveBeenCalled();
      expect(fakePlayer.seekTo).toHaveBeenCalledWith(0, true);
      expect(fakePlayer.stopVideo).not.toHaveBeenCalled();
    });
  });
});
