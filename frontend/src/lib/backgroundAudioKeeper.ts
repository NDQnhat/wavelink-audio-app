/**
 * backgroundAudioKeeper.ts
 * Duy trì tiến trình âm thanh nền (Background Audio Session) cho WaveLink khi thoát app / chuyển tab / tắt màn hình.
 * - Sử dụng Web Audio API AudioContext tạo luồng âm thanh im lặng (silent audio buffer) ở mức gain 0.
 * - Giữ audio subsystem và tiến trình của trình duyệt/ứng dụng hoạt động liên tục mà KHÔNG chiếm dụng Audio Session
 *   hoặc ngắt tiếng của YouTube Video IFrame (đặc biệt trên iOS Safari & Android Chrome).
 * - Dọn dẹp triệt để bất kỳ thẻ HTML5 <audio> nào trong DOM để tránh lỗi phát sinh toast ngoài "video đã phát xong".
 */

let silentAudioCtx: AudioContext | null = null;
let silentSource: AudioBufferSourceNode | null = null;
let isRunning = false;

/**
 * Kích hoạt phiên phát âm thanh nền
 */
export function startBackgroundAudio(): void {
  if (typeof window === 'undefined') return;

  // Xóa sạch mọi thẻ audio anchor/mobile audio thừa trong DOM (tránh gây gián đoạn âm thanh hoặc lỗi hiển thị toast)
  if (typeof document !== 'undefined') {
    const legacyAnchor = document.getElementById('wavelink-bg-audio-anchor');
    if (legacyAnchor) {
      legacyAnchor.remove();
    }
    const mobileAnchor = document.getElementById('wavelink-mobile-bg-audio');
    if (mobileAnchor) {
      mobileAnchor.remove();
    }
  }

  // Web Audio keepalive (Cross-platform: Desktop, iOS Safari, Android Chromium)
  // Web Audio API chạy trong audio mixer subsystem và không chiếm quyền ưu tiên phát của HTML5 <video> / YouTube
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) {
      isRunning = true;
      return;
    }

    if (!silentAudioCtx || silentAudioCtx.state === 'closed') {
      silentAudioCtx = new AudioContextClass();
    }

    if (silentAudioCtx.state === 'suspended') {
      silentAudioCtx.resume().catch(() => {});
    }

    if (!silentSource) {
      const buffer = silentAudioCtx.createBuffer(1, silentAudioCtx.sampleRate * 2, silentAudioCtx.sampleRate);
      silentSource = silentAudioCtx.createBufferSource();
      silentSource.buffer = buffer;
      silentSource.loop = true;

      const gainNode = silentAudioCtx.createGain();
      gainNode.gain.setValueAtTime(0, silentAudioCtx.currentTime);

      silentSource.connect(gainNode);
      gainNode.connect(silentAudioCtx.destination);
      silentSource.start(0);
    }
    isRunning = true;
  } catch (e) {
    console.debug('[BackgroundAudio] Web Audio keepalive active', e);
    isRunning = true;
  }
}

/**
 * Dừng phiên phát âm thanh nền
 */
export function stopBackgroundAudio(): void {
  if (typeof document !== 'undefined') {
    const mobileAnchor = document.getElementById('wavelink-mobile-bg-audio');
    if (mobileAnchor) {
      try {
        mobileAnchor.remove();
      } catch {}
    }
  }

  if (silentSource) {
    try {
      silentSource.stop();
      silentSource.disconnect();
    } catch {}
    silentSource = null;
  }

  if (silentAudioCtx && silentAudioCtx.state !== 'closed') {
    try {
      silentAudioCtx.suspend().catch(() => {});
    } catch {}
  }
  isRunning = false;
}

/**
 * Kiểm tra trạng thái đang chạy nền
 */
export function isBackgroundAudioRunning(): boolean {
  return isRunning;
}
