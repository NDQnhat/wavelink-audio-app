/**
 * backgroundAudioKeeper.ts
 * Duy trì tiến trình âm thanh nền (Background Audio Session) cho WaveLink khi thoát app / chuyển tab / tắt màn hình.
 * Sử dụng Web Audio API AudioContext tạo luồng âm thanh im lặng (silent audio buffer).
 * Giữ audio session của trình duyệt và hệ thống hoạt động liên tục mà KHÔNG kích hoạt
 * HTML5 media session hay thông báo ngoài "video đã phát xong".
 */

let silentAudioCtx: AudioContext | null = null;
let silentSource: AudioBufferSourceNode | null = null;
let isRunning = false;

/**
 * Kích hoạt phiên phát âm thanh nền
 */
export function startBackgroundAudio(): void {
  if (typeof window === 'undefined') return;

  // Dọn dẹp thẻ audio cũ nếu còn tồn tại trong DOM
  if (typeof document !== 'undefined') {
    const legacyAnchor = document.getElementById('wavelink-bg-audio-anchor');
    if (legacyAnchor) {
      try {
        legacyAnchor.remove();
      } catch {}
    }
  }

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
      // Tạo buffer âm thanh im lặng 2 giây loop liên tục
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
  }
}

/**
 * Dừng phiên phát âm thanh nền
 */
export function stopBackgroundAudio(): void {
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

