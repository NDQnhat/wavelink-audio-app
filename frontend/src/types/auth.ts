export type UserRole = 'GUEST' | 'USER' | 'VIP' | 'ADMIN';

export interface User {
  id: number;
  username: string;
  email?: string;
  avatarUrl?: string;
  coverUrl?: string;
  googleId?: string;
  role: UserRole;
  membership?: string; // 'FREE' | 'VIP'
  isGuest?: boolean;
  vipExpiresAt?: string | null;
  createdAt?: string;
}

export interface LoginPayload {
  username: string;
  password?: string;
}

export interface RegisterPayload {
  username: string;
  email?: string;
  password?: string;
}

export interface GoogleLoginPayload {
  credential?: string;
  accessToken?: string;
  name?: string;
  email?: string;
  picture?: string;
  googleId?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
