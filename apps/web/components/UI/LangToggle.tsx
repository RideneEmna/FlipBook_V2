'use client';

import { useLang } from '@/contexts/LangContext';
import { useTranslation } from '@/i18n/useTranslation';

export default function LangToggle() {
  const { locale, setLocale } = useLang();
  const t = useTranslation();

  const toggleLang = () => {
    setLocale(locale === 'fr' ? 'ar' : 'fr');
  };

  return (
    <button
      type="button"
      onClick={toggleLang}
      aria-label="Toggle language"
      className="inline-flex items-center gap-1.5 rounded-btn border border-surface-border bg-surface-card px-3 py-1.5 text-sm font-medium text-text-base shadow-sm transition hover:border-primary hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-primary/40"
    >
      <span aria-hidden="true">🌐</span>
      <span>{t.ui.langToggle}</span>
    </button>
  );
}
