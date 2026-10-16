import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { ProfilePage } from '@/pages/ProfilePage';
import { LibraryPage } from '@/pages/LibraryPage';
import { api } from '@/services/api';
import { audioService } from '@/services/audioService';

describe('Profile /:id and Library ?userId= enhancements', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('ProfilePage /profile/:id', () => {
    it('renders another user public profile when visiting /profile/42', async () => {
      vi.spyOn(api.user, 'getUserProfile').mockResolvedValueOnce({
        id: 42,
        username: 'DaiDaoDocGia',
        role: 'VIP',
        membership: 'VIP',
        vipBadge: 'VIP Kim Cương',
        totalHours: 350.5,
        uploadCount: 15,
        createdAt: '2026-01-15T00:00:00Z',
        isOwner: false,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/profile/42']}>
            <Routes>
              <Route path="/profile/:id" element={<ProfilePage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('DaiDaoDocGia')).toBeInTheDocument();
        expect(screen.getByText('VIP Kim Cương')).toBeInTheDocument();
        expect(screen.getByText('350.5 giờ')).toBeInTheDocument();
        expect(screen.getByText('15 bộ')).toBeInTheDocument();
        expect(screen.getByText(/Truyện Đã Chia Sẻ/)).toBeInTheDocument();
      });
    });
  });

  describe('LibraryPage ?userId=', () => {
    it('displays banner when filtering by specific user ID', async () => {
      vi.spyOn(audioService, 'getAudios').mockResolvedValueOnce([]);

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/library?userId=99']}>
            <Routes>
              <Route path="/library" element={<LibraryPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Đang lọc kho truyện của độc giả #99/)).toBeInTheDocument();
        expect(screen.getByText('✕ Xóa bộ lọc')).toBeInTheDocument();
      });
    });
  });
});
