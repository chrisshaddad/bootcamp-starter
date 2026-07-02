import 'server-only';

import type ar from './dictionaries/ar.json';
import { defaultLocale, isLocale, type Locale } from './config';

export type Dictionary = typeof ar;

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  ar: () => import('./dictionaries/ar.json').then((module) => module.default),
  en: () => import('./dictionaries/en.json').then((module) => module.default),
};

export async function getDictionary(
  locale: string | undefined,
): Promise<Dictionary> {
  const safeLocale = isLocale(locale) ? locale : defaultLocale;
  return dictionaries[safeLocale]();
}
