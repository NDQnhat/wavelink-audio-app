/**
 * youtubeResolver.ts
 * Tiện ích hỗ trợ bóc tách thời lượng video YouTube client-side bằng YouTube IFrame API
 * Làm fallback hoàn hảo khi môi trường server (Render/Vercel) bị tường lửa hoặc không phản hồi kịp thời.
 */

export function resolveYouTubeDurationViaIframe(videoId: string): Promise<number> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !videoId) {
      return resolve(0);
    }

    // Đảm bảo script YouTube IFrame API đã nạp
    if (!document.getElementById('yt-iframe-script')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScript = document.getElementsByTagName('script')[0];
      if (firstScript && firstScript.parentNode) {
        firstScript.parentNode.insertBefore(tag, firstScript);
      } else {
        document.head.appendChild(tag);
      }
    }

    const container = document.createElement('div');
    container.id = `yt-probe-${videoId}-${Date.now()}`;
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '1px';
    container.style.height = '1px';
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '-9999';
    document.body.appendChild(container);

    let isDone = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let probePlayer: any = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const cleanupAndResolve = (result: number) => {
      if (isDone) return;
      isDone = true;
      if (pollTimer) clearInterval(pollTimer);
      clearTimeout(timer);
      try {
        if (probePlayer && typeof probePlayer.destroy === 'function') {
          probePlayer.destroy();
        }
      } catch {}
      try {
        container.remove();
      } catch {}
      resolve(result);
    };

    // Timeout an toàn 4.0 giây
    const timer = setTimeout(() => {
      cleanupAndResolve(0);
    }, 4000);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tryReadDuration = (player: any) => {
      try {
        if (player && typeof player.getDuration === 'function') {
          const dur = player.getDuration();
          if (typeof dur === 'number' && dur > 0) {
            cleanupAndResolve(Math.round(dur));
            return true;
          }
        }
      } catch {}
      return false;
    };

    pollTimer = setInterval(() => {
      if (probePlayer) {
        tryReadDuration(probePlayer);
      }
    }, 120);

    const runProbe = () => {
      try {
        probePlayer = new window.YT.Player(container.id, {
          height: '1',
          width: '1',
          videoId,
          host: 'https://www.youtube-nocookie.com',
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
          },
          events: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onReady: (event: any) => {
              try {
                event.target.cueVideoById(videoId);
              } catch {}
              tryReadDuration(event.target);
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onStateChange: (event: any) => {
              // 5: CUED, 1: PLAYING, 3: BUFFERING
              if (event.data === 5 || event.data === 1 || event.data === 3) {
                tryReadDuration(event.target);
              }
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onError: (event: any) => {
              // 2: Invalid param, 100: Video not found, 101/150: Cannot be embedded
              if (event.data === 100 || event.data === 2) {
                cleanupAndResolve(-1); // Đánh dấu rõ ràng video không tồn tại
              } else {
                cleanupAndResolve(0);
              }
            },
          },
        });
      } catch {
        cleanupAndResolve(0);
      }
    };

    if (window.YT && window.YT.Player) {
      runProbe();
    } else {
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevCallback === 'function') {
          prevCallback();
        }
        runProbe();
      };
    }
  });
}
