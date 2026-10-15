import { create } from 'zustand';
import { User, LoginPayload, RegisterPayload, GoogleLoginPayload } from '@/types';
import { api } from '@/services/api';
import { usePlayerStore } from '@/stores/playerStore';

interface AuthState {
  user: User | null;
  token: string | null;
  isLive: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  initAuth: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  loginWithGoogle: (payload: GoogleLoginPayload) => Promise<void>;
  guestLogin: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setLiveStatus: (isLive: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null,
  isLive: false,
  isLoading: false,
  isInitialized: false,

  initAuth: async () => {
    set({ isLoading: true });
    try {
      const isLive = await api.init();
      set({ isLive });

      if (isLive) {
        const user = await api.auth.getMe();
        if (user) {
          set({ user, token: localStorage.getItem('auth_token') });
          usePlayerStore.getState().syncUserPlaybackRate(user.id);
        } else {
          // Auto guest login if no session (ISSUE 06 from vanilla)
          try {
            const guestRes = await api.auth.guestLogin();
            set({ user: guestRes.user, token: guestRes.token });
            usePlayerStore.getState().syncUserPlaybackRate(guestRes.user.id);
          } catch {
            // Unauthenticated
            usePlayerStore.getState().syncUserPlaybackRate('guest');
          }
        }
      } else {
        // Fallback guest user
        const guestUser: User = {
          id: 999,
          username: 'Khách Nghe Thử',
          role: 'GUEST',
          isGuest: true,
        };
        set({ user: guestUser });
        usePlayerStore.getState().syncUserPlaybackRate(guestUser.id);
      }
    } catch (err) {
      console.warn('Auth init error:', err);
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  login: async (payload: LoginPayload) => {
    set({ isLoading: true });
    try {
      const res = await api.auth.login(payload);
      set({ user: res.user, token: res.token });
      usePlayerStore.getState().syncUserPlaybackRate(res.user.id);
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (payload: RegisterPayload) => {
    set({ isLoading: true });
    try {
      const res = await api.auth.register(payload);
      set({ user: res.user, token: res.token });
      usePlayerStore.getState().syncUserPlaybackRate(res.user.id);
    } finally {
      set({ isLoading: false });
    }
  },

  loginWithGoogle: async (payload: GoogleLoginPayload) => {
    set({ isLoading: true });
    try {
      if (get().isLive) {
        const res = await api.auth.googleLogin(payload);
        set({ user: res.user, token: res.token });
        usePlayerStore.getState().syncUserPlaybackRate(res.user.id);
      } else {
        const candidateName = payload.name || payload.email?.split('@')[0] || 'Google User';
        const googleUser: User = {
          id: Date.now(),
          username: candidateName,
          email: payload.email || 'google@user.local',
          avatarUrl: payload.picture,
          googleId: payload.googleId,
          role: 'USER',
          membership: 'FREE',
          isGuest: false,
        };
        const mockToken = 'mock_google_jwt_' + Date.now();
        localStorage.setItem('auth_token', mockToken);
        set({ user: googleUser, token: mockToken });
        usePlayerStore.getState().syncUserPlaybackRate(googleUser.id);
      }
    } finally {
      set({ isLoading: false });
    }
  },

  guestLogin: async () => {
    set({ isLoading: true });
    try {
      if (get().isLive) {
        const res = await api.auth.guestLogin();
        set({ user: res.user, token: res.token });
        usePlayerStore.getState().syncUserPlaybackRate(res.user.id);
      } else {
        const guestUser: User = { id: 999, username: 'Khách Nghe Thử', role: 'GUEST', isGuest: true };
        set({ user: guestUser });
        usePlayerStore.getState().syncUserPlaybackRate(guestUser.id);
      }
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await api.auth.logout();
    set({ user: null, token: null });
    usePlayerStore.getState().syncUserPlaybackRate('guest');
    // Auto restore guest
    get().guestLogin().catch(() => {});
  },

  refreshUser: async () => {
    if (get().isLive) {
      const user = await api.auth.getMe();
      if (user) {
        set({ user });
        usePlayerStore.getState().syncUserPlaybackRate(user.id);
      }
    }
  },

  setLiveStatus: (isLive: boolean) => set({ isLive }),
}));
