import { create } from 'zustand';
import type { User } from '@/domain/models';

const STORAGE_KEY = 'assetagro_auth';

function loadSession(): { user: User | null; isAuthenticated: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { user: null, isAuthenticated: false };
    const user = JSON.parse(raw) as User;
    return { user, isAuthenticated: true };
  } catch {
    return { user: null, isAuthenticated: false };
  }
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;

  login: (user: User) => void;
  logout: () => void;
}

const initial = loadSession();

export const useAuthStore = create<AuthState>((set) => ({
  user: initial.user,
  isAuthenticated: initial.isAuthenticated,

  login: (user) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    set({ user, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ user: null, isAuthenticated: false });
  },
}));
