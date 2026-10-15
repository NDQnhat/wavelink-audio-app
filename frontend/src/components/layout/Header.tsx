import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLive } = useAuthStore();
  const { data: unreadCount = 0 } = useUnreadNotificationCount();

  return (
    <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[460px] z-50 bg-[#FFFFFF] border-b-2 border-black shadow-[0_2px_0_#000] pt-safe">
      <div className="h-14 px-4 flex items-center justify-between gap-2">
        {/* Logo & Brand */}
        <div
          className="flex items-center gap-2 cursor-pointer select-none"
          onClick={() => navigate('/home')}
        >
          <div className="w-8 h-8 rounded-lg border-2 border-black bg-[#FFE600] text-black flex items-center justify-center font-black shadow-comic-sm">
            <i className="ri-headphone-fill text-lg" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-extrabold text-sm uppercase tracking-tight text-black leading-tight flex items-center gap-1.5">
              WaveLink
              <span
                className={`badge-comic ${
                  isLive ? 'badge-comic-teal' : 'badge-comic-orange'
                } text-[8px] py-0 px-1 font-black`}
              >
                ● {isLive ? 'PROD LIVE' : 'OFFLINE'}
              </span>
            </span>
            <span className="text-[10px] font-bold text-gray-500 truncate leading-tight">
              Audio Streaming Engine
            </span>
          </div>
        </div>

        {/* Right Quick Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate('/library')}
            aria-label="Tìm kiếm"
            className="w-8 h-8 rounded-lg border-2 border-black bg-white flex items-center justify-center text-black shadow-comic-sm hover:bg-gray-100 active:translate-x-0.5 active:translate-y-0.5"
          >
            <i className="ri-search-2-line font-bold" />
          </button>
          <button
            onClick={() => navigate('/notifications')}
            id="header-bell-btn"
            aria-label="Thông báo"
            className="relative w-8 h-8 rounded-lg border-2 border-black bg-[#FFE600] flex items-center justify-center text-black shadow-comic-sm hover:bg-yellow-300 active:translate-x-0.5 active:translate-y-0.5"
          >
            <i className="ri-notification-3-line font-bold text-base" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] bg-[#E63946] text-white text-[9px] font-black rounded-full border border-black flex items-center justify-center px-0.5">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => navigate('/settings')}
            aria-label="Cài đặt"
            title="Cài đặt"
            className="w-8 h-8 rounded-lg border-2 border-black bg-[#8338EC] flex items-center justify-center text-white shadow-comic-sm hover:bg-purple-600 active:translate-x-0.5 active:translate-y-0.5"
          >
            <i className="ri-settings-4-fill text-base" />
          </button>
        </div>
      </div>
    </header>
  );
};

