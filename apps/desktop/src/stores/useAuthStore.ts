import { create } from 'zustand';
import type { User, AuthResponse } from '../types';
import { apiClient } from '../services/api';
import { signalRService } from '../services/signalr';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (authData: AuthResponse) => void;
  login: (emailOrUsername: string, password: string) => Promise<void>;
  register: (username: string, displayName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('pulse_access_token'),
  isAuthenticated: !!localStorage.getItem('pulse_access_token'),
  isLoading: true,

  setAuth: (authData: AuthResponse) => {
    localStorage.setItem('pulse_access_token', authData.accessToken);
    localStorage.setItem('pulse_refresh_token', authData.refreshToken);
    set({
      user: authData.user,
      token: authData.accessToken,
      isAuthenticated: true,
      isLoading: false,
    });
    signalRService.connect();
  },

  login: async (emailOrUsername, password) => {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', {
      emailOrUsername,
      password,
    });
    useAuthStore.getState().setAuth(data);
  },

  register: async (username, displayName, email, password) => {
    const { data } = await apiClient.post<AuthResponse>('/auth/register', {
      username,
      displayName,
      email,
      password,
    });
    useAuthStore.getState().setAuth(data);
  },

  logout: () => {
    localStorage.removeItem('pulse_access_token');
    localStorage.removeItem('pulse_refresh_token');
    signalRService.disconnect();
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  initAuth: async () => {
    const token = localStorage.getItem('pulse_access_token');
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      const { data } = await apiClient.get<User>('/auth/me');
      set({ user: data, isAuthenticated: true, isLoading: false });
      signalRService.connect();
    } catch {
      useAuthStore.getState().logout();
    }
  },
}));
