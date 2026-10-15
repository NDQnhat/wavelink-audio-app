import { create } from 'zustand';

interface ThemeState {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const initialTheme: 'light' | 'dark' =
    typeof localStorage !== 'undefined' && localStorage.getItem('setting_theme') === 'dark' ? 'dark' : 'light';

  if (typeof document !== 'undefined') {
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark-comic');
    } else {
      document.documentElement.classList.remove('dark-comic');
    }
  }

  return {
    theme: initialTheme,
    setTheme: (theme: 'light' | 'dark') => {
      localStorage.setItem('setting_theme', theme);
      if (typeof document !== 'undefined') {
        if (theme === 'dark') {
          document.documentElement.classList.add('dark-comic');
        } else {
          document.documentElement.classList.remove('dark-comic');
        }
      }
      set({ theme });
    },
    toggleTheme: () => {
      const next = get().theme === 'dark' ? 'light' : 'dark';
      get().setTheme(next);
    },
  };
});
