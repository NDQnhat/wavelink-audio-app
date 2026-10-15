import { create } from 'zustand';
import { AudioItem, Episode } from '@/types';
import { api } from '@/services/api';

// Global YouTube Player instance reference
declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    YT?: any;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ytPlayerInstance: any = null;
let pollTimer: NodeJS.Timeout | null = null;
let heartbeatTimer: NodeJS.Timeout | null = null;
let sleepTimeout: NodeJS.Timeout | null = null;
let seekDebounceTimer: NodeJS.Timeout | null = null;
let progressDebounceTimer: NodeJS.Timeout | null = null;

let rateEnforceTimeouts: ReturnType<typeof setTimeout>[] = [];

export function getStoredPlaybackRate(userId?: number | string | null): number {
  if (typeof localStorage === 'undefined') return 1.0;
  try {
    if (userId) {
      const userSaved = localStorage.getItem(`comic_audio_user_speed_${userId}`);
      if (userSaved) {
        const parsed = parseFloat(userSaved);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    }
    const globalSaved = localStorage.getItem('comic_audio_preferred_playback_rate');
    if (globalSaved) {
      const parsed = parseFloat(globalSaved);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  } catch {}
  return 1.0;
}

export function persistUserPlaybackRate(rate: number, userId?: number | string | null) {
  if (typeof localStorage === 'undefined') return;
  try {
    const rateStr = String(rate);
    localStorage.setItem('comic_audio_preferred_playback_rate', rateStr);
    if (userId) {
      localStorage.setItem(`comic_audio_user_speed_${userId}`, rateStr);
    }
    localStorage.setItem('comic_audio_current_speed', rateStr);
  } catch {}
}

export function enforcePlaybackRate(rate: number) {
  rateEnforceTimeouts.forEach((t) => clearTimeout(t));
  rateEnforceTimeouts = [];

  const targetRate = parseFloat(String(rate)) || 1.0;

  const apply = () => {
    if (ytPlayerInstance && typeof ytPlayerInstance.setPlaybackRate === 'function') {
      try {
        ytPlayerInstance.setPlaybackRate(targetRate);
      } catch {}
    }
  };

  // Áp dụng ngay lập tức
  apply();

  // Retry theo chuỗi thời gian để YouTube IFrame API chắc chắn nhận lệnh khi chuyển đổi trạng thái
  const delays = [80, 200, 400, 700, 1200, 2000, 3000];
  delays.forEach((delay) => {
    const t = setTimeout(apply, delay);
    rateEnforceTimeouts.push(t);
  });
}

interface PlayerState {
  currentAudio: AudioItem | null;
  currentEpisode: Episode | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  isYtReady: boolean;
  sleepTimerMinutes: number | null;
  isSeeking: boolean;

  // Actions
  play: (audio: AudioItem, episode?: Episode | null, seekSeconds?: number | null) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  seekTo: (seconds: number) => void;
  skipSeconds: (delta: number) => void;
  nextEpisode: () => void;
  prevEpisode: () => void;
  setPlaybackRate: (rate: number, userId?: number | string | null) => void;
  syncUserPlaybackRate: (userId?: number | string | null) => void;
  cycleSpeed: (userId?: number | string | null) => void;
  setSleepTimer: (minutes: number | null) => void;
  close: () => void;
  reset: () => void;
  setYtReady: (ready: boolean) => void;
  setYtInstance: (instance: unknown) => void;
  handleEpisodeComplete: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentAudio: null,
  currentEpisode: null,
  isPlaying: false,
  currentTime: 0,
  duration: 14400,
  playbackRate: getStoredPlaybackRate(),
  isYtReady: false,
  sleepTimerMinutes: null,
  isSeeking: false,

  setYtReady: (isYtReady: boolean) => set({ isYtReady }),

  setYtInstance: (instance: unknown) => {
    ytPlayerInstance = instance;
    set({ isYtReady: true });
    // Củng cố lại tốc độ phát hiện tại khi engine vừa sẵn sàng
    const rate = get().playbackRate || getStoredPlaybackRate() || 1.0;
    enforcePlaybackRate(rate);
  },

  play: (audio: AudioItem, episode = null, seekSeconds = null) => {
    if (!audio) return;

    // 1. Lưu lại tiến trình của tập trước nếu đang đổi sang tập khác hoặc truyện khác
    const prevAudio = get().currentAudio;
    const prevEp = get().currentEpisode;
    const prevTime = get().currentTime;
    const prevDur = get().duration;
    if (prevAudio && prevEp && (prevAudio.id !== audio.id || (episode && prevEp.id !== episode.id))) {
      saveProgressFor(prevAudio, prevEp, prevTime, prevDur);
    }

    // 2. Xác định tập mục tiêu cần phát
    let targetEpisode = episode;
    if (!targetEpisode && audio.episodes && audio.episodes.length > 0) {
      if (audio.currentEpisodeId) {
        targetEpisode = audio.episodes.find((e) => e.id === audio.currentEpisodeId) || null;
      }
      if (!targetEpisode && audio.currentEpisodeNumber) {
        targetEpisode = audio.episodes.find((e) => e.episodeNumber === audio.currentEpisodeNumber) || null;
      }
      if (!targetEpisode) {
        // Tìm tập chưa nghe xong gần nhất hoặc tập 1
        targetEpisode =
          audio.episodes.find((e) => !e.completed && (e.progressPercent || 0) < 95) || audio.episodes[0];
      }
    }

    if (!targetEpisode) {
      targetEpisode = {
        id: audio.currentEpisodeId || 1,
        episodeNumber: audio.currentEpisodeNumber || 1,
        title: audio.currentEpisodeTitle || 'Tập 1',
        startSeconds: 0,
        endSeconds: audio.totalDurationSeconds || 14400,
        duration: audio.totalDurationSeconds || 14400,
      };
    }

    const duration =
      targetEpisode.duration || (targetEpisode.endSeconds - targetEpisode.startSeconds) || 14400;

    // 3. Xác định vị trí phát (seekSeconds)
    let posInEp = 0;
    if (seekSeconds !== null && seekSeconds !== undefined) {
      posInEp = seekSeconds;
    } else if (
      audio.lastPositionSeconds &&
      (audio.currentEpisodeNumber === targetEpisode.episodeNumber ||
        audio.currentEpisodeId === targetEpisode.id ||
        !audio.currentEpisodeNumber)
    ) {
      posInEp = audio.lastPositionSeconds;
    } else if (targetEpisode.positionSeconds) {
      posInEp = targetEpisode.positionSeconds;
    }
    const currentTime = Math.max(0, Math.min(posInEp, duration));
    const absoluteStart = (targetEpisode.startSeconds || 0) + currentTime;

    const activeRate = get().playbackRate || getStoredPlaybackRate() || 1.0;

    set({
      currentAudio: audio,
      currentEpisode: targetEpisode,
      currentTime,
      duration,
      isPlaying: true,
      playbackRate: activeRate,
    });

    if (ytPlayerInstance && typeof ytPlayerInstance.loadVideoById === 'function') {
      try {
        ytPlayerInstance.loadVideoById({
          videoId: audio.youtubeVideoId,
          startSeconds: absoluteStart,
        });
        ytPlayerInstance.playVideo();
        enforcePlaybackRate(activeRate);
      } catch (err) {
        console.warn('YouTube playVideo call error:', err);
      }
    }

    // Lưu ngay vị trí bắt đầu của tập mới để ghi nhận tập đang nghe mới nhất
    saveProgressFor(audio, targetEpisode, currentTime, duration);

    startPolling();
    startHeartbeat();
    updateMediaSession(true, audio, targetEpisode);
  },

  togglePlay: () => {
    const { isPlaying, currentAudio } = get();
    if (!currentAudio) return;

    if (ytPlayerInstance) {
      try {
        if (isPlaying) {
          ytPlayerInstance.pauseVideo();
        } else {
          ytPlayerInstance.playVideo();
          enforcePlaybackRate(get().playbackRate || 1.0);
        }
      } catch {
        // Fallback
      }
    }

    const nextPlaying = !isPlaying;
    set({ isPlaying: nextPlaying });
    if (nextPlaying) {
      startPolling();
      startHeartbeat();
    } else {
      saveCurrentProgress();
      stopPolling();
      stopHeartbeat();
    }
    updateMediaSession(nextPlaying, currentAudio, get().currentEpisode);
  },

  pause: () => {
    saveCurrentProgress();
    if (ytPlayerInstance) {
      try {
        ytPlayerInstance.pauseVideo();
      } catch {
        // Ignore
      }
    }
    set({ isPlaying: false });
    stopPolling();
    stopHeartbeat();
    updateMediaSession(false, get().currentAudio, get().currentEpisode);
  },

  resume: () => {
    const activeRate = get().playbackRate || getStoredPlaybackRate() || 1.0;
    if (ytPlayerInstance) {
      try {
        ytPlayerInstance.playVideo();
        enforcePlaybackRate(activeRate);
      } catch {
        // Ignore
      }
    }
    set({ isPlaying: true });
    startPolling();
    startHeartbeat();
    updateMediaSession(true, get().currentAudio, get().currentEpisode);
  },

  seekTo: (seconds: number) => {
    const { currentEpisode, duration, playbackRate } = get();
    if (!currentEpisode) return;

    const clamped = Math.max(0, Math.min(seconds, duration));
    set({ currentTime: clamped, isSeeking: true });

    if (seekDebounceTimer) clearTimeout(seekDebounceTimer);
    seekDebounceTimer = setTimeout(() => {
      set({ isSeeking: false });
    }, 1200);

    const absoluteTarget = (currentEpisode.startSeconds || 0) + clamped;
    const activeRate = playbackRate || 1.0;

    if (ytPlayerInstance && typeof ytPlayerInstance.seekTo === 'function') {
      try {
        ytPlayerInstance.seekTo(absoluteTarget, true);
        enforcePlaybackRate(activeRate);
      } catch (err) {
        console.warn('YouTube seekTo error:', err);
      }
    }

    debouncedSaveProgress();
  },

  skipSeconds: (delta: number) => {
    get().seekTo(get().currentTime + delta);
  },

  nextEpisode: () => {
    const { currentAudio, currentEpisode, currentTime, duration } = get();
    if (!currentAudio || !currentAudio.episodes) return;
    if (currentEpisode) {
      saveProgressFor(currentAudio, currentEpisode, currentTime, duration);
    }
    const eps = currentAudio.episodes;
    const currentIndex = eps.findIndex((e) => e.id === currentEpisode?.id);
    if (currentIndex !== -1 && currentIndex + 1 < eps.length) {
      get().play(currentAudio, eps[currentIndex + 1], 0);
    }
  },

  prevEpisode: () => {
    const { currentAudio, currentEpisode, currentTime, duration } = get();
    if (!currentAudio || !currentAudio.episodes) return;
    if (currentEpisode) {
      saveProgressFor(currentAudio, currentEpisode, currentTime, duration);
    }
    const eps = currentAudio.episodes;
    const currentIndex = eps.findIndex((e) => e.id === currentEpisode?.id);
    if (currentIndex > 0) {
      get().play(currentAudio, eps[currentIndex - 1], 0);
    } else {
      get().seekTo(0);
    }
  },

  setPlaybackRate: (rate: number, userId?: number | string | null) => {
    const numRate = parseFloat(String(rate)) || 1.0;
    persistUserPlaybackRate(numRate, userId);
    set({ playbackRate: numRate });
    enforcePlaybackRate(numRate);
  },

  syncUserPlaybackRate: (userId?: number | string | null) => {
    const stored = getStoredPlaybackRate(userId);
    set({ playbackRate: stored });
    enforcePlaybackRate(stored);
  },

  cycleSpeed: (userId?: number | string | null) => {
    const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];
    const current = get().playbackRate || 1.0;
    const currentIndex = speeds.findIndex((s) => Math.abs(s - current) < 0.05);
    const nextIndex = currentIndex === -1 ? 1 : (currentIndex + 1) % speeds.length;
    get().setPlaybackRate(speeds[nextIndex], userId);
  },

  setSleepTimer: (minutes: number | null) => {
    if (sleepTimeout) clearTimeout(sleepTimeout);

    if (!minutes || minutes === 0) {
      sleepTimeout = null;
      set({ sleepTimerMinutes: null });
      return;
    }

    set({ sleepTimerMinutes: minutes });
    sleepTimeout = setTimeout(() => {
      get().pause();
      set({ sleepTimerMinutes: null });
      sleepTimeout = null;
    }, minutes * 60 * 1000);
  },

  close: () => {
    saveCurrentProgress();
    if (ytPlayerInstance) {
      try {
        ytPlayerInstance.pauseVideo();
      } catch {
        // Ignore
      }
    }
    stopPolling();
    stopHeartbeat();
    if (sleepTimeout) clearTimeout(sleepTimeout);
    set({
      currentAudio: null,
      currentEpisode: null,
      isPlaying: false,
      currentTime: 0,
      sleepTimerMinutes: null,
    });
    updateMediaSession(false, null, null);
  },

  reset: () => {
    if (ytPlayerInstance) {
      try {
        ytPlayerInstance.stopVideo?.();
      } catch {
        // Ignore
      }
    }
    stopPolling();
    stopHeartbeat();
    if (sleepTimeout) clearTimeout(sleepTimeout);
    set({
      currentAudio: null,
      currentEpisode: null,
      isPlaying: false,
      currentTime: 0,
      playbackRate: getStoredPlaybackRate(),
      sleepTimerMinutes: null,
    });
    updateMediaSession(false, null, null);
  },

  handleEpisodeComplete: () => {
    const { currentAudio, currentEpisode, duration } = get();
    if (!currentAudio || !currentEpisode) return;

    saveProgressFor(currentAudio, currentEpisode, duration, duration);

    const eps = currentAudio.episodes || [];
    const currentIndex = eps.findIndex((e) => e.id === currentEpisode.id);
    if (currentIndex !== -1 && currentIndex + 1 < eps.length) {
      setTimeout(() => {
        get().play(currentAudio, eps[currentIndex + 1], 0);
      }, 1000);
    } else {
      get().pause();
    }
  },
}));

function startPolling() {
  stopPolling();
  pollTimer = setInterval(pollIntervalHandler, 1000);
}

function pollIntervalHandler() {
  const store = usePlayerStore.getState();
  if (!store.isPlaying) return;

  if (ytPlayerInstance && typeof ytPlayerInstance.getCurrentTime === 'function') {
    // Luôn bảo đảm tốc độ thực của YouTube player đồng bộ chính xác với tốc độ đã chọn
    try {
      if (typeof ytPlayerInstance.getPlaybackRate === 'function') {
        const actualRate = ytPlayerInstance.getPlaybackRate();
        const targetRate = store.playbackRate || 1.0;
        if (typeof actualRate === 'number' && Math.abs(actualRate - targetRate) > 0.05) {
          ytPlayerInstance.setPlaybackRate(targetRate);
        }
      }
    } catch {}

    if (store.isSeeking) return;

    try {
      const absTime = ytPlayerInstance.getCurrentTime();
      const startSec = store.currentEpisode?.startSeconds || 0;
      const endSec = store.currentEpisode?.endSeconds || store.duration;

      const epPos = Math.round(absTime - startSec);
      if (epPos >= 0) {
        usePlayerStore.setState({ currentTime: epPos });
      }

      if (absTime >= endSec && endSec > startSec) {
        store.handleEpisodeComplete();
        return;
      }
    } catch {
      // Ignore
    }
  } else {
    // Local fallback tick
    const next = store.currentTime + 1 * (store.playbackRate || 1);
    if (next >= store.duration) {
      store.handleEpisodeComplete();
    } else {
      usePlayerStore.setState({ currentTime: next });
    }
  }
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    saveCurrentProgress();
  }, 60000);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function debouncedSaveProgress() {
  if (progressDebounceTimer) clearTimeout(progressDebounceTimer);
  progressDebounceTimer = setTimeout(() => {
    saveCurrentProgress();
  }, 500);
}

function saveProgressFor(audio: AudioItem, episode: Episode, currentTime: number, duration: number) {
  if (!audio || !episode) return;

  const dur = duration || episode.duration || (episode.endSeconds - episode.startSeconds) || 14400;
  const percent = Math.min(100, Math.round((currentTime / dur) * 100));
  const isCompleted = percent >= 95;

  api.progress.updateProgress({
    audioId: audio.id,
    episodeId: episode.id,
    positionSeconds: currentTime,
    progressPercent: percent,
    completed: isCompleted,
  });

  // Tính tổng thời lượng tích luỹ qua các tập:
  // (thời lượng của các tập trước) + (thời lượng phát của tập hiện tại)
  const prevDuration = episode.startSeconds || 0;
  const accumulatedDuration = prevDuration + currentTime;

  if (accumulatedDuration >= 10 || currentTime >= 10) {
    api.history.recordHistory({
      audioId: audio.id,
      episodeId: episode.id,
      durationListened: accumulatedDuration,
    });
  }
}

function saveCurrentProgress() {
  const { currentAudio, currentEpisode, currentTime, duration } = usePlayerStore.getState();
  if (!currentAudio || !currentEpisode) return;
  saveProgressFor(currentAudio, currentEpisode, currentTime, duration);
}

// Lắng nghe sự kiện trước khi đóng tab để lưu tiến trình đang nghe
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    saveCurrentProgress();
  });
}

function updateMediaSession(playing: boolean, audio: AudioItem | null, episode: Episode | null) {
  if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
    if (audio) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: episode?.title || audio.title,
        artist: audio.author || 'YouTube Audio',
        album: audio.title,
        artwork: [{ src: audio.thumbnailUrl, sizes: '512x512', type: 'image/jpeg' }],
      });
      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    } else {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
    }
  }
}
