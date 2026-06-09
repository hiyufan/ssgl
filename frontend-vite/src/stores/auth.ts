import { create } from 'zustand';
import { authAPI } from '@/services/api';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;

  // Actions
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  isAuthenticated: false,

  login: async (username: string, password: string) => {
    try {
      const response = await authAPI.login({ username, password });
      if (response.user) {
        set({ user: response.user, isAuthenticated: true });
      } else {
        // Fallback: fetch user profile
        const meResponse = await authAPI.getMe();
        set({ user: meResponse.user, isAuthenticated: true });
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  logout: () => {
    authAPI.logout();
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    if (!authAPI.isAuthenticated()) {
      set({ loading: false, isAuthenticated: false });
      return;
    }

    try {
      const response = await authAPI.getMe();
      set({ user: response.user, isAuthenticated: true, loading: false });
    } catch {
      authAPI.logout();
      set({ user: null, isAuthenticated: false, loading: false });
    }
  },

  setUser: (user: User | null) => {
    set({ user, isAuthenticated: !!user });
  },
}));
