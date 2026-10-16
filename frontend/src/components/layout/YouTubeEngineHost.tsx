import React, { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { rateCoordinator } from '@/lib/playbackRateCoordinator';
import { toast } from '@/components/ui/Toast';

export const YouTubeEngineHost: React.FC = () => {
  const setYtInstance = usePlayerStore((s) => s.setYtInstance);
  const handleEpisodeComplete = usePlayerStore((s) => s.handleEpisodeComplete);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const skipSeconds = usePlayerStore((s) => s.skipSeconds);
  const prevEpisode = usePlayerStore((s) => s.prevEpisode);
  const nextEpisode = usePlayerStore((s) => s.nextEpisode);
  const playerRef = useRef<any>(null);
  const isInitializingRef = useRef<boolean>(false);
  const instanceIdRef = useRef<string>(`yt-host-${Date.now()}`);

  useEffect(() => {
    const instanceId = instanceIdRef.current;

    // 1. Setup Media Session Handlers safely for Safari/WebKit/Edge
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      const safeSetHandler = (action: MediaSessionAction, handler: MediaSessionActionHandler) => {
        try {
          navigator.mediaSession.setActionHandler(action, handler);
        } catch {}
      };
      safeSetHandler('play', () => togglePlay());
      safeSetHandler('pause', () => togglePlay());
      safeSetHandler('seekbackward', () => skipSeconds(-15));
      safeSetHandler('seekforward', () => skipSeconds(30));
      safeSetHandler('previoustrack', () => prevEpisode());
      safeSetHandler('nexttrack', () => nextEpisode());
    }

    // 2. Load YouTube IFrame Script if not already loaded
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
        height: '200',
        width: '200',
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
            } else if (
              state === window.YT?.PlayerState?.PAUSED ||
              state === window.YT?.PlayerState?.ENDED
            ) {
              usePlayerStore.setState({ isPlaying: false });
              if (state === window.YT?.PlayerState?.ENDED) {
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

    return () => {
      rateCoordinator.detachPlayer(instanceId);
      playerRef.current = null;
      isInitializingRef.current = false;
    };
  }, [handleEpisodeComplete, nextEpisode, prevEpisode, setYtInstance, skipSeconds, togglePlay]);

  return (
    <div
      id="yt-audio-host-container"
      style={{
        position: 'fixed',
        bottom: '0px',
        right: '0px',
        width: '200px',
        height: '200px',
        clipPath: 'inset(100%)',
        opacity: 1,
        pointerEvents: 'none',
        zIndex: -1,
      }}
    >
      <div id="yt-player-target" />
    </div>
  );
};
