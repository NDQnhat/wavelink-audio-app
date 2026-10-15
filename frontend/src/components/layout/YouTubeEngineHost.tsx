import React, { useEffect } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { toast } from '@/components/ui/Toast';

export const YouTubeEngineHost: React.FC = () => {
  const { setYtInstance, setPlaybackRate, handleEpisodeComplete, togglePlay, skipSeconds, prevEpisode, nextEpisode } =
    usePlayerStore();

  useEffect(() => {
    // 1. Setup Media Session Handlers
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => togglePlay());
      navigator.mediaSession.setActionHandler('pause', () => togglePlay());
      navigator.mediaSession.setActionHandler('seekbackward', () => skipSeconds(-15));
      navigator.mediaSession.setActionHandler('seekforward', () => skipSeconds(30));
      navigator.mediaSession.setActionHandler('previoustrack', () => prevEpisode());
      navigator.mediaSession.setActionHandler('nexttrack', () => nextEpisode());
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

      const player = new window.YT.Player('yt-player-target', {
        height: '100',
        width: '100',
        playerVars: {
          playsinline: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: () => {
            console.log('🎵 YouTube Audio Engine đã sẵn sàng!');
            setYtInstance(player);
            const initialRate = usePlayerStore.getState().playbackRate || 1.0;
            if (player && typeof player.setPlaybackRate === 'function') {
              try {
                player.setPlaybackRate(initialRate);
              } catch {}
            }
          },
          onStateChange: (event: { data: number }) => {
            const state = event.data;
            // YT.PlayerState: -1 UNSTARTED, 0 ENDED, 1 PLAYING, 2 PAUSED, 3 BUFFERING, 5 CUED
            const targetRate = usePlayerStore.getState().playbackRate || 1.0;

            if (state === window.YT?.PlayerState?.PLAYING) {
              usePlayerStore.setState({ isPlaying: true, isSeeking: false });
              // Đảm bảo duy trì tốc độ phát đã chọn khi tiếp tục phát sau khi tua hoặc buffering
              if (player && typeof player.setPlaybackRate === 'function') {
                try {
                  const currentRate =
                    typeof player.getPlaybackRate === 'function' ? player.getPlaybackRate() : 1;
                  if (Math.abs(currentRate - targetRate) > 0.05) {
                    player.setPlaybackRate(targetRate);
                  }
                } catch {}
              }
            } else if (
              state === window.YT?.PlayerState?.BUFFERING ||
              state === window.YT?.PlayerState?.CUED
            ) {
              // Củng cố trước tốc độ phát trong lúc tải/buffering
              if (player && typeof player.setPlaybackRate === 'function') {
                try {
                  player.setPlaybackRate(targetRate);
                } catch {}
              }
            } else if (
              state === window.YT?.PlayerState?.PAUSED ||
              state === window.YT?.PlayerState?.ENDED
            ) {
              usePlayerStore.setState({ isPlaying: false });
              if (state === window.YT?.PlayerState?.ENDED) {
                handleEpisodeComplete();
              }
            }
          },
          onPlaybackRateChange: (event: { data: number }) => {
            if (event && typeof event.data === 'number' && event.data > 0) {
              const targetRate = usePlayerStore.getState().playbackRate || 1.0;
              // Nếu YouTube tự động reset tốc độ (thường về 1.0 khi load video mới)
              // và khác với tốc độ người dùng mong muốn, ép lại theo ý user
              if (Math.abs(targetRate - event.data) > 0.05) {
                console.log(
                  `[YouTube Engine] Detected rate reset to ${event.data}x, enforcing user target: ${targetRate}x`
                );
                if (player && typeof player.setPlaybackRate === 'function') {
                  try {
                    player.setPlaybackRate(targetRate);
                  } catch {}
                }
              }
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
    }
  }, [handleEpisodeComplete, nextEpisode, prevEpisode, setPlaybackRate, setYtInstance, skipSeconds, togglePlay]);

  return (
    <div
      id="yt-audio-host-container"
      className="fixed bottom-0 right-0 w-[200px] h-[200px] pointer-events-none overflow-hidden z-[-999]"
      style={{ opacity: 0.001 }}
    >
      <div id="yt-player-target" />
    </div>
  );
};
