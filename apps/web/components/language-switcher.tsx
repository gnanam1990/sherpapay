'use client'

import { useIntl } from 'react-intl'
import { Languages } from 'lucide-react'
import { LOCALES, isLocale } from '@/lib/i18n'
import { useLocale } from '@/components/i18n-provider'

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale()
  const intl = useIntl()

  return (
    <label
      className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-card px-2 py-2 text-xs text-muted-foreground"
      title={intl.formatMessage({ id: 'lang.label' })}
    >
      <Languages className="h-4 w-4" aria-hidden />
      <span className="sr-only">{intl.formatMessage({ id: 'lang.label' })}</span>
      <select
        value={locale}
        onChange={(e) => {
          if (isLocale(e.target.value)) setLocale(e.target.value)
        }}
        className="bg-transparent text-foreground outline-none"
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code} className="bg-background text-foreground">
            {l.label}
          </option>
        ))}
      </select>
    </label>
  )
}
