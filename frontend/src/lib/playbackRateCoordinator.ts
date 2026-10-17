// frontend/src/lib/playbackRateCoordinator.ts
import { playerLogger } from './playerLogger';

export type RateSyncStatus = 'synced' | 'applying' | 'unsupported';

export interface RateCoordinatorListener {
  onDesiredRateChange: (rate: number) => void;
  onConfirmedRateChange: (rate: number, status: RateSyncStatus) => void;
}

export class PlaybackRateCoordinator {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private player: any = null;
  private instanceId: string = 'none';
  private desiredRate: number = 1.0;
  private confirmedRate: number = 1.0;
  private syncStatus: RateSyncStatus = 'synced';
  private applyTimeouts: ReturnType<typeof setTimeout>[] = [];
  private isPlaying: boolean = false;
  private currentVideoId: string = '';
  private listeners: RateCoordinatorListener[] = [];

  constructor(initialDesiredRate: number = 1.0) {
    let rate = initialDesiredRate;
    if (typeof localStorage !== 'undefined') {
      try {
        const saved =
          localStorage.getItem('comic_audio_preferred_playback_rate') ||
          localStorage.getItem('comic_audio_current_speed') ||
          localStorage.getItem('wavelink_playback_rate') ||
          localStorage.getItem('wavelink_default_playback_rate');
        if (saved) {
          const parsed = parseFloat(saved);
          if (!isNaN(parsed) && parsed > 0) rate = parsed;
        }
      } catch {}
    }
    this.desiredRate = rate;
    this.confirmedRate = rate;
  }

  subscribe(listener: RateCoordinatorListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attachPlayer(player: any, instanceId: string) {
    this.player = player;
    this.instanceId = instanceId;
    playerLogger.log({
      instanceId: this.instanceId,
      action: 'PLAYER_ATTACHED',
      desiredRate: this.desiredRate,
      confirmedRate: this.confirmedRate,
    });

    if (this.desiredRate !== 1.0) {
      this.applyRate('initial_player_attached');
    }
  }

  detachPlayer(instanceId: string) {
    if (this.instanceId === instanceId) {
      this.clearPendingRetries();
      this.player = null;
      this.instanceId = 'none';
      playerLogger.log({
        instanceId,
        action: 'PLAYER_DETACHED',
      });
    }
  }

  getDesiredRate(): number {
    return this.desiredRate;
  }

  getConfirmedRate(): number {
    return this.confirmedRate;
  }

  getSyncStatus(): RateSyncStatus {
    return this.syncStatus;
  }

  getInstanceId(): string {
    return this.instanceId;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getPlayerInstance(): any {
    return this.player;
  }

  setDesiredRate(rate: number, reason: string) {
    const numRate = parseFloat(String(rate)) || 1.0;
    const prevRate = this.desiredRate;
    this.desiredRate = numRate;

    if (Math.abs(this.confirmedRate - numRate) > 0.05) {
      this.syncStatus = 'applying';
    } else {
      this.syncStatus = 'synced';
    }

    this.notifyDesiredRate(numRate);
    this.notifyConfirmedRate(this.confirmedRate, this.syncStatus);

    playerLogger.log({
      instanceId: this.instanceId,
      action: 'USER_DESIRED_RATE_CHANGED',
      reason,
      desiredRate: this.desiredRate,
      confirmedRate: this.confirmedRate,
      details: { prevRate, newRate: numRate },
    });

    this.applyRate(reason);
  }

  onVideoLoaded(videoId: string) {
    this.currentVideoId = videoId;
    // Khi nạp video mới, YouTube IFrame API ngầm đặt lại playbackRate về 1.0
    this.confirmedRate = 1.0;
    this.clearPendingRetries();
    if (Math.abs(this.desiredRate - 1.0) > 0.05) {
      this.syncStatus = 'applying';
    } else {
      this.syncStatus = 'synced';
    }
    this.notifyConfirmedRate(1.0, this.syncStatus);

    playerLogger.log({
      instanceId: this.instanceId,
      action: 'VIDEO_LOADED',
      reason: 'loadVideoById',
      desiredRate: this.desiredRate,
      confirmedRate: 1.0,
      details: { videoId },
    });
  }

  isBusyApplying(): boolean {
    return this.applyTimeouts.length > 0;
  }

  onStateChange(state: number, stateName: string) {
    this.isPlaying = state === 1; // YT.PlayerState.PLAYING
    playerLogger.log({
      instanceId: this.instanceId,
      action: 'STATE_CHANGED',
      playerState: stateName,
      desiredRate: this.desiredRate,
      confirmedRate: this.confirmedRate,
    });

    if (state === 1) {
      // PLAYING state: thời điểm vàng để áp dụng tốc độ thực tế lên audio decoder
      if (this.desiredRate !== 1.0 || Math.abs(this.confirmedRate - this.desiredRate) > 0.05) {
        this.applyRate('video_entered_playing_state');
      }
    }
  }

  onRateConfirmedByYouTube(newRate: number) {
    const prevConfirmed = this.confirmedRate;
    this.confirmedRate = newRate;

    const isMatch = Math.abs(newRate - this.desiredRate) <= 0.05;
    this.syncStatus = isMatch ? 'synced' : 'applying';
    this.notifyConfirmedRate(newRate, this.syncStatus);

    playerLogger.log({
      instanceId: this.instanceId,
      action: 'YOUTUBE_RATE_CONFIRMED',
      desiredRate: this.desiredRate,
      confirmedRate: newRate,
      details: { prevConfirmed, newRate, isMatch },
    });

    if (isMatch) {
      // Đã xác nhận khớp tốc độ mong muốn: xóa ngay mọi retry đang chờ để tránh méo tiếng / rè âm thanh
      this.syncStatus = 'synced';
      this.clearPendingRetries();
    } else {
      // YouTube chỉ tự ý reset về 1.0 trong lúc phát hoặc chuyển app:
      // Tự động cưỡng chế lại tốc độ mong muốn của người dùng ngay lập tức
      if (Math.abs(newRate - 1.0) <= 0.05 && this.desiredRate > 1.0) {
        playerLogger.log({
          instanceId: this.instanceId,
          action: 'RATE_RESET_BY_YOUTUBE_DETECTED',
          reason: `YouTube reset to 1.0x while user desired ${this.desiredRate}x`,
          desiredRate: this.desiredRate,
          confirmedRate: newRate,
        });
        setTimeout(() => {
          this.enforceRateWithRetries(this.desiredRate, 'reassert_after_youtube_reset');
        }, 80);
      }
    }
  }

  enforceRateWithRetries(rate: number, reason: string) {
    const targetRate = parseFloat(String(rate)) || 1.0;
    this.desiredRate = targetRate;
    const isAlreadyConfirmed = Math.abs(this.confirmedRate - targetRate) <= 0.05;
    this.syncStatus = isAlreadyConfirmed ? 'synced' : 'applying';
    this.notifyDesiredRate(targetRate);
    this.notifyConfirmedRate(this.confirmedRate, this.syncStatus);

    if (!this.player || typeof this.player.setPlaybackRate !== 'function') return;

    this.clearPendingRetries();

    const doSetRate = (desc: string) => {
      try {
        if (!this.player || typeof this.player.setPlaybackRate !== 'function') return;

        // Nếu YouTube player đã ở đúng tốc độ targetRate thì dừng ngay, tránh gọi lại gây rè / méo tiếng
        if (
          typeof this.player.getPlaybackRate === 'function' &&
          Math.abs(this.player.getPlaybackRate() - targetRate) <= 0.05
        ) {
          this.confirmedRate = targetRate;
          this.syncStatus = 'synced';
          this.clearPendingRetries();
          return;
        }

        this.player.setPlaybackRate(targetRate);
        playerLogger.log({
          instanceId: this.instanceId,
          action: 'ENFORCE_RATE_ATTEMPT',
          reason: desc,
          desiredRate: targetRate,
        });
      } catch (err) {
        playerLogger.log({
          instanceId: this.instanceId,
          action: 'ENFORCE_RATE_ATTEMPT_ERROR',
          reason: String(err),
        });
      }
    };

    // Áp dụng ngay
    doSetRate(`${reason}_immediate`);

    // Retry an toàn 3 nấc (150ms, 400ms, 800ms) - sẽ tự hủy ngay khi YouTube xác nhận khớp rate
    const delays = [150, 400, 800];
    delays.forEach((delay, idx) => {
      const t = setTimeout(() => {
        doSetRate(`${reason}_delay_${delay}ms_${idx + 1}`);
      }, delay);
      this.applyTimeouts.push(t);
    });
  }

  applyRate(reason: string) {
    if (!this.player || typeof this.player.setPlaybackRate !== 'function') {
      playerLogger.log({
        instanceId: this.instanceId,
        action: 'APPLY_SKIPPED',
        reason: 'Player instance not ready or setPlaybackRate not available',
        desiredRate: this.desiredRate,
      });
      return;
    }

    this.enforceRateWithRetries(this.desiredRate, reason);
  }

  clearPendingRetries() {
    this.applyTimeouts.forEach((t) => clearTimeout(t));
    this.applyTimeouts = [];
  }

  private notifyDesiredRate(rate: number) {
    this.listeners.forEach((l) => l.onDesiredRateChange(rate));
  }

  private notifyConfirmedRate(rate: number, status: RateSyncStatus) {
    this.listeners.forEach((l) => l.onConfirmedRateChange(rate, status));
  }
}

export const rateCoordinator = new PlaybackRateCoordinator();

if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__rateCoordinator = rateCoordinator;
}
