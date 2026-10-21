'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from '@/i18n/useTranslation';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const t = useTranslation();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? t.ui.lightMode : t.ui.darkMode}
      className="inline-flex items-center gap-2 rounded-btn border border-surface-border bg-surface-card px-3 py-1.5 text-sm font-medium text-text-base shadow-sm transition hover:border-primary hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-primary/40"
    >
      {theme === 'dark' ? (
        <>
          <span aria-hidden="true">☀️</span>
          <span>{t.ui.lightMode}</span>
        </>
      ) : (
        <>
          <span aria-hidden="true">🌙</span>
          <span>{t.ui.darkMode}</span>
        </>
      )}
    </button>
  );
}
