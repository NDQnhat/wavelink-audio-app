import React, { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/playerStore';

interface ScreenLockOverlayProps {
  onClose: () => void;
}

export const ScreenLockOverlay: React.FC<ScreenLockOverlayProps> = ({ onClose }) => {
  const {
    currentAudio,
    currentEpisode,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    togglePlay,
    skipSeconds,
  } = usePlayerStore();

  const wakeLockRef = useRef<any>(null);

  // Khóa cuộn trang và yêu cầu WakeLock để màn hình không tự tắt khi đang ở chế độ giữ màn hình
  useEffect(() => {
    document.body.style.overflow = 'hidden';

    // Acquire WakeLock nếu hỗ trợ
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      (navigator as any).wakeLock
        .request('screen')
        .then((sentinel: any) => {
          wakeLockRef.current = sentinel;
        })
        .catch(() => {});
    }

    return () => {
      document.body.style.overflow = '';
      if (wakeLockRef.current) {
        try {
          wakeLockRef.current.release();
        } catch {}
        wakeLockRef.current = null;
      }
    };
  }, []);

  if (!currentAudio) return null;

  const percent = Math.min(100, Math.round((currentTime / (duration || 14400)) * 100));

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div
      className="screen-lock-overlay"
      onTouchMove={(e) => e.preventDefault()}
      role="dialog"
      aria-modal="true"
      aria-label="Màn hình đang khóa"
    >
      {/* Lớp phủ mờ bảo vệ toàn bộ giao diện */}
      <div className="screen-lock-backdrop" />

      {/* Chỉ báo trạng thái khóa màn hình ở trên cùng */}
      <div className="screen-lock-indicator">
        <i className="ri-lock-2-fill text-yellow-400" />
        <span>MÀN HÌNH ĐANG KHÓA (TRÁNH CHẠM)</span>
      </div>

      {/* Nội dung trung tâm: Trực quan, tối giản, thanh lịch */}
      <div className="screen-lock-content">
        {/* Ảnh thumbnail với hiệu ứng sóng âm khi đang phát */}
        <div className="screen-lock-artwork">
          <img
            src={currentAudio.thumbnailUrl || '/wavelink-icon.png'}
            alt={currentAudio.title}
            className="screen-lock-artwork-img"
          />
          {isPlaying && (
            <div className="screen-lock-artwork-eq">
              <div className="comic-eq-bar !bg-white" />
              <div className="comic-eq-bar !bg-white" />
              <div className="comic-eq-bar !bg-white" />
            </div>
          )}
        </div>

        {/* Thông tin bài/tập */}
        <div className="screen-lock-meta">
          <p className="screen-lock-episode">
            TẬP {String(currentEpisode?.episodeNumber || 1).padStart(2, '0')} · {currentEpisode?.title || 'Tập 1'}
          </p>
          <h2 className="screen-lock-title">{currentAudio.title}</h2>
          {currentAudio.author && (
            <p className="screen-lock-author">{currentAudio.author}</p>
          )}
        </div>

        {/* Thanh tiến trình phát */}
        <div className="screen-lock-progress-wrap">
          <div className="screen-lock-progress-bar">
            <div
              className="screen-lock-progress-fill"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="screen-lock-time-row">
            <span>{formatTime(currentTime)}</span>
            <span className="font-bold text-yellow-400">{percent}%</span>
            <span>-{formatTime(Math.max(0, duration - currentTime))}</span>
          </div>
        </div>

        {/* Nút điều khiển nhanh */}
        <div className="screen-lock-controls">
          <button
            type="button"
            className="screen-lock-btn-secondary"
            onClick={() => skipSeconds(-15)}
            title="Tua lùi 15 giây"
          >
            <i className="ri-replay-15-line" />
          </button>

          <button
            type="button"
            className="screen-lock-btn-primary"
            onClick={() => togglePlay()}
            title={isPlaying ? 'Tạm dừng' : 'Phát tiếp'}
          >
            <i className={isPlaying ? 'ri-pause-fill' : 'ri-play-fill'} />
          </button>

          <button
            type="button"
            className="screen-lock-btn-secondary"
            onClick={() => skipSeconds(30)}
            title="Tua tiến 30 giây"
          >
            <i className="ri-forward-30-line" />
          </button>
        </div>

        {/* Badge tốc độ phát */}
        <div className="screen-lock-speed-badge">
          <i className="ri-speed-line" />
          <span>Tốc độ: {playbackRate}x</span>
        </div>

        {/* Ghi chú hướng dẫn mở khóa */}
        <p className="screen-lock-hint">
          Nhấn nút <strong className="text-white bg-white/20 px-1 py-0.5 rounded">[✕]</strong> ở góc dưới bên phải để mở khóa
        </p>
      </div>

      {/* Nút [X] duy nhất để thoát màn hình khóa — ở góc dưới bên phải theo đúng yêu cầu */}
      <button
        type="button"
        className="screen-lock-close-btn"
        onClick={onClose}
        title="Nhấn để tắt lớp bảo vệ màn hình"
        aria-label="Tắt lớp khóa màn hình"
      >
        <i className="ri-close-line" />
      </button>
    </div>
  );
};
