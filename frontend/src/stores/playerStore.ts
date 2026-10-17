import { create } from 'zustand';
import { AudioItem, Episode } from '@/types';
import { api } from '@/services/api';
import { rateCoordinator, RateSyncStatus } from '@/lib/playbackRateCoordinator';
import { playerLogger } from '@/lib/playerLogger';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/components/ui/Toast';
import { startBackgroundAudio, stopBackgroundAudio } from '@/lib/backgroundAudioKeeper';
import { startBackgroundSleepTimer, stopBackgroundSleepTimer } from '@/lib/sleepTimerWorker';

// Global YouTube Player instance reference
declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    YT?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __playerStore?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __measureProgressionRate?: any;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ytPlayerInstance: any = null;
let pollTimer: NodeJS.Timeout | null = null;
let heartbeatTimer: NodeJS.Timeout | null = null;
let sleepTimeout: NodeJS.Timeout | null = null;
let seekDebounceTimer: NodeJS.Timeout | null = null;
let progressDebounceTimer: NodeJS.Timeout | null = null;

let currentPlayerUserId: number | string | null = null;
let lastSpeedChangeTimestamp = 0;
let lastSpeedChangeUserId: number | string | null = null;

export function setCurrentPlayerUserId(userId?: number | string | null) {
  currentPlayerUserId = userId || null;
}

export function getStoredPlaybackRate(userId?: number | string | null): number {
  if (typeof localStorage === 'undefined') return 1.0;
  try {
    const currentSaved = localStorage.getItem('comic_audio_current_speed');
    if (currentSaved) {
      const parsed = parseFloat(currentSaved);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    const globalSaved = localStorage.getItem('comic_audio_preferred_playback_rate');
    if (globalSaved) {
      const parsed = parseFloat(globalSaved);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    const targetId = userId || currentPlayerUserId;
    if (targetId) {
      const userSaved = localStorage.getItem(`comic_audio_user_speed_${targetId}`);
      if (userSaved) {
        const parsed = parseFloat(userSaved);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    }
  } catch {}
  return 1.0;
}

export function persistUserPlaybackRate(rate: number, userId?: number | string | null) {
  if (typeof localStorage === 'undefined') return;
  try {
    const rateStr = String(rate);
    localStorage.setItem('comic_audio_preferred_playback_rate', rateStr);
    localStorage.setItem('comic_audio_current_speed', rateStr);
    const targetId = userId || currentPlayerUserId;
    if (targetId) {
      localStorage.setItem(`comic_audio_user_speed_${targetId}`, rateStr);
    }
  } catch {}
}

export function enforcePlaybackRate(rate: number) {
  rateCoordinator.setDesiredRate(rate, 'enforcePlaybackRate');
}

export async function measureProgressionRate(durationMs: number = 3000): Promise<{
  calculatedRate: number;
  deltaVideoSec: number;
  deltaWallSec: number;
  desiredRate: number;
  confirmedRate: number;
}> {
  const store = usePlayerStore.getState();
  const player = ytPlayerInstance;
  if (!player || typeof player.getCurrentTime !== 'function') {
    throw new Error('Player is not active or getCurrentTime is unavailable');
  }

  const startTime = performance.now();
  const startVideoTime = player.getCurrentTime();

  await new Promise((r) => setTimeout(r, durationMs));

  const endTime = performance.now();
  const endVideoTime = player.getCurrentTime();

  const deltaWallSec = (endTime - startTime) / 1000;
  const deltaVideoSec = endVideoTime - startVideoTime;
  const calculatedRate = deltaVideoSec / deltaWallSec;

  const result = {
    calculatedRate: Math.round(calculatedRate * 100) / 100,
    deltaVideoSec: Math.round(deltaVideoSec * 1000) / 1000,
    deltaWallSec: Math.round(deltaWallSec * 1000) / 1000,
    desiredRate: store.playbackRate,
    confirmedRate: store.confirmedPlaybackRate,
  };

  playerLogger.log({
    instanceId: rateCoordinator.getInstanceId(),
    action: 'MEASURE_PROGRESSION_RATE',
    desiredRate: result.desiredRate,
    confirmedRate: result.confirmedRate,
    details: result,
  });

  return result;
}

interface PlayerState {
  currentAudio: AudioItem | null;
  currentEpisode: Episode | null;
  isPlaying: boolean;
  isExplicitlyPaused: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number; // Desired rate
  confirmedPlaybackRate: number; // Confirmed rate from YouTube onPlaybackRateChange
  rateSyncStatus: RateSyncStatus; // 'synced' | 'applying' | 'unsupported'
  isYtReady: boolean;
  sleepTimerMinutes: number | null;
  sleepTimerEndTimestamp: number | null;
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
  setYtInstance: (instance: unknown, instanceId?: string) => void;
  handleEpisodeComplete: () => void;
}

const initialStoredRate = getStoredPlaybackRate();
rateCoordinator.setDesiredRate(initialStoredRate, 'store_module_init');

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentAudio: null,
  currentEpisode: null,
  isPlaying: false,
  isExplicitlyPaused: true,
  currentTime: 0,
  duration: 14400,
  playbackRate: initialStoredRate,
  confirmedPlaybackRate: initialStoredRate,
  rateSyncStatus: 'synced',
  isYtReady: false,
  sleepTimerMinutes: null,
  sleepTimerEndTimestamp: null,
  isSeeking: false,

  setYtReady: (isYtReady: boolean) => set({ isYtReady }),

  setYtInstance: (instance: unknown, instanceId: string = 'yt-player-host') => {
    ytPlayerInstance = instance;
    set({ isYtReady: true });
    rateCoordinator.attachPlayer(instance, instanceId);

    // Xử lý pending playback: nếu user nhấn play trước khi YouTube iframe khởi tạo xong
    const state = get();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const player = instance as any;
    if (state.currentAudio && state.isPlaying && player && typeof player.loadVideoById === 'function') {
      const ep = state.currentEpisode;
      const startSec = (ep?.startSeconds || 0) + (state.currentTime || 0);
      try {
        player.loadVideoById({
          videoId: state.currentAudio.youtubeVideoId,
          startSeconds: startSec,
        });
        player.playVideo();
      } catch (err) {
        console.warn('Error loading pending video on yt ready:', err);
      }
    }
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

    // Kiểm tra quyền hạn VIP: Tập 1 được nghe thử nếu truyện có >1 tập, tập 2+ hoặc truyện 1 tập yêu cầu tài khoản VIP
    const currentUser = useAuthStore.getState().user;
    const isVipOrAdmin = currentUser?.role === 'VIP' || currentUser?.role === 'ADMIN' || currentUser?.membership === 'VIP';
    const isVipAudio = Boolean(audio.isVIPOnly || audio.isVipOnly || targetEpisode.isVip);
    const totalEps = audio.totalEpisodes || audio.episodes?.length || 1;

    if (isVipAudio && !isVipOrAdmin) {
      if (targetEpisode.episodeNumber > 1 || (targetEpisode.isLocked && targetEpisode.episodeNumber > 1)) {
        if (ytPlayerInstance && typeof ytPlayerInstance.pauseVideo === 'function') {
          try {
            ytPlayerInstance.pauseVideo();
          } catch {}
        }
        stopPolling();
        stopHeartbeat();
        set({ isPlaying: false });
        if (!currentUser || currentUser.isGuest || currentUser.role === 'GUEST') {
          toast.info('Tập VIP yêu cầu đăng nhập tài khoản. Vui lòng đăng nhập để nghe!');
          if (typeof window !== 'undefined') {
            window.location.hash = '#/login';
          }
        } else {
          toast.error('Tập 2 trở đi chỉ dành riêng cho thành viên VIP. Vui lòng nâng cấp gói để tiếp tục nghe!');
          if (typeof window !== 'undefined') {
            window.location.hash = '#/membership';
          }
        }
        return;
      }
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
      isExplicitlyPaused: false,
      playbackRate: activeRate,
    });

    rateCoordinator.onVideoLoaded(audio.youtubeVideoId);

    if (ytPlayerInstance && typeof ytPlayerInstance.loadVideoById === 'function') {
      try {
        ytPlayerInstance.loadVideoById({
          videoId: audio.youtubeVideoId,
          startSeconds: absoluteStart,
        });
        ytPlayerInstance.playVideo();
      } catch (err) {
        console.warn('YouTube playVideo call error:', err);
      }
    }

    // Lưu ngay vị trí bắt đầu của tập mới để ghi nhận tập đang nghe mới nhất
    saveProgressFor(audio, targetEpisode, currentTime, duration);

    startPolling();
    startHeartbeat();
    startBackgroundAudio();
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
          rateCoordinator.applyRate('togglePlay_resume');
        }
      } catch {
        // Fallback
      }
    }

    const nextPlaying = !isPlaying;
    set({ isPlaying: nextPlaying, isExplicitlyPaused: !nextPlaying });
    if (nextPlaying) {
      startPolling();
      startHeartbeat();
      startBackgroundAudio();
    } else {
      saveCurrentProgress();
      stopPolling();
      stopHeartbeat();
      stopBackgroundAudio();
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
    set({ isPlaying: false, isExplicitlyPaused: true });
    stopPolling();
    stopHeartbeat();
    stopBackgroundAudio();
    updateMediaSession(false, get().currentAudio, get().currentEpisode);
  },

  resume: () => {
    if (ytPlayerInstance) {
      try {
        ytPlayerInstance.playVideo();
        rateCoordinator.applyRate('resume_playback');
      } catch {
        // Ignore
      }
    }
    set({ isPlaying: true, isExplicitlyPaused: false });
    startPolling();
    startHeartbeat();
    startBackgroundAudio();
    updateMediaSession(true, get().currentAudio, get().currentEpisode);
  },

  seekTo: (seconds: number) => {
    const { currentEpisode, duration, currentAudio } = get();
    if (!currentEpisode) return;

    const currentUser = useAuthStore.getState().user;
    const isVipOrAdmin = currentUser?.role === 'VIP' || currentUser?.role === 'ADMIN' || currentUser?.membership === 'VIP';
    const isVipAudio = Boolean(currentAudio?.isVIPOnly || currentAudio?.isVipOnly || currentEpisode.isVip);

    let maxAllowed = duration;
    if (isVipAudio && !isVipOrAdmin) {
      maxAllowed = Math.min(duration, (currentEpisode.endSeconds - currentEpisode.startSeconds) || duration);
    }

    const clamped = Math.max(0, Math.min(seconds, maxAllowed));
    set({ currentTime: clamped, isSeeking: true });

    if (seekDebounceTimer) clearTimeout(seekDebounceTimer);
    seekDebounceTimer = setTimeout(() => {
      set({ isSeeking: false });
    }, 1200);

    const absoluteTarget = (currentEpisode.startSeconds || 0) + clamped;

    if (ytPlayerInstance && typeof ytPlayerInstance.seekTo === 'function') {
      try {
        ytPlayerInstance.seekTo(absoluteTarget, true);
        rateCoordinator.applyRate('seekTo_complete');
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
      const nextEp = eps[currentIndex + 1];
      const currentUser = useAuthStore.getState().user;
      const isVipOrAdmin = currentUser?.role === 'VIP' || currentUser?.role === 'ADMIN' || currentUser?.membership === 'VIP';
      const isVipAudio = Boolean(currentAudio.isVIPOnly || currentAudio.isVipOnly || nextEp.isVip);
      if (isVipAudio && !isVipOrAdmin && nextEp.episodeNumber > 1) {
        toast.error('Tập tiếp theo chỉ dành riêng cho thành viên VIP. Vui lòng nâng cấp gói!');
        return;
      }
      get().play(currentAudio, nextEp, 0);
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
    const targetUserId = userId || currentPlayerUserId;
    if (targetUserId) {
      currentPlayerUserId = targetUserId;
    }
    lastSpeedChangeTimestamp = Date.now();
    lastSpeedChangeUserId = targetUserId || null;

    persistUserPlaybackRate(numRate, targetUserId);
    rateCoordinator.setDesiredRate(numRate, 'user_action');
    set({
      playbackRate: numRate,
      confirmedPlaybackRate: rateCoordinator.getConfirmedRate(),
      rateSyncStatus: rateCoordinator.getSyncStatus(),
    });
  },

  syncUserPlaybackRate: (userId?: number | string | null) => {
    if (!userId) return;
    const prevUserId = currentPlayerUserId;
    currentPlayerUserId = userId;

    const isDifferentUser = prevUserId !== null && prevUserId !== undefined && prevUserId !== userId;

    // 1. Nếu người dùng vừa chủ động chọn tốc độ trong vòng 10 giây qua:
    const isRecentManualChange = Date.now() - lastSpeedChangeTimestamp < 10000;
    if (isRecentManualChange && !isDifferentUser) {
      const activeRate = get().playbackRate || 1.0;
      persistUserPlaybackRate(activeRate, userId);
      return;
    }

    const userKey = `comic_audio_user_speed_${userId}`;
    const userSaved = typeof localStorage !== 'undefined' ? localStorage.getItem(userKey) : null;
    if (userSaved) {
      const parsed = parseFloat(userSaved);
      if (!isNaN(parsed) && parsed > 0) {
        // Nếu user này có lưu tốc độ riêng khác 1.0x, HOẶC nếu đây là chuyển đổi rõ ràng giữa 2 user khác nhau:
        if (parsed !== 1.0 || isDifferentUser) {
          rateCoordinator.setDesiredRate(parsed, 'user_account_sync');
          set({
            playbackRate: parsed,
            confirmedPlaybackRate: rateCoordinator.getConfirmedRate(),
            rateSyncStatus: rateCoordinator.getSyncStatus(),
          });
          return;
        }
      }
    }

    // Nếu tài khoản này chưa có cấu hình tốc độ riêng (hoặc chỉ là 1.0 mặc định),
    // thừa kế tốc độ đang hoạt động hiện có thay vì ép hạ về 1.0x
    const activeRate = get().playbackRate || getStoredPlaybackRate() || 1.0;
    persistUserPlaybackRate(activeRate, userId);
  },

  cycleSpeed: (userId?: number | string | null) => {
    const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];
    const current = get().playbackRate || 1.0;
    const currentIndex = speeds.findIndex((s) => Math.abs(s - current) < 0.05);
    const nextIndex = currentIndex === -1 ? 1 : (currentIndex + 1) % speeds.length;
    get().setPlaybackRate(speeds[nextIndex], userId || currentPlayerUserId);
  },

  setSleepTimer: (minutes: number | null) => {
    if (sleepTimeout) {
      clearTimeout(sleepTimeout);
      sleepTimeout = null;
    }
    stopBackgroundSleepTimer();

    if (!minutes || minutes <= 0) {
      set({ sleepTimerMinutes: null, sleepTimerEndTimestamp: null });
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('wavelink_sleep_timer_end');
      }
      return;
    }

    const endTimestamp = Date.now() + minutes * 60 * 1000;
    set({ sleepTimerMinutes: minutes, sleepTimerEndTimestamp: endTimestamp });
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('wavelink_sleep_timer_end', String(endTimestamp));
    }

    const onExpire = () => {
      const store = usePlayerStore.getState();
      if (sleepTimeout) {
        clearTimeout(sleepTimeout);
        sleepTimeout = null;
      }
      stopBackgroundSleepTimer();
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('wavelink_sleep_timer_end');
      }
      usePlayerStore.setState({ sleepTimerMinutes: null, sleepTimerEndTimestamp: null });
      store.pause();
      stopBackgroundAudio();
      toast.info('Đã tự động tắt audio theo hẹn giờ ngủ.');
    };

    sleepTimeout = setTimeout(onExpire, minutes * 60 * 1000);
    startBackgroundSleepTimer(endTimestamp, onExpire);
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
    stopBackgroundAudio();
    stopBackgroundSleepTimer();
    if (sleepTimeout) {
      clearTimeout(sleepTimeout);
      sleepTimeout = null;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('wavelink_sleep_timer_end');
    }
    set({
      currentAudio: null,
      currentEpisode: null,
      isPlaying: false,
      isExplicitlyPaused: true,
      currentTime: 0,
      sleepTimerMinutes: null,
      sleepTimerEndTimestamp: null,
    });
    updateMediaSession(false, null, null);
  },

  reset: () => {
    if (ytPlayerInstance) {
      try {
        ytPlayerInstance.stopVideo?.();
        ytPlayerInstance.pauseVideo?.();
      } catch {
        // Ignore
      }
    }
    stopPolling();
    stopHeartbeat();
    stopBackgroundAudio();
    stopBackgroundSleepTimer();
    if (sleepTimeout) {
      clearTimeout(sleepTimeout);
      sleepTimeout = null;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('wavelink_sleep_timer_end');
    }
    const storedRate = getStoredPlaybackRate();
    rateCoordinator.setDesiredRate(storedRate, 'store_reset');
    set({
      currentAudio: null,
      currentEpisode: null,
      isPlaying: false,
      isExplicitlyPaused: true,
      currentTime: 0,
      playbackRate: storedRate,
      confirmedPlaybackRate: storedRate,
      rateSyncStatus: 'synced',
      sleepTimerMinutes: null,
      sleepTimerEndTimestamp: null,
    });
    updateMediaSession(false, null, null);
  },

  handleEpisodeComplete: () => {
    const { currentAudio, currentEpisode, duration } = get();
    if (!currentAudio || !currentEpisode) return;

    saveProgressFor(currentAudio, currentEpisode, duration, duration);

    const currentUser = useAuthStore.getState().user;
    const isVipOrAdmin = currentUser?.role === 'VIP' || currentUser?.role === 'ADMIN' || currentUser?.membership === 'VIP';
    const isVipAudio = Boolean(currentAudio.isVIPOnly || currentAudio.isVipOnly || currentEpisode.isVip);

    const eps = currentAudio.episodes || [];
    const currentIndex = eps.findIndex((e) => e.id === currentEpisode.id);
    if (currentIndex !== -1 && currentIndex + 1 < eps.length) {
      const nextEp = eps[currentIndex + 1];
      if (isVipAudio && !isVipOrAdmin && nextEp.episodeNumber > 1) {
        if (ytPlayerInstance && typeof ytPlayerInstance.pauseVideo === 'function') {
          try {
            ytPlayerInstance.pauseVideo();
          } catch {}
        }
        stopPolling();
        stopHeartbeat();
        set({ isPlaying: false });
        if (!currentUser || currentUser.isGuest || currentUser.role === 'GUEST') {
          toast.info('Bạn đã nghe xong tập 1 miễn phí. Tập tiếp theo là tập VIP, vui lòng đăng nhập để nghe tiếp!');
          if (typeof window !== 'undefined') {
            window.location.hash = '#/login';
          }
        } else {
          toast.error('Bạn đã xem xong tập 1 nghe thử. Tập 2 trở đi chỉ dành riêng cho thành viên VIP. Vui lòng nâng cấp gói!');
          if (typeof window !== 'undefined') {
            window.location.hash = '#/membership';
          }
        }
        return;
      }
      setTimeout(() => {
        get().play(currentAudio, nextEp, 0);
      }, 1000);
    } else {
      get().pause();
    }
  },
}));

// Đăng ký listener từ coordinator vào store để đồng bộ trạng thái confirmedPlaybackRate
rateCoordinator.subscribe({
  onDesiredRateChange: (rate) => {
    usePlayerStore.setState({ playbackRate: rate });
  },
  onConfirmedRateChange: (rate, status) => {
    usePlayerStore.setState({ confirmedPlaybackRate: rate, rateSyncStatus: status });
  },
});

function startPolling() {
  stopPolling();
  pollTimer = setInterval(pollIntervalHandler, 1000);
}

let watchdogDesyncCounter = 0;

function pollIntervalHandler() {
  const store = usePlayerStore.getState();
  if (!store.isPlaying) {
    watchdogDesyncCounter = 0;
    return;
  }

  // Kiểm tra sleep timer theo mốc thời gian tuyệt đối (chạy nền đồng thời chuẩn xác)
  if (store.sleepTimerEndTimestamp && Date.now() >= store.sleepTimerEndTimestamp) {
    if (sleepTimeout) {
      clearTimeout(sleepTimeout);
      sleepTimeout = null;
    }
    stopBackgroundSleepTimer();
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('wavelink_sleep_timer_end');
    }
    usePlayerStore.setState({ sleepTimerMinutes: null, sleepTimerEndTimestamp: null });
    store.pause();
    stopBackgroundAudio();
    toast.info('Đã tự động tắt audio theo hẹn giờ ngủ.');
    return;
  }

  if (ytPlayerInstance && typeof ytPlayerInstance.getCurrentTime === 'function') {
    // Watchdog Guard: Luôn bảo đảm tốc độ thực của YouTube player đồng bộ chính xác với tốc độ đã chọn
    try {
      const ytState = typeof ytPlayerInstance.getPlayerState === 'function' ? ytPlayerInstance.getPlayerState() : null;
      // Chỉ watchdog khi player thực sự đang ở trạng thái PLAYING (state 1) và coordinator không đang bận retry
      if (ytState === 1 && !rateCoordinator.isBusyApplying()) {
        const actualRate = ytPlayerInstance.getPlaybackRate();
        const targetRate = store.playbackRate || 1.0;
        if (typeof actualRate === 'number' && Math.abs(actualRate - targetRate) > 0.05) {
          watchdogDesyncCounter++;
          // Cần xác nhận lệch liên tục ít nhất 2 lần poll (2 giây) khi đang phát ổn định để tránh bão retry
          if (watchdogDesyncCounter >= 2) {
            watchdogDesyncCounter = 0;
            rateCoordinator.applyRate('watchdog_poll_desync');
          }
        } else {
          watchdogDesyncCounter = 0;
        }
      } else {
        watchdogDesyncCounter = 0;
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
        const currentUser = useAuthStore.getState().user;
        const isVipOrAdmin = currentUser?.role === 'VIP' || currentUser?.role === 'ADMIN' || currentUser?.membership === 'VIP';
        const isVipAudio = Boolean(store.currentAudio?.isVIPOnly || store.currentAudio?.isVipOnly || store.currentEpisode?.isVip);
        if (isVipAudio && !isVipOrAdmin) {
          try {
            ytPlayerInstance.pauseVideo();
            ytPlayerInstance.seekTo(endSec, true);
          } catch {}
        }
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

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    saveCurrentProgress();
  });
  window.__playerStore = usePlayerStore;
  window.__measureProgressionRate = measureProgressionRate;
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
