'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Locale = 'fr' | 'ar';

type LangContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dir: 'ltr' | 'rtl';
};

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr');

  // On mount: default to French, clear any stale Arabic preference
  useEffect(() => {
    try {
      if (localStorage.getItem('locale') === 'ar') {
        localStorage.setItem('locale', 'fr');
      }
      if (localStorage.getItem('flipbook_lang') === 'ar') {
        localStorage.removeItem('flipbook_lang');
      }
    } catch (e) {}
    setLocaleState('fr');
  }, []);

  // Sync <html lang> and <body dir> for screen readers and CSS :lang(ar) selector
  useEffect(() => {
    document.documentElement.lang = locale;
    document.body.dir = locale === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('locale', locale);
  }, [locale]);

  const setLocale = (l: Locale) => setLocaleState(l);
  const dir: 'ltr' | 'rtl' = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <LangContext.Provider value={{ locale, setLocale, dir }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used inside <LangProvider>');
  return ctx;
}
