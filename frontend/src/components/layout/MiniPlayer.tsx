import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayerStore } from '@/stores/playerStore';
import { useAuthStore } from '@/stores/authStore';

export const MiniPlayer: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    currentAudio,
    currentEpisode,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    togglePlay,
    skipSeconds,
    cycleSpeed,
    close,
  } = usePlayerStore();

  if (!currentAudio) return null;

  const percent = Math.min(100, Math.round((currentTime / (duration || 14400)) * 100));

  const handleOpenDetail = () => {
    navigate(`/player/${currentAudio.id}`);
  };

  return (
    <aside className="mini-player-comic group">
      {/* Thumbnail with Comic Border & Spin Ring */}
      <div
        className="relative w-12 h-12 rounded-lg bg-white border-2 border-black shrink-0 overflow-hidden shadow-comic-sm cursor-pointer"
        onClick={handleOpenDetail}
      >
        <img
          src={currentAudio.thumbnailUrl}
          alt={currentAudio.title}
          className="w-full h-full object-cover"
        />
        {isPlaying && (
          <div className="absolute inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center">
            <div className="comic-eq-container">
              <div className="comic-eq-bar !bg-white" />
              <div className="comic-eq-bar !bg-white" />
              <div className="comic-eq-bar !bg-white" />
            </div>
          </div>
        )}
      </div>

      {/* Audio Info */}
      <div className="flex flex-col min-w-0 flex-1 cursor-pointer" onClick={handleOpenDetail}>
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="badge-comic badge-comic-yellow text-[9px] py-0 px-1 font-black">
            TẬP {String(currentEpisode?.episodeNumber || 1).padStart(2, '0')}
          </span>
          {isPlaying ? (
            <span className="text-[10px] font-black text-[#3A86FF] uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3A86FF] animate-ping" /> Đang phát
            </span>
          ) : (
            <span className="text-[10px] font-bold text-gray-500 uppercase">Tạm dừng</span>
          )}
        </div>
        <span className="font-extrabold text-xs text-black truncate leading-tight">
          {currentAudio.title}
        </span>
        <span className="text-[11px] font-semibold text-gray-600 truncate mt-0.5">
          {currentEpisode?.title || 'Tập 1'}
        </span>
      </div>

      {/* Tactile Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            cycleSpeed(user?.id);
          }}
          className="h-8 px-2 rounded-lg border-2 border-black bg-[#FFE600] font-black text-xs text-black shadow-comic-sm hover:scale-105 active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center shrink-0"
          title={`Tốc độ hiện tại: ${playbackRate}x (Nhấp để đổi)`}
        >
          {playbackRate}x
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            skipSeconds(10);
          }}
          className="w-8 h-8 rounded-lg border-2 border-black bg-white flex items-center justify-center text-black shadow-comic-sm hover:bg-gray-100 active:translate-x-0.5 active:translate-y-0.5"
          title="Tua 10s"
        >
          <i className="ri-forward-10-line text-sm font-bold" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          className={`w-10 h-10 rounded-lg border-2 border-black ${
            isPlaying ? 'bg-[#FFE600] text-black' : 'bg-[#3A86FF] text-white'
          } flex items-center justify-center shadow-comic-sm hover:scale-105 active:translate-x-0.5 active:translate-y-0.5 transition-all`}
          title={isPlaying ? 'Tạm dừng' : 'Phát tiếp'}
        >
          <i className={`${isPlaying ? 'ri-pause-fill' : 'ri-play-fill'} text-xl`} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            close();
          }}
          className="w-7 h-7 rounded border border-black bg-gray-100 flex items-center justify-center text-gray-600 hover:text-red-600 hover:bg-red-50 ml-0.5"
          title="Đóng trình phát"
        >
          <i className="ri-close-line text-sm" />
        </button>
      </div>

      {/* Bottom Comic Progress Line */}
      <div className="absolute bottom-0 inset-x-0 h-1.5 bg-gray-200 border-t border-black overflow-hidden rounded-b-[10px]">
        <div
          className="h-full bg-[#3A86FF] transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </aside>
  );
};

