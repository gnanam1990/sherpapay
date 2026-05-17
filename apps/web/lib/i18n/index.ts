import en from './en.json'
import sw from './sw.json'
import es from './es.json'
import hi from './hi.json'

export type Locale = 'en' | 'sw' | 'es' | 'hi'

export const DEFAULT_LOCALE: Locale = 'en'

export const LOCALES: { code: Locale; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'sw', label: 'Kiswahili' },
  { code: 'es', label: 'Español' },
  { code: 'hi', label: 'हिन्दी' },
]

export const MESSAGES: Record<Locale, Record<string, string>> = { en, sw, es, hi }

export const STORAGE_KEY = 'sherpapay.locale'

export function isLocale(value: string | null | undefined): value is Locale {
  return value === 'en' || value === 'sw' || value === 'es' || value === 'hi'
}

/** Resolve initial locale: stored choice → browser language → English. */
export function resolveInitialLocale(
  stored: string | null,
  navigatorLanguage: string | undefined,
): Locale {
  if (isLocale(stored)) return stored
  const short = navigatorLanguage?.slice(0, 2)
  if (isLocale(short)) return short
  return DEFAULT_LOCALE
}
