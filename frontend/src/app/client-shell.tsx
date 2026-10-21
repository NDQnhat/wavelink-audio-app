'use client';

import React, { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MiniPlayer } from '@/components/layout/MiniPlayer';
import { YouTubeEngineHost } from '@/components/layout/YouTubeEngineHost';
import { ScreenLockOverlay } from '@/components/layout/ScreenLockOverlay';
import { ToastContainer } from '@/components/ui/Toast';
import { usePlayerStore } from '@/stores/playerStore';

function ShellBody({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const { isScreenLocked, setScreenLocked, currentAudio } = usePlayerStore();

  return (
    <div className="mobile-app-shell">
      {!isAuthPage && (
        <Suspense fallback={<div className="h-16" />}>
          <Header />
        </Suspense>
      )}

      <main
        id="app-main"
        className={`flex-1 flex flex-col relative w-full ${isAuthPage ? 'pt-4' : 'pt-16'}`}
      >
        <Suspense fallback={null}>
          {children}
        </Suspense>
      </main>

      {!isAuthPage && (
        <Suspense fallback={null}>
          <MiniPlayer />
        </Suspense>
      )}
      {!isAuthPage && (
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      )}

      {/* Lớp phủ khóa màn hình che phủ toàn bộ app khi bật chế độ chống chạm */}
      {isScreenLocked && currentAudio && (
        <ScreenLockOverlay onClose={() => setScreenLocked(false)} />
      )}

      <YouTubeEngineHost />
      <ToastContainer />
    </div>
  );
}

export function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <ShellBody>{children}</ShellBody>
    </Suspense>
  );
}
