/**
 * sleepTimerWorker.ts
 * Quản lý bộ đếm thời gian hẹn giờ ngủ chạy ngầm (Background Sleep Timer).
 * Sử dụng Web Worker riêng biệt để không bị hệ điều hành / trình duyệt bóp nghẹt (throttle)
 * khi tab trình duyệt ở chế độ nền hoặc tắt màn hình.
 */

let workerInstance: Worker | null = null;
let fallbackInterval: ReturnType<typeof setInterval> | null = null;

export function startBackgroundSleepTimer(endTimestamp: number, onExpire: () => void): void {
  stopBackgroundSleepTimer();

  if (typeof window === 'undefined') return;

  // Thử khởi tạo Web Worker từ inline Blob
  if (typeof Worker !== 'undefined' && typeof Blob !== 'undefined' && typeof URL !== 'undefined') {
    try {
      const code = `
        let targetTs = ${endTimestamp};
        let timer = setInterval(function() {
          if (Date.now() >= targetTs) {
            clearInterval(timer);
            postMessage('EXPIRED');
          }
        }, 1000);
      `;
      const blob = new Blob([code], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      workerInstance = new Worker(workerUrl);

      workerInstance.onmessage = (event) => {
        if (event.data === 'EXPIRED') {
          stopBackgroundSleepTimer();
          onExpire();
        }
      };

      workerInstance.onerror = () => {
        // Fallback sang setInterval nếu Worker bị chặn
        stopBackgroundSleepTimer();
        startFallbackInterval(endTimestamp, onExpire);
      };

      return;
    } catch {
      // Worker blocked by CSP or environment -> Fallback
    }
  }

  startFallbackInterval(endTimestamp, onExpire);
}

function startFallbackInterval(endTimestamp: number, onExpire: () => void): void {
  fallbackInterval = setInterval(() => {
    if (Date.now() >= endTimestamp) {
      stopBackgroundSleepTimer();
      onExpire();
    }
  }, 1000);
}

export function stopBackgroundSleepTimer(): void {
  if (workerInstance) {
    try {
      workerInstance.terminate();
    } catch {}
    workerInstance = null;
  }
  if (fallbackInterval) {
    clearInterval(fallbackInterval);
    fallbackInterval = null;
  }
}
