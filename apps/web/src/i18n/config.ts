export const locales = ['ar', 'en'] as const;

export type Locale = (typeof locales)[number];
export type Direction = 'rtl' | 'ltr';

export const defaultLocale: Locale = 'en';

export const localeDirections: Record<Locale, Direction> = {
  ar: 'rtl',
  en: 'ltr',
};

export const localeLabels: Record<Locale, string> = {
  ar: 'العربية',
  en: 'English',
};

export function isLocale(value: string | undefined): value is Locale {
  return locales.some((locale) => locale === value);
}

export function getDirection(locale: Locale): Direction {
  return localeDirections[locale];
}
