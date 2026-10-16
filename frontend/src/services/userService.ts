import { axiosClient } from '@/lib/axiosClient';
import { User } from '@/types';

export const userService = {
  async updateProfile(
    params: { username?: string; email?: string; avatarUrl?: string; coverUrl?: string } | string,
    email?: string,
    isLive = true
  ): Promise<boolean> {
    if (isLive) {
      const payload = typeof params === 'string' ? { username: params, email } : params;
      const res = await axiosClient.put<{ success: boolean; message?: string }>('/users/me', payload);
      if (!res.data.success) throw new Error(res.data.message || 'Cập nhật thất bại');
      return true;
    }
    return false;
  },

  async linkGoogle(payload: { googleId?: string; avatarUrl?: string; email?: string }, isLive = true): Promise<boolean> {
    if (isLive) {
      const res = await axiosClient.post<{ success: boolean; message?: string }>('/users/me/link-google', payload);
      if (!res.data.success) throw new Error(res.data.message || 'Liên kết Google thất bại');
      return true;
    }
    return false;
  },

  async updatePassword(oldPassword: string, newPassword: string, isLive = true): Promise<boolean> {
    if (isLive) {
      const res = await axiosClient.put<{ success: boolean; message?: string }>('/users/me/password', {
        oldPassword,
        newPassword,
      });
      if (!res.data.success) throw new Error(res.data.message || 'Cập nhật mật khẩu thất bại');
      return true;
    }
    return false;
  },

  async getUsers(isLive = true): Promise<User[]> {
    if (isLive) {
      const res = await axiosClient.get<{ success: boolean; data: User[] }>('/users');
      if (res.data.success && Array.isArray(res.data.data)) {
        return res.data.data;
      }
    }
    return [];
  },

  async updateUserRole(id: number | string, role: string, membership: string, isLive = true): Promise<boolean> {
    if (isLive) {
      const res = await axiosClient.put<{ success: boolean; message?: string }>(`/users/${id}`, {
        role,
        membership,
      });
      if (!res.data.success) throw new Error(res.data.message || 'Cập nhật quyền thất bại');
      return true;
    }
    return false;
  },

  async deleteUser(id: number | string, isLive = true): Promise<boolean> {
    if (isLive) {
      const res = await axiosClient.delete<{ success: boolean; message?: string }>(`/users/${id}`);
      if (!res.data.success) throw new Error(res.data.message || 'Xóa tài khoản thất bại');
      return true;
    }
    return false;
  },

  async getUserProfile(id: number | string): Promise<import('@/types').UserProfileData | null> {
    try {
      const res = await axiosClient.get<{ success: boolean; data: import('@/types').UserProfileData }>(`/users/${id}`);
      if (res.data.success && res.data.data) {
        return res.data.data;
      }
    } catch (err) {
      console.warn(`getUserProfile(${id}) API error`, err);
    }
    return null;
  },
};
