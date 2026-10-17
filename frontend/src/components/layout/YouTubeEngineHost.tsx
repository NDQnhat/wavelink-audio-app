import React, { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { rateCoordinator } from '@/lib/playbackRateCoordinator';
import { toast } from '@/components/ui/Toast';
import { startBackgroundAudio } from '@/lib/backgroundAudioKeeper';

export const YouTubeEngineHost: React.FC = () => {
  const setYtInstance = usePlayerStore((s) => s.setYtInstance);
  const handleEpisodeComplete = usePlayerStore((s) => s.handleEpisodeComplete);
  const pause = usePlayerStore((s) => s.pause);
  const resume = usePlayerStore((s) => s.resume);
  const seekTo = usePlayerStore((s) => s.seekTo);
  const skipSeconds = usePlayerStore((s) => s.skipSeconds);
  const prevEpisode = usePlayerStore((s) => s.prevEpisode);
  const nextEpisode = usePlayerStore((s) => s.nextEpisode);
  const playerRef = useRef<any>(null);
  const isInitializingRef = useRef<boolean>(false);
  const instanceIdRef = useRef<string>(`yt-host-${Date.now()}`);

  useEffect(() => {
    const instanceId = instanceIdRef.current;

    // 1. Setup Media Session Handlers cho màn hình khóa (Lock screen) / Action Center của OS
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      const safeSetHandler = (action: MediaSessionAction, handler: MediaSessionActionHandler) => {
        try {
          navigator.mediaSession.setActionHandler(action, handler);
        } catch {}
      };
      safeSetHandler('play', () => resume());
      safeSetHandler('pause', () => pause());
      safeSetHandler('seekbackward', () => skipSeconds(-15));
      safeSetHandler('seekforward', () => skipSeconds(30));
      safeSetHandler('previoustrack', () => prevEpisode());
      safeSetHandler('nexttrack', () => nextEpisode());
      safeSetHandler('seekto', (details) => {
        if (details.seekTime !== undefined && details.seekTime !== null) {
          seekTo(details.seekTime);
        }
      });
    }

    // 2. Load YouTube IFrame Script nếu chưa có
    if (!document.getElementById('yt-iframe-script')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScript = document.getElementsByTagName('script')[0];
      firstScript?.parentNode?.insertBefore(tag, firstScript);
    }

    const initYT = () => {
      if (!window.YT || !window.YT.Player) return;
      if (playerRef.current || isInitializingRef.current) return;
      isInitializingRef.current = true;

      const player = new window.YT.Player('yt-player-target', {
        height: '240',
        width: '320',
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          enablejsapi: 1,
          playsinline: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: () => {
            playerRef.current = player;
            setYtInstance(player, instanceId);
            const targetRate = usePlayerStore.getState().playbackRate || 1.0;
            if (targetRate !== 1.0) {
              rateCoordinator.enforceRateWithRetries(targetRate, 'player_onReady_restore');
            }
          },
          onStateChange: (event: { data: number }) => {
            const state = event.data;
            const stateNames: Record<number, string> = {
              [-1]: 'UNSTARTED',
              0: 'ENDED',
              1: 'PLAYING',
              2: 'PAUSED',
              3: 'BUFFERING',
              5: 'CUED',
            };
            const stateName = stateNames[state] || 'UNKNOWN';

            if (state === window.YT?.PlayerState?.PLAYING) {
              usePlayerStore.setState({ isPlaying: true, isSeeking: false });
              const targetRate = usePlayerStore.getState().playbackRate || 1.0;
              if (targetRate !== 1.0) {
                rateCoordinator.enforceRateWithRetries(targetRate, 'video_playing_enforce');
              }
            } else if (state === window.YT?.PlayerState?.PAUSED) {
              const currentStore = usePlayerStore.getState();
              // Nếu người dùng không chủ động bấm pause (mà do tab bị ẩn, thoát app, tắt màn hình)
              if (currentStore.isPlaying && !currentStore.isExplicitlyPaused) {
                console.debug('[YouTubeEngineHost] Background interruption detected. Resuming playback...');
                try {
                  playerRef.current?.playVideo();
                } catch {}
                setTimeout(() => {
                  if (playerRef.current && usePlayerStore.getState().isPlaying && !usePlayerStore.getState().isExplicitlyPaused) {
                    try {
                      playerRef.current.playVideo();
                    } catch {}
                  }
                }, 100);
              } else {
                usePlayerStore.setState({ isPlaying: false });
              }
            } else if (state === window.YT?.PlayerState?.ENDED) {
              const currentStore = usePlayerStore.getState();
              // Chỉ kích hoạt khi đang phát tự nhiên và không do người dùng chủ động tắt, dừng hoặc tua/chuyển bài
              if (currentStore.isPlaying && !currentStore.isExplicitlyPaused && currentStore.currentAudio) {
                usePlayerStore.setState({ isPlaying: false });
                handleEpisodeComplete();
              }
            }

            rateCoordinator.onStateChange(state, stateName);
          },
          onPlaybackRateChange: (event: { data: number }) => {
            if (event && typeof event.data === 'number' && event.data > 0) {
              rateCoordinator.onRateConfirmedByYouTube(event.data);
            }
          },
          onError: (event: { data: number }) => {
            let msg = 'Lỗi khi phát âm thanh YouTube';
            if (event.data === 101 || event.data === 150) {
              msg = 'Video này không cho phép nhúng phát bên ngoài YouTube.';
            } else if (event.data === 100) {
              msg = 'Không tìm thấy video hoặc video đã bị gỡ bỏ.';
            }
            toast.error(msg);
            usePlayerStore.setState({ isPlaying: false });
          },
        },
      });
    };

    window.onYouTubeIframeAPIReady = () => {
      initYT();
    };

    if (window.YT && window.YT.Player) {
      initYT();
    } else {
      // Polling fallback bảo đảm khởi tạo thành công trên Safari / Edge / Firefox khi script nạp trễ
      let attempts = 0;
      const readyInterval = setInterval(() => {
        attempts++;
        if (window.YT && window.YT.Player) {
          clearInterval(readyInterval);
          initYT();
        } else if (attempts > 50) {
          clearInterval(readyInterval);
        }
      }, 100);
    }

    // 3. Listener duy trì phát audio và cưỡng chế tốc độ khi ẩn tab / chuyển app / quay lại app
    const handleVisibilityChange = () => {
      const store = usePlayerStore.getState();
      const desiredRate = store.playbackRate || 1.0;

      if (document.hidden) {
        // App / Tab chuyển sang chạy nền
        if (store.isPlaying && !store.isExplicitlyPaused) {
          startBackgroundAudio();
          if (playerRef.current) {
            try {
              playerRef.current.playVideo();
            } catch {}
          }
        }
      } else {
        // App quay trở lại màn hình chính
        if (store.isPlaying && !store.isExplicitlyPaused && playerRef.current) {
          try {
            const ytState = playerRef.current.getPlayerState?.();
            if (ytState !== 1) {
              playerRef.current.playVideo();
            }
          } catch {}
        }
        // Cưỡng chế áp dụng lại tốc độ đã chọn ngay khi app hiển thị lại
        if (desiredRate !== 1.0) {
          rateCoordinator.enforceRateWithRetries(desiredRate, 'app_foreground_visibility');
        }
      }
    };

    const handleWindowFocus = () => {
      const store = usePlayerStore.getState();
      const desiredRate = store.playbackRate || 1.0;
      if (store.isPlaying && !store.isExplicitlyPaused && playerRef.current) {
        try {
          const ytState = playerRef.current.getPlayerState?.();
          if (ytState !== 1) {
            playerRef.current.playVideo();
          }
        } catch {}
      }
      if (desiredRate !== 1.0) {
        rateCoordinator.enforceRateWithRetries(desiredRate, 'app_foreground_focus');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('pageshow', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('pageshow', handleWindowFocus);
      rateCoordinator.detachPlayer(instanceId);
      playerRef.current = null;
      isInitializingRef.current = false;
    };
  }, [handleEpisodeComplete, nextEpisode, pause, prevEpisode, resume, seekTo, setYtInstance, skipSeconds]);

  return (
    <div
      id="yt-audio-host-container"
      style={{
        position: 'fixed',
        bottom: '0px',
        left: '0px',
        width: '320px',
        height: '240px',
        opacity: 0.001,
        pointerEvents: 'none',
        zIndex: -999,
      }}
    >
      <div id="yt-player-target" />
    </div>
  );
};
