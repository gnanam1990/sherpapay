'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { IntlProvider } from 'react-intl'
import {
  DEFAULT_LOCALE,
  MESSAGES,
  STORAGE_KEY,
  resolveInitialLocale,
  type Locale,
} from '@/lib/i18n'

interface LocaleContextValue {
  locale: Locale
  setLocale: (next: Locale) => void
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within <I18nProvider>')
  return ctx
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Start from DEFAULT_LOCALE so server and first client render match
  // (no hydration mismatch); the stored/browser locale is applied after mount.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    const initial = resolveInitialLocale(stored, window.navigator.language)
    setLocaleState((prev) => (initial !== prev ? initial : prev))
  }, [])

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale: (next) => {
        setLocaleState(next)
        window.localStorage.setItem(STORAGE_KEY, next)
      },
    }),
    [locale],
  )

  return (
    <LocaleContext.Provider value={value}>
      <IntlProvider locale={locale} defaultLocale={DEFAULT_LOCALE} messages={MESSAGES[locale]}>
        {children}
      </IntlProvider>
    </LocaleContext.Provider>
  )
}
