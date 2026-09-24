import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { storage } from './utils';

export type ThemePref = 'light' | 'dark' | 'system';

const ThemeContext = createContext<{ theme: ThemePref; resolved: 'light' | 'dark'; setTheme: (t: ThemePref) => void } | null>(null);

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePref>(() => (storage.get('welco.theme') as ThemePref) || 'system');
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => (theme === 'dark' || (theme === 'system' && systemDark()) ? 'dark' : 'light'));

  useEffect(() => {
    const apply = () => {
      const r = theme === 'dark' || (theme === 'system' && systemDark()) ? 'dark' : 'light';
      setResolved(r);
      document.documentElement.classList.toggle('dark', r === 'dark');
    };
    apply();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  const setTheme = (t: ThemePref) => {
    storage.set('welco.theme', t);
    setThemeState(t);
  };

  return <ThemeContext.Provider value={{ theme, resolved, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
