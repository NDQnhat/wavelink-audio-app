import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/components/ui/Toast';

vi.mock('@/components/ui/Toast', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    dismiss: vi.fn(),
  },
}));

describe('AdminGuard Component & Route Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      token: null,
      isLoading: false,
      isInitialized: true,
      isLive: true,
    });
  });

  it('blocks unauthenticated/guest users and displays Permission Denied with message', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route element={<AdminGuard />}>
            <Route path="/admin" element={<div>Admin Secret Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText('Admin Secret Dashboard')).not.toBeInTheDocument();
    expect(screen.getByText(/Permission Denied/i)).toBeInTheDocument();
    expect(screen.getByText(/Không thể truy cập/i)).toBeInTheDocument();
    expect(screen.getByText(/Bạn không có quyền quản trị viên/i)).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('Permission Denied: Không thể truy cập')
    );
  });

  it('blocks normal USER or VIP users trying to access any admin subroute', () => {
    useAuthStore.setState({
      user: {
        id: 99,
        username: 'RegularUser',
        role: 'USER',
        membership: 'FREE',
      },
      token: 'valid-user-token',
      isLoading: false,
      isInitialized: true,
      isLive: true,
    });

    render(
      <MemoryRouter initialEntries={['/admin/audios']}>
        <Routes>
          <Route element={<AdminGuard />}>
            <Route path="/admin/audios" element={<div>Admin Audios Secret</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText('Admin Audios Secret')).not.toBeInTheDocument();
    expect(screen.getByText(/Permission Denied/i)).toBeInTheDocument();
    expect(screen.getByText(/Không thể truy cập/i)).toBeInTheDocument();
    expect(screen.getByText(/RegularUser/i)).toBeInTheDocument();
    expect(screen.getByText('USER')).toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalled();
  });

  it('allows access when user has ADMIN role', () => {
    useAuthStore.setState({
      user: {
        id: 1,
        username: 'SuperAdmin',
        role: 'ADMIN',
      },
      token: 'valid-admin-token',
      isLoading: false,
      isInitialized: true,
      isLive: true,
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route element={<AdminGuard />}>
            <Route path="/admin" element={<div>Admin Secret Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Admin Secret Dashboard')).toBeInTheDocument();
    expect(screen.queryByText(/Permission Denied/i)).not.toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
