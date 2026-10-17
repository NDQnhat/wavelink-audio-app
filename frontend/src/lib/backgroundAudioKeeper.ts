/**
 * backgroundAudioKeeper.ts
 * Duy trì tiến trình âm thanh nền (Background Audio Session) cho WaveLink khi thoát app / chuyển tab / tắt màn hình.
 * - Trên Mobile (iOS / Android): Sử dụng HTML5 Audio loop 5 giây âm thanh im lặng (PCM WAV) để giữ Audio Session không bị OS đóng băng.
 * - Trên Desktop: Sử dụng Web Audio API AudioContext để giữ luồng âm thanh mà không kích hoạt thông báo "video đã phát xong".
 */

let silentAudioCtx: AudioContext | null = null;
let silentSource: AudioBufferSourceNode | null = null;
let mobileAudioElement: HTMLAudioElement | null = null;
let silentBlobUrl: string | null = null;
let isRunning = false;

function checkIsMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent);
}

function writeAscii(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function getOrCreateSilentBlobUrl(): string | null {
  if (silentBlobUrl) return silentBlobUrl;
  if (typeof Blob === 'undefined' || typeof URL === 'undefined') return null;

  try {
    const sampleRate = 8000;
    const numSamples = sampleRate * 5; // 5 giây âm thanh im lặng
    const buffer = new ArrayBuffer(44 + numSamples);
    const view = new DataView(buffer);

    // RIFF chunk
    writeAscii(view, 0, 'RIFF');
    view.setUint32(4, 36 + numSamples, true);
    writeAscii(view, 8, 'WAVE');

    // fmt sub-chunk
    writeAscii(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate, true);
    view.setUint16(32, 1, true);
    view.setUint16(34, 8, true);

    // data sub-chunk
    writeAscii(view, 36, 'data');
    view.setUint32(40, numSamples, true);

    const bytes = new Uint8Array(buffer, 44, numSamples);
    bytes.fill(128); // 8-bit PCM neutral line (silence)

    const blob = new Blob([buffer], { type: 'audio/wav' });
    silentBlobUrl = URL.createObjectURL(blob);
    return silentBlobUrl;
  } catch {
    return null;
  }
}

/**
 * Kích hoạt phiên phát âm thanh nền
 */
export function startBackgroundAudio(): void {
  if (typeof window === 'undefined') return;

  // Xóa sạch thẻ audio anchor cũ nếu có trong DOM (tránh gây lỗi hiển thị toast video đã phát xong)
  if (typeof document !== 'undefined') {
    const legacyAnchor = document.getElementById('wavelink-bg-audio-anchor');
    if (legacyAnchor) {
      legacyAnchor.remove();
    }
  }

  // 1. Mobile background audio keeper (iOS Safari / Android Chrome)
  if (checkIsMobile()) {
    const url = getOrCreateSilentBlobUrl();
    if (url && typeof document !== 'undefined') {
      try {
        if (!mobileAudioElement) {
          const audio = document.createElement('audio');
          audio.id = 'wavelink-mobile-bg-audio';
          audio.src = url;
          audio.loop = true;
          audio.setAttribute('playsinline', 'true');
          audio.setAttribute('webkit-playsinline', 'true');
          audio.volume = 0.01;
          audio.style.position = 'fixed';
          audio.style.left = '-9999px';
          audio.style.width = '1px';
          audio.style.height = '1px';
          audio.style.opacity = '0';
          audio.style.pointerEvents = 'none';
          document.body.appendChild(audio);
          mobileAudioElement = audio;
        }
        const playPromise = mobileAudioElement.play();
        if (playPromise !== undefined && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {});
        }
      } catch (err) {
        console.debug('[BackgroundAudio] Mobile audio anchor init:', err);
      }
    }
  }

  // 2. Web Audio keepalive (Desktop & Web Audio supported environments)
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
  if (mobileAudioElement) {
    try {
      mobileAudioElement.pause();
    } catch {}
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

