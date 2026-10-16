import { describe, it, expect, beforeEach } from 'vitest';
import { usePlayerStore } from '@/stores/playerStore';
import { rateCoordinator } from '@/lib/playbackRateCoordinator';
import { AudioItem, Episode } from '@/types';

const mockAudio: AudioItem = {
  id: 1,
  youtubeVideoId: 'test1234567',
  youtubeUrl: 'https://youtube.com/watch?v=test1234567',
  title: 'Test Truyện Audio',
  author: 'Test Tác Giả',
  categoryId: 1,
  thumbnailUrl: 'https://img.youtube.com/vi/test/hqdefault.jpg',
  totalDurationSeconds: 14400,
  totalEpisodes: 1,
  episodes: [
    {
      id: 101,
      episodeNumber: 1,
      title: 'Tập 1',
      startSeconds: 0,
      endSeconds: 14400,
      duration: 14400,
    },
  ],
};

const mockEpisode: Episode = {
  id: 101,
  episodeNumber: 1,
  title: 'Tập 1',
  startSeconds: 0,
  endSeconds: 14400,
  duration: 14400,
};

describe('Player Store', () => {
  beforeEach(() => {
    usePlayerStore.getState().reset();
  });

  it('initializes with default values', () => {
    const state = usePlayerStore.getState();
    expect(state.currentAudio).toBeNull();
    expect(state.currentEpisode).toBeNull();
    expect(state.isPlaying).toBe(false);
    expect(state.playbackRate).toBe(1.0);
    expect(state.currentTime).toBe(0);
  });

  it('plays audio and sets current episode', () => {
    usePlayerStore.getState().play(mockAudio, mockEpisode, 100);
    const state = usePlayerStore.getState();

    expect(state.currentAudio).toEqual(mockAudio);
    expect(state.currentEpisode).toEqual(mockEpisode);
    expect(state.isPlaying).toBe(true);
    expect(state.currentTime).toBe(100);
  });

  it('toggles play/pause correctly', () => {
    usePlayerStore.getState().play(mockAudio, mockEpisode);
    expect(usePlayerStore.getState().isPlaying).toBe(true);

    usePlayerStore.getState().togglePlay();
    expect(usePlayerStore.getState().isPlaying).toBe(false);

    usePlayerStore.getState().togglePlay();
    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });

  it('seeks to valid timestamp and clamps correctly', () => {
    usePlayerStore.getState().play(mockAudio, mockEpisode);

    usePlayerStore.getState().seekTo(500);
    expect(usePlayerStore.getState().currentTime).toBe(500);

    // Clamps to max duration
    usePlayerStore.getState().seekTo(20000);
    expect(usePlayerStore.getState().currentTime).toBe(14400);

    // Clamps to min 0
    usePlayerStore.getState().seekTo(-50);
    expect(usePlayerStore.getState().currentTime).toBe(0);
  });

  it('changes playback speed and cycles correctly', () => {
    usePlayerStore.getState().setPlaybackRate(1.5);
    expect(usePlayerStore.getState().playbackRate).toBe(1.5);

    usePlayerStore.getState().cycleSpeed();
    expect(usePlayerStore.getState().playbackRate).toBe(2.0);
  });

  it('sets and clears sleep timer', () => {
    usePlayerStore.getState().setSleepTimer(15);
    expect(usePlayerStore.getState().sleepTimerMinutes).toBe(15);

    usePlayerStore.getState().setSleepTimer(null);
    expect(usePlayerStore.getState().sleepTimerMinutes).toBeNull();
  });

  it('closes player and clears active audio', () => {
    usePlayerStore.getState().play(mockAudio, mockEpisode);
    usePlayerStore.getState().close();

    const state = usePlayerStore.getState();
    expect(state.currentAudio).toBeNull();
    expect(state.currentEpisode).toBeNull();
    expect(state.isPlaying).toBe(false);
  });

  it('automatically resolves current episode and position when play is called without explicit episode', () => {
    const multiEpAudio: AudioItem = {
      ...mockAudio,
      id: 2,
      currentEpisodeNumber: 2,
      currentEpisodeId: 202,
      lastPositionSeconds: 1500,
      totalEpisodes: 3,
      episodes: [
        { id: 201, episodeNumber: 1, title: 'Tập 1', startSeconds: 0, endSeconds: 14400, duration: 14400 },
        { id: 202, episodeNumber: 2, title: 'Tập 2', startSeconds: 14400, endSeconds: 28800, duration: 14400 },
        { id: 203, episodeNumber: 3, title: 'Tập 3', startSeconds: 28800, endSeconds: 43200, duration: 14400 },
      ],
    };

    usePlayerStore.getState().play(multiEpAudio);
    const state = usePlayerStore.getState();
    expect(state.currentEpisode?.episodeNumber).toBe(2);
    expect(state.currentEpisode?.id).toBe(202);
    expect(state.currentTime).toBe(1500);
  });

  it('supports 0.5x, 1.0x, 1.5x, and 2.0x playback rates', () => {
    const store = usePlayerStore.getState();
    store.setPlaybackRate(0.5);
    expect(usePlayerStore.getState().playbackRate).toBe(0.5);

    store.setPlaybackRate(1.0);
    expect(usePlayerStore.getState().playbackRate).toBe(1.0);

    store.setPlaybackRate(1.5);
    expect(usePlayerStore.getState().playbackRate).toBe(1.5);

    store.setPlaybackRate(2.0);
    expect(usePlayerStore.getState().playbackRate).toBe(2.0);
  });

  it('preserves user selected playback rate when changing to another audio', () => {
    const store = usePlayerStore.getState();
    // User chọn x2 khi đang nghe audio 1
    store.play(mockAudio, mockEpisode);
    store.setPlaybackRate(2.0, 101);
    expect(usePlayerStore.getState().playbackRate).toBe(2.0);

    // Chuyển sang audio 2
    const secondAudio: AudioItem = {
      ...mockAudio,
      id: 99,
      youtubeVideoId: 'video_second_999',
      title: 'Audio Số Hai',
      episodes: [
        { id: 991, episodeNumber: 1, title: 'Tập 1', startSeconds: 0, endSeconds: 7200, duration: 7200 },
      ],
    };

    store.play(secondAudio);
    // Tốc độ phải được giữ nguyên là 2.0x, KHÔNG bị reset về 1.0!
    expect(usePlayerStore.getState().playbackRate).toBe(2.0);
  });

  it('persists and restores playback rate per user account', () => {
    const store = usePlayerStore.getState();
    // User A (id: 1) chọn 2.0x
    store.setPlaybackRate(2.0, 1);
    expect(usePlayerStore.getState().playbackRate).toBe(2.0);

    // User B (id: 2) chọn 1.5x
    store.setPlaybackRate(1.5, 2);
    expect(usePlayerStore.getState().playbackRate).toBe(1.5);

    // Khi User A đăng nhập lại (hoặc đổi sang User A), khôi phục lại 2.0x
    store.syncUserPlaybackRate(1);
    expect(usePlayerStore.getState().playbackRate).toBe(2.0);

    // Khi chuyển lại User B, khôi phục lại 1.5x
    store.syncUserPlaybackRate(2);
    expect(usePlayerStore.getState().playbackRate).toBe(1.5);
  });

  it('preserves user selected speed when auth finishes asynchronously (race condition fix)', () => {
    const store = usePlayerStore.getState();
    // 1. Giả lập người dùng vừa load trang, auth chưa xong (userId = undefined)
    // Người dùng nhanh tay click chọn tốc độ x2
    store.setPlaybackRate(2.0, undefined);
    expect(usePlayerStore.getState().playbackRate).toBe(2.0);

    // 2. Chưa đến 1 giây sau, auth hoàn tất lấy được user (id: 77)
    // và gọi syncUserPlaybackRate(77)
    store.syncUserPlaybackRate(77);

    // 3. Khẳng định: Tốc độ x2 PHẢI ĐƯỢC GIỮ NGUYÊN, không bị reset về 1.0x!
    expect(usePlayerStore.getState().playbackRate).toBe(2.0);
  });

  it('applies desired rate when player becomes ready later', () => {
    const store = usePlayerStore.getState();
    // 1. User chọn x2 khi chưa có player
    store.setPlaybackRate(2.0);
    expect(store.playbackRate).toBe(2.0);

    // 2. Player ready sau đó
    let rateApplied = 1.0;
    const mockPlayer = {
      setPlaybackRate: (r: number) => { rateApplied = r; },
      getAvailablePlaybackRates: () => [0.5, 1, 1.5, 2],
    };
    store.setYtInstance(mockPlayer);

    // Rate 2.0x phải được chuyển đến player
    expect(rateApplied).toBe(2.0);
  });

  it('re-asserts desired rate when video enters PLAYING state', () => {
    const store = usePlayerStore.getState();
    let rateApplied = 1.0;
    const mockPlayer = {
      setPlaybackRate: (r: number) => { rateApplied = r; },
      getAvailablePlaybackRates: () => [0.5, 1, 1.5, 2],
    };
    store.setYtInstance(mockPlayer);
    store.setPlaybackRate(2.0);

    // Khi nạp video mới (YouTube ngầm reset về 1.0x)
    rateCoordinator.onVideoLoaded('test_vid');
    expect(usePlayerStore.getState().confirmedPlaybackRate).toBe(1.0);

    // Khi video chuyển sang PLAYING (state 1)
    rateCoordinator.onStateChange(1, 'PLAYING');
    expect(rateApplied).toBe(2.0);
  });

  it('switches back from x2 to x1 cleanly and does not flip back', () => {
    const store = usePlayerStore.getState();
    let rateApplied = 1.0;
    const mockPlayer = {
      setPlaybackRate: (r: number) => { rateApplied = r; },
      getAvailablePlaybackRates: () => [0.5, 1, 1.5, 2],
    };
    store.setYtInstance(mockPlayer);
    store.setPlaybackRate(2.0);
    expect(rateApplied).toBe(2.0);

    // User đổi lại về 1.0x
    usePlayerStore.getState().setPlaybackRate(1.0);
    expect(usePlayerStore.getState().playbackRate).toBe(1.0);
    expect(rateApplied).toBe(1.0);

    rateCoordinator.onRateConfirmedByYouTube(1.0);
    expect(usePlayerStore.getState().confirmedPlaybackRate).toBe(1.0);
    expect(usePlayerStore.getState().rateSyncStatus).toBe('synced');
  });

  it('marks rateSyncStatus as applying when sending rate to YouTube player', () => {
    const store = usePlayerStore.getState();
    let rateApplied = 1.0;
    const mockPlayer = {
      setPlaybackRate: (r: number) => { rateApplied = r; },
      getAvailablePlaybackRates: () => [1.0],
    };
    store.setYtInstance(mockPlayer);
    store.setPlaybackRate(2.0);

    expect(rateApplied).toBe(2.0);
    expect(usePlayerStore.getState().rateSyncStatus).toBe('applying');
  });
});
