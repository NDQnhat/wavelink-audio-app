/**
 * backgroundAudioKeeper.ts
 * Duy trì tiến trình âm thanh nền (Background Audio Session) cho WaveLink khi thoát app / chuyển tab / tắt màn hình.
 * Sử dụng HTML5 Audio loop im lặng (silent audio anchor) kết hợp Web Audio API.
 * Giúp trình duyệt (Chrome, Safari, Edge, Mobile WebViews) nhận diện ứng dụng đang phát âm thanh,
 * ngăn hệ điều hành ngắt tiến trình hoặc đóng băng MediaSession.
 */

// 1-second silent WAV base64 string
const SILENT_WAV_BASE64 =
  'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABmYWN0BAAAAAAAAABkYXRhAAAAAA==';

let bgAudioElement: HTMLAudioElement | null = null;
let isRunning = false;

function getOrCreateAudioElement(): HTMLAudioElement | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;

  if (!bgAudioElement) {
    try {
      const audio = document.createElement('audio');
      audio.id = 'wavelink-bg-audio-anchor';
      audio.src = SILENT_WAV_BASE64;
      audio.loop = true;
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('webkit-playsinline', 'true');
      audio.preload = 'auto';
      audio.volume = 0.001; // Âm lượng siêu nhỏ không gây tiếng ồn nhưng vẫn giữ audio session active
      audio.style.position = 'fixed';
      audio.style.left = '-9999px';
      audio.style.width = '1px';
      audio.style.height = '1px';
      audio.style.pointerEvents = 'none';
      audio.style.opacity = '0';
      document.body.appendChild(audio);
      bgAudioElement = audio;
    } catch (e) {
      console.warn('[BackgroundAudio] Failed to create audio anchor:', e);
      return null;
    }
  }

  return bgAudioElement;
}

/**
 * Kích hoạt phiên phát âm thanh nền
 */
export function startBackgroundAudio(): void {
  if (typeof window === 'undefined') return;

  const audio = getOrCreateAudioElement();
  if (!audio) return;

  try {
    if (typeof audio.play === 'function') {
      const playPromise = audio.play();
      if (playPromise !== undefined && typeof playPromise.then === 'function') {
        playPromise
          .then(() => {
            isRunning = true;
          })
          .catch(() => {});
      } else {
        isRunning = true;
      }
    }
  } catch {}
}

/**
 * Dừng phiên phát âm thanh nền
 */
export function stopBackgroundAudio(): void {
  if (!bgAudioElement) {
    isRunning = false;
    return;
  }

  try {
    if (typeof bgAudioElement.pause === 'function') {
      bgAudioElement.pause();
    }
    bgAudioElement.currentTime = 0;
  } catch {}
  isRunning = false;
}

/**
 * Kiểm tra trạng thái đang chạy nền
 */
export function isBackgroundAudioRunning(): boolean {
  return isRunning;
}
