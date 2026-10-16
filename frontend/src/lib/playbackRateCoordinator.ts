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
    this.desiredRate = initialDesiredRate;
    this.confirmedRate = initialDesiredRate;
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
      // Đã xác nhận khớp tốc độ mong muốn: xóa toàn bộ retry
      this.clearPendingRetries();
    } else {
      // YouTube chỉ tự ý reset về 1.0 trong lúc đang phát:
      // Tuyệt đối KHÔNG reassert nếu YouTube báo rate khác nhưng desiredRate đang ở 1.0 hoặc không playing
      if (this.isPlaying && Math.abs(newRate - 1.0) <= 0.05 && this.desiredRate > 1.0) {
        playerLogger.log({
          instanceId: this.instanceId,
          action: 'RATE_RESET_BY_YOUTUBE_DETECTED',
          reason: `YouTube reset to 1.0x while user desired ${this.desiredRate}x`,
          desiredRate: this.desiredRate,
          confirmedRate: newRate,
        });
        setTimeout(() => {
          if (this.isPlaying && Math.abs(this.confirmedRate - this.desiredRate) > 0.05) {
            this.applyRate('reassert_after_youtube_reset');
          }
        }, 100);
      }
    }
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

    this.clearPendingRetries();

    const checkYtPlayerRate = () => {
      try {
        if (typeof this.player.getPlaybackRate === 'function') {
          const currentYtRate = this.player.getPlaybackRate();
          if (typeof currentYtRate === 'number' && Math.abs(currentYtRate - this.desiredRate) <= 0.05) {
            this.confirmedRate = currentYtRate;
            this.syncStatus = 'synced';
            this.notifyConfirmedRate(currentYtRate, 'synced');
            this.clearPendingRetries();
            return true;
          }
        }
      } catch {}
      return false;
    };

    const doApply = (attemptReason: string) => {
      try {
        playerLogger.log({
          instanceId: this.instanceId,
          action: 'CALL_SET_PLAYBACK_RATE',
          reason: attemptReason,
          desiredRate: this.desiredRate,
          confirmedRate: this.confirmedRate,
        });

        this.player.setPlaybackRate(this.desiredRate);

        if (this.isPlaying) {
          checkYtPlayerRate();
        }
      } catch (err) {
        playerLogger.log({
          instanceId: this.instanceId,
          action: 'CALL_SET_PLAYBACK_RATE_ERROR',
          reason: String(err),
        });
      }
    };

    // Áp dụng ngay
    doApply(reason);

    // Bounded retries: 3 nấc an toàn (150ms, 400ms, 800ms)
    // Chỉ retry khi player đang PLAYING. Nếu đang buffering hoặc paused, đợi event PLAYING!
    const delays = [150, 400, 800];
    delays.forEach((delay, idx) => {
      const t = setTimeout(() => {
        if (this.isPlaying && Math.abs(this.confirmedRate - this.desiredRate) > 0.05) {
          doApply(`${reason}_retry_${idx + 1}_at_${delay}ms`);

          // Nếu sau lần retry cuối cùng vẫn chưa xác nhận, kiểm tra thêm 1 nhịp sau 300ms:
          if (idx === delays.length - 1) {
            const finalCheckTimeout = setTimeout(() => {
              if (this.isPlaying && Math.abs(this.confirmedRate - this.desiredRate) > 0.05) {
                // Kiểm tra trực tiếp từ player xem có khớp không trước khi kết luận
                if (!checkYtPlayerRate()) {
                  this.syncStatus = 'unsupported';
                  this.notifyConfirmedRate(this.confirmedRate, 'unsupported');
                  playerLogger.log({
                    instanceId: this.instanceId,
                    action: 'RATE_NOT_SUPPORTED_AFTER_RETRIES',
                    reason: `Rate ${this.desiredRate} was not acknowledged by YouTube player`,
                    desiredRate: this.desiredRate,
                    confirmedRate: this.confirmedRate,
                  });
                }
              }
            }, 300);
            this.applyTimeouts.push(finalCheckTimeout);
          }
        }
      }, delay);
      this.applyTimeouts.push(t);
    });
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
