// YouTube Audio Engine & Controller: Nhúng YouTube IFrame API thực tế & Đồng bộ tiến trình 60s
import { api } from './api.js';
import { showToast } from './uiUtils.js';

export const player = {
  currentAudio: null,
  currentEpisode: null,
  isPlaying: false,
  currentTime: 0,             // Giây hiện tại trong tập (0 -> episode.duration)
  duration: 14400,            // Thời lượng tập (mặc định 4h)
  playbackRate: 1.0,          // Tốc độ phát (0.75x, 1x, 1.25x, 1.5x, 2.0x)
  
  // YouTube IFrame Player Instance
  ytPlayer: null,
  isYtReady: false,
  ytContainerId: 'yt-audio-host-container',
  
  // Timers & Sync
  pollInterval: null,
  heartbeatInterval: null,
  sleepTimerTimeout: null,
  sleepTimerMinutes: null,
  lastHeartbeatSecond: 0,

  async init() {
    this.ensureYouTubeAPI();
    this.renderMiniPlayer();

    // Lắng nghe phím tắt điều khiển Media Session API trên thiết bị
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => this.togglePlay());
      navigator.mediaSession.setActionHandler('pause', () => this.togglePlay());
      navigator.mediaSession.setActionHandler('seekbackward', () => this.skipSeconds(-15));
      navigator.mediaSession.setActionHandler('seekforward', () => this.skipSeconds(30));
      navigator.mediaSession.setActionHandler('previoustrack', () => this.prevEpisode());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.nextEpisode());
    }
  },

  ensureYouTubeAPI() {
    if (document.getElementById('yt-iframe-script')) return;

    // Tạo container DOM ẩn chứa IFrame
    if (!document.getElementById(this.ytContainerId)) {
      const host = document.createElement('div');
      host.id = this.ytContainerId;
      host.className = 'fixed -top-[9999px] -left-[9999px] w-1 h-1 opacity-0 pointer-events-none overflow-hidden';
      host.innerHTML = `<div id="yt-player-target"></div>`;
      document.body.appendChild(host);
    }

    // Tải script chính thức của YouTube IFrame API
    const tag = document.createElement('script');
    tag.id = 'yt-iframe-script';
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode.insertBefore(tag, firstScript);

    window.onYouTubeIframeAPIReady = () => {
      this.initYTPlayer();
    };

    if (window.YT && window.YT.Player) {
      this.initYTPlayer();
    }
  },

  initYTPlayer() {
    if (this.ytPlayer) return;

    this.ytPlayer = new window.YT.Player('yt-player-target', {
      height: '100',
      width: '100',
      playerVars: {
        playsinline: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        rel: 0,
        modestbranding: 1
      },
      events: {
        onReady: (event) => {
          this.isYtReady = true;
          console.log("🎵 YouTube Audio Engine đã sẵn sàng!");
          if (this.currentAudio && this.isPlaying) {
            this.play(this.currentAudio, this.currentEpisode, this.currentTime);
          }
        },
        onStateChange: (event) => {
          this.handlePlayerStateChange(event.data);
        },
        onError: (event) => {
          this.handlePlayerError(event.data);
        }
      }
    });
  },

  handlePlayerStateChange(state) {
    // YT.PlayerState: -1 UNSTARTED, 0 ENDED, 1 PLAYING, 2 PAUSED, 3 BUFFERING, 5 CUED
    if (state === window.YT?.PlayerState?.PLAYING) {
      this.isPlaying = true;
      this.startPolling();
      this.startHeartbeat();
      this.updateMediaSession(true);
    } else if (state === window.YT?.PlayerState?.PAUSED || state === window.YT?.PlayerState?.ENDED) {
      this.isPlaying = false;
      this.stopPolling();
      this.updateMediaSession(false);
      
      // Nếu video kết thúc mốc tập hoặc kết thúc video gốc
      if (state === window.YT?.PlayerState?.ENDED) {
        this.onEpisodeComplete();
      }
    }
    this.renderMiniPlayer();
    window.dispatchEvent(new CustomEvent('player-change', { detail: this }));
  },

  handlePlayerError(errorCode) {
    let msg = "Lỗi khi phát âm thanh YouTube";
    if (errorCode === 101 || errorCode === 150) {
      msg = "Video này không cho phép nhúng phát bên ngoài YouTube.";
    } else if (errorCode === 100) {
      msg = "Không tìm thấy video hoặc video đã bị gỡ bỏ.";
    }
    showToast(msg, 'error');
    this.isPlaying = false;
    this.renderMiniPlayer();
    window.dispatchEvent(new CustomEvent('player-change', { detail: this }));
  },

  // Phát Audio & Tập
  async play(audio, episode = null, seekSeconds = null) {
    if (!audio) return;

    this.currentAudio = audio;
    if (!episode) {
      episode = audio.episodes && audio.episodes.length > 0 
        ? audio.episodes[0] 
        : { id: 1, episodeNumber: 1, title: 'Tập 1', startSeconds: 0, endSeconds: audio.totalDurationSeconds || 14400, duration: 14400 };
    }
    this.currentEpisode = episode;
    this.duration = episode.duration || (episode.endSeconds - episode.startSeconds) || 14400;

    // Xác định vị trí phát ban đầu trong tập
    let posInEp = 0;
    if (seekSeconds !== null) {
      posInEp = seekSeconds;
    } else if (audio.lastPositionSeconds && audio.currentEpisodeNumber === episode.episodeNumber) {
      posInEp = audio.lastPositionSeconds;
    }
    this.currentTime = Math.max(0, Math.min(posInEp, this.duration));

    const absoluteStart = (episode.startSeconds || 0) + this.currentTime;

    // Load vào YouTube Player
    if (this.isYtReady && this.ytPlayer && typeof this.ytPlayer.loadVideoById === 'function') {
      try {
        this.ytPlayer.loadVideoById({
          videoId: audio.youtubeVideoId,
          startSeconds: absoluteStart
        });
        this.ytPlayer.setPlaybackRate(this.playbackRate);
        this.ytPlayer.playVideo();
        this.isPlaying = true;
      } catch (e) {
        console.warn("YouTube playVideo call error:", e);
      }
    } else {
      // Fallback timer ticker nếu YT API chưa load xong
      this.isPlaying = true;
      this.startPolling();
    }

    this.renderMiniPlayer();
    this.updateMediaSession(true);
    window.dispatchEvent(new CustomEvent('player-change', { detail: this }));
  },

  togglePlay() {
    if (!this.currentAudio) return;

    if (this.isYtReady && this.ytPlayer) {
      if (this.isPlaying) {
        this.ytPlayer.pauseVideo();
      } else {
        this.ytPlayer.playVideo();
      }
    } else {
      this.isPlaying = !this.isPlaying;
      if (this.isPlaying) this.startPolling();
      else this.stopPolling();
      this.renderMiniPlayer();
      window.dispatchEvent(new CustomEvent('player-change', { detail: this }));
    }
  },

  seekTo(posInEpisode) {
    if (!this.currentAudio || !this.currentEpisode) return;

    const clamped = Math.max(0, Math.min(posInEpisode, this.duration));
    this.currentTime = clamped;

    const absoluteTarget = (this.currentEpisode.startSeconds || 0) + clamped;
    if (this.isYtReady && this.ytPlayer && typeof this.ytPlayer.seekTo === 'function') {
      this.ytPlayer.seekTo(absoluteTarget, true);
    }

    this.renderMiniPlayer();
    window.dispatchEvent(new CustomEvent('player-change', { detail: this }));
    this.saveCurrentProgress();
  },

  skipSeconds(delta) {
    this.seekTo(this.currentTime + delta);
  },

  nextEpisode() {
    if (!this.currentAudio || !this.currentAudio.episodes) return;
    const eps = this.currentAudio.episodes;
    const currentIndex = eps.findIndex(e => e.id === this.currentEpisode?.id);
    if (currentIndex !== -1 && currentIndex + 1 < eps.length) {
      this.play(this.currentAudio, eps[currentIndex + 1], 0);
      showToast(`Đang chuyển sang ${eps[currentIndex + 1].title}`, 'info');
    } else {
      showToast('Đã đến tập cuối cùng của truyện!', 'info');
    }
  },

  prevEpisode() {
    if (!this.currentAudio || !this.currentAudio.episodes) return;
    const eps = this.currentAudio.episodes;
    const currentIndex = eps.findIndex(e => e.id === this.currentEpisode?.id);
    if (currentIndex > 0) {
      this.play(this.currentAudio, eps[currentIndex - 1], 0);
      showToast(`Đang quay lại ${eps[currentIndex - 1].title}`, 'info');
    } else {
      this.seekTo(0);
    }
  },

  setPlaybackRate(rate) {
    this.playbackRate = rate;
    if (this.isYtReady && this.ytPlayer && typeof this.ytPlayer.setPlaybackRate === 'function') {
      this.ytPlayer.setPlaybackRate(rate);
    }
    showToast(`Tốc độ phát: ${rate}x`, 'info');
    window.dispatchEvent(new CustomEvent('player-change', { detail: this }));
  },

  cycleSpeed() {
    const speeds = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0];
    const currentIndex = speeds.indexOf(this.playbackRate);
    const nextIndex = (currentIndex + 1) % speeds.length;
    this.setPlaybackRate(speeds[nextIndex]);
  },

  // Hẹn giờ tắt (Sleep Timer)
  setSleepTimer(minutes) {
    if (this.sleepTimerTimeout) clearTimeout(this.sleepTimerTimeout);

    if (minutes === 0 || !minutes) {
      this.sleepTimerTimeout = null;
      this.sleepTimerMinutes = null;
      showToast('Đã hủy hẹn giờ tắt', 'info');
      return;
    }

    this.sleepTimerMinutes = minutes;
    showToast(`Đã hẹn giờ tắt sau ${minutes} phút`, 'success');

    this.sleepTimerTimeout = setTimeout(() => {
      if (this.isPlaying) {
        this.togglePlay();
        showToast('Trình phát đã tự động tắt theo hẹn giờ', 'info');
      }
      this.sleepTimerTimeout = null;
      this.sleepTimerMinutes = null;
    }, minutes * 60 * 1000);
  },

  // Polling vị trí thực từ YouTube API
  startPolling() {
    this.stopPolling();
    this.pollInterval = setInterval(() => {
      if (!this.isPlaying) return;

      if (this.isYtReady && this.ytPlayer && typeof this.ytPlayer.getCurrentTime === 'function') {
        const absTime = this.ytPlayer.getCurrentTime();
        const startSec = this.currentEpisode?.startSeconds || 0;
        const endSec = this.currentEpisode?.endSeconds || this.duration;

        const epPos = Math.round(absTime - startSec);
        if (epPos >= 0) {
          this.currentTime = epPos;
        }

        // Tự động chuyển tập khi chạm mốc kết thúc tập
        if (absTime >= endSec && endSec > startSec) {
          this.onEpisodeComplete();
          return;
        }
      } else {
        // Fallback local ticker
        this.currentTime += 1;
        if (this.currentTime >= this.duration) {
          this.onEpisodeComplete();
          return;
        }
      }

      this.updateProgressUI();
    }, 1000);
  },

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  },

  // Heartbeat lưu tiến trình mỗi 60 giây
  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.isPlaying) {
        this.saveCurrentProgress();
      }
    }, 60000);
  },

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  },

  saveCurrentProgress() {
    if (!this.currentAudio || !this.currentEpisode) return;

    const percent = Math.min(100, Math.round((this.currentTime / this.duration) * 100));
    api.updateProgress(
      this.currentAudio.id,
      this.currentEpisode.id,
      this.currentTime,
      percent
    );

    // Ghi nhật ký nghe nếu đã nghe trên 30s
    if (this.currentTime >= 30) {
      api.recordHistory(this.currentAudio.id, this.currentEpisode.id, this.currentTime);
    }
  },

  onEpisodeComplete() {
    if (!this.currentAudio || !this.currentEpisode) return;

    showToast(`Đã hoàn thành ${this.currentEpisode.title}!`, 'success');
    api.updateProgress(this.currentAudio.id, this.currentEpisode.id, this.duration, 100);

    // Tự động phát tập tiếp theo nếu có
    const eps = this.currentAudio.episodes || [];
    const currentIndex = eps.findIndex(e => e.id === this.currentEpisode.id);
    if (currentIndex !== -1 && currentIndex + 1 < eps.length) {
      setTimeout(() => {
        this.play(this.currentAudio, eps[currentIndex + 1], 0);
      }, 1000);
    } else {
      this.isPlaying = false;
      this.stopPolling();
      this.stopHeartbeat();
      this.renderMiniPlayer();
      window.dispatchEvent(new CustomEvent('player-change', { detail: this }));
    }
  },

  close() {
    if (this.isYtReady && this.ytPlayer) {
      try { this.ytPlayer.pauseVideo(); } catch (e) {}
    }
    this.isPlaying = false;
    this.stopPolling();
    this.stopHeartbeat();
    if (this.sleepTimerTimeout) clearTimeout(this.sleepTimerTimeout);
    this.currentAudio = null;
    this.currentEpisode = null;
    this.currentTime = 0;
    this.renderMiniPlayer();
    window.dispatchEvent(new CustomEvent('player-change', { detail: this }));
  },

  updateMediaSession(playing) {
    if ('mediaSession' in navigator && this.currentAudio) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: this.currentEpisode?.title || this.currentAudio.title,
        artist: this.currentAudio.author || 'YouTube Audio',
        album: this.currentAudio.title,
        artwork: [
          { src: this.currentAudio.thumbnailUrl, sizes: '512x512', type: 'image/jpeg' }
        ]
      });
      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    }
  },

  formatTime(secs) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    const pad = (n) => String(n).padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  },

  updateProgressUI() {
    const percent = Math.min(100, Math.round((this.currentTime / this.duration) * 100));

    // Mini Player bar
    const miniBar = document.getElementById('mini-progress-bar');
    if (miniBar) miniBar.style.width = `${percent}%`;

    // Detail Player slider & labels
    const slider = document.getElementById('audio-slider');
    if (slider && !slider.matches(':active')) {
      slider.value = percent;
    }
    const curLabel = document.getElementById('current-time-label');
    if (curLabel) curLabel.textContent = this.formatTime(this.currentTime);

    const percentLabel = document.getElementById('detail-percent-label');
    if (percentLabel) percentLabel.textContent = `Đã nghe ${percent}%`;
  },

  renderMiniPlayer() {
    const container = document.getElementById('mini-player-container');
    if (!container) return;

    if (!this.currentAudio) {
      container.classList.add('hidden');
      container.innerHTML = '';
      return;
    }

    container.classList.remove('hidden');
    const percent = Math.min(100, Math.round((this.currentTime / this.duration) * 100));

    container.innerHTML = `
      <div class="pointer-events-auto bg-surface-container-lowest/95 backdrop-blur-xl rounded-xl shadow-[0_6px_24px_rgba(15,23,42,0.12)] p-space-sm flex flex-col gap-space-xs border border-surface-container-high/80 max-w-lg mx-auto relative group">
        <div class="flex items-center justify-between gap-space-sm">
          <!-- Thumbnail & Info -->
          <div class="flex items-center gap-space-sm min-w-0 flex-1 cursor-pointer" id="mini-player-open">
            <div class="w-11 h-11 rounded-lg bg-surface-container flex items-center justify-center text-primary-container shrink-0 overflow-hidden shadow-xs relative">
              <img src="${this.currentAudio.thumbnailUrl}" class="w-full h-full object-cover">
              ${this.isPlaying ? `<div class="absolute inset-0 bg-primary/20 backdrop-blur-xs flex items-center justify-center"><span class="w-2 h-2 rounded-full bg-white animate-ping"></span></div>` : ''}
            </div>
            <div class="flex flex-col min-w-0 flex-1">
              <span class="font-label-lg text-label-lg text-on-surface font-bold truncate">${this.currentAudio.title}</span>
              <span class="font-body-sm text-xs text-on-surface-variant truncate">${this.currentEpisode?.title || 'Tập 1'} • <span class="${this.isPlaying ? 'text-primary font-semibold' : ''}">${this.isPlaying ? 'Đang phát' : 'Tạm dừng'}</span></span>
            </div>
          </div>

          <!-- Controls Bar -->
          <div class="flex items-center gap-1 shrink-0">
            <button class="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors" onclick="location.hash='#/player/${this.currentAudio.id}'" title="Mở chi tiết">
              <span class="material-symbols-outlined text-[20px]">expand_less</span>
            </button>
            <button id="mini-play-toggle" class="w-10 h-10 flex items-center justify-center rounded-full bg-primary-container text-on-primary active:scale-90 shadow-sm transition-transform" title="${this.isPlaying ? 'Tạm dừng' : 'Phát tiếp'}">
              <span class="material-symbols-outlined text-[22px]">${this.isPlaying ? 'pause' : 'play_arrow'}</span>
            </button>
            <button id="mini-player-close" class="w-8 h-8 flex items-center justify-center rounded-full text-outline hover:text-error hover:bg-error-container/20 transition-colors ml-0.5" title="Đóng trình phát">
              <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        <!-- Progress Line -->
        <div class="w-full bg-surface-container-high h-1 rounded-full overflow-hidden">
          <div id="mini-progress-bar" class="bg-primary-container h-full rounded-full transition-all duration-300" style="width: ${percent}%"></div>
        </div>
      </div>
    `;

    document.getElementById('mini-player-open')?.addEventListener('click', () => {
      location.hash = `#/player/${this.currentAudio.id}`;
    });

    document.getElementById('mini-play-toggle')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePlay();
    });

    document.getElementById('mini-player-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
    });
  }
};
