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

    const cleanup = () => {
      if (isDone) return;
      isDone = true;
      try {
        if (probePlayer && typeof probePlayer.destroy === 'function') {
          probePlayer.destroy();
        }
      } catch {}
      try {
        container.remove();
      } catch {}
    };

    // Timeout an toàn 4.5 giây để không làm treo giao diện
    const timer = setTimeout(() => {
      cleanup();
      resolve(0);
    }, 4500);

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
              clearTimeout(timer);
              const durationSec = Math.round(event.target.getDuration() || 0);
              cleanup();
              resolve(durationSec);
            },
            onError: () => {
              clearTimeout(timer);
              cleanup();
              resolve(0);
            },
          },
        });
      } catch {
        clearTimeout(timer);
        cleanup();
        resolve(0);
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
