import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Direction } from 'radix-ui';
import { en } from './locales/en';
import { ar } from './locales/ar';
import { storage } from './utils';

export type Locale = 'en' | 'ar';
type Vars = Record<string, string | number>;

const dictionaries: Record<Locale, unknown> = { en, ar };

function lookup(dict: unknown, key: string): string | undefined {
  let node: unknown = dict;
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && part in (node as Record<string, unknown>)) node = (node as Record<string, unknown>)[part];
    else return undefined;
  }
  return typeof node === 'string' ? node : undefined;
}

function interpolate(s: string, vars?: Vars) {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
}

interface I18nValue {
  locale: Locale;
  dir: 'ltr' | 'rtl';
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Vars) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => (storage.get('welco.locale') === 'ar' ? 'ar' : 'en'));
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  const setLocale = useCallback((l: Locale) => {
    storage.set('welco.locale', l);
    setLocaleState(l);
  }, []);

  const t = useCallback(
    (key: string, vars?: Vars) => interpolate(lookup(dictionaries[locale], key) ?? lookup(en, key) ?? key, vars),
    [locale],
  );

  const value = useMemo(() => ({ locale, dir, setLocale, t }), [locale, dir, setLocale, t]) as I18nValue;
  return (
    <I18nContext.Provider value={value}>
      <Direction.Provider dir={dir}>{children}</Direction.Provider>
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
