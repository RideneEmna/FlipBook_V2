'use client';

import { useLang } from '@/contexts/LangContext';
import { fr } from './fr';
import { ar } from './ar';
import type { Translations } from './fr';

const dictionaries: Record<string, Translations> = { fr, ar };

/**
 * Returns the full translation dictionary for the current locale.
 * Usage: const t = useTranslation();  then  t.studio.title
 */
export function useTranslation(): Translations {
  const { locale } = useLang();
  return dictionaries[locale] ?? fr;
}
