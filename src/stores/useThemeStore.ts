import { create } from 'zustand';
import type { Theme } from '@/domain/models';

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    prefersDark ? root.classList.add('dark') : root.classList.remove('dark');
  }
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: (localStorage.getItem('assetagro-theme') as Theme) || 'system',

  setTheme: (theme) => {
    localStorage.setItem('assetagro-theme', theme);
    applyTheme(theme);
    set({ theme });
  },
}));

// Aplica tema na carga inicial
const savedTheme = (localStorage.getItem('assetagro-theme') as Theme) || 'system';
applyTheme(savedTheme);
