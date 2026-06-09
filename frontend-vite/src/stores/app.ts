import { create } from 'zustand';

interface AppState {
  role: 'student' | 'teacher' | 'admin';
  page: string;
  pageData: unknown;
  theme: 'dark' | 'light';

  // Actions
  setRole: (role: 'student' | 'teacher' | 'admin') => void;
  navigate: (page: string, data?: unknown) => void;
  toggleTheme: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  role: 'admin',
  page: 'dashboard',
  pageData: null,
  theme: (localStorage.getItem('forge-theme') as 'dark' | 'light') || 'dark',

  setRole: (role) => {
    set({ role });
    localStorage.setItem('cmp_state', JSON.stringify({ role, page: 'dashboard' }));
  },

  navigate: (page, data) => {
    set({ page, pageData: data || null });
    const state = JSON.parse(localStorage.getItem('cmp_state') || '{}');
    localStorage.setItem('cmp_state', JSON.stringify({ ...state, page }));
    // Scroll content to top
    const content = document.querySelector('.forge-content');
    if (content) content.scrollTop = 0;
  },

  toggleTheme: () => {
    const newTheme = get().theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('forge-theme', newTheme);
    set({ theme: newTheme });
  },
}));
