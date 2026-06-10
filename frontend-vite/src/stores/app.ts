import { create } from 'zustand';

interface AppState {
  theme: 'dark' | 'light';

  // Actions
  toggleTheme: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  theme: (localStorage.getItem('forge-theme') as 'dark' | 'light') || 'dark',

  toggleTheme: () => {
    const newTheme = get().theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('forge-theme', newTheme);
    set({ theme: newTheme });
  },
}));
