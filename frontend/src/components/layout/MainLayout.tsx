import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { MiniPlayer } from './MiniPlayer';
import { YouTubeEngineHost } from './YouTubeEngineHost';
import { ScreenLockOverlay } from './ScreenLockOverlay';
import { ToastContainer } from '@/components/ui/Toast';
import { usePlayerStore } from '@/stores/playerStore';

export const MainLayout: React.FC = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const { isScreenLocked, setScreenLocked, currentAudio } = usePlayerStore();

  return (
    <div className="mobile-app-shell">
      {!isAuthPage && <Header />}

      <main id="app-main" className={`flex-1 flex flex-col relative w-full ${isAuthPage ? 'pt-4' : 'pt-16'}`}>
        <Outlet />
      </main>

      {!isAuthPage && <MiniPlayer />}
      {!isAuthPage && <Footer />}

      {/* Lớp phủ khóa màn hình (Giữ màn hình / Tránh chạm) che phủ toàn bộ app */}
      {isScreenLocked && currentAudio && (
        <ScreenLockOverlay onClose={() => setScreenLocked(false)} />
      )}

      <YouTubeEngineHost />
      <ToastContainer />
    </div>
  );
};
