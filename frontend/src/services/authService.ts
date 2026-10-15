import { axiosClient } from '@/lib/axiosClient';
import { User, LoginPayload, RegisterPayload, AuthResponse } from '@/types';

export const authService = {
  async pingHealth(): Promise<boolean> {
    try {
      const res = await axiosClient.get('/health', { timeout: 2000 });
      return res.status === 200;
    } catch {
      return false;
    }
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const res = await axiosClient.post<{ success: boolean; data: AuthResponse; error?: { message?: string } }>('/auth/login', payload);
    if (res.data.success && res.data.data) {
      localStorage.setItem('auth_token', res.data.data.token);
      return res.data.data;
    }
    throw new Error(res.data.error?.message || 'Đăng nhập thất bại');
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const res = await axiosClient.post<{ success: boolean; data: AuthResponse; error?: { message?: string } }>('/auth/register', payload);
    if (res.data.success && res.data.data) {
      localStorage.setItem('auth_token', res.data.data.token);
      return res.data.data;
    }
    throw new Error(res.data.error?.message || 'Đăng ký thất bại');
  },

  async guestLogin(): Promise<AuthResponse> {
    const res = await axiosClient.post<{ success: boolean; data: AuthResponse; error?: { message?: string } }>('/auth/guest');
    if (res.data.success && res.data.data) {
      localStorage.setItem('auth_token', res.data.data.token);
      return res.data.data;
    }
    throw new Error('Lỗi đăng nhập khách');
  },

  async googleLogin(payload: import('@/types').GoogleLoginPayload): Promise<AuthResponse> {
    const res = await axiosClient.post<{ success: boolean; data: AuthResponse; error?: { message?: string } }>('/auth/google', payload);
    if (res.data.success && res.data.data) {
      localStorage.setItem('auth_token', res.data.data.token);
      return res.data.data;
    }
    throw new Error(res.data.error?.message || 'Đăng nhập Google thất bại');
  },

  async getMe(): Promise<User | null> {
    try {
      const res = await axiosClient.get<{ success: boolean; data: User }>('/auth/me');
      if (res.data.success) {
        return res.data.data;
      }
    } catch {
      // Ignored if unauthenticated or offline
    }
    return null;
  },

  async logout(): Promise<void> {
    localStorage.removeItem('auth_token');
    try {
      await axiosClient.post('/auth/logout');
    } catch {
      // Ignore
    }
  },
};
