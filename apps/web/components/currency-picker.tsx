'use client'

import { Globe2 } from 'lucide-react'
import { CURRENCIES, localeToCurrency, type LocalCurrency } from '@sherpapay/celo'
import { useLocale } from '@/components/i18n-provider'
import { useCurrencyOverride } from '@/lib/use-currency-override'
import { isLocalCurrency } from '@/lib/currency-pref'

const CODES: LocalCurrency[] = ['NGN', 'KES', 'GHS', 'MXN', 'PHP', 'INR', 'USD']

export function CurrencyPicker() {
  const { connected, override, set, clear } = useCurrencyOverride()
  const { locale } = useLocale()
  const auto = localeToCurrency(locale)

  if (!connected) {
    return (
      <p className="text-xs text-foreground/55">
        Connect a wallet to choose a display currency. Until then it follows your language ({auto}).
      </p>
    )
  }

  return (
    <label
      className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-card px-2 py-2 text-xs text-muted-foreground"
      title="Display currency"
    >
      <Globe2 className="h-4 w-4" aria-hidden />
      <span className="sr-only">Display currency</span>
      <select
        value={override ?? 'AUTO'}
        onChange={(e) => {
          const v = e.target.value
          if (v === 'AUTO') clear()
          else if (isLocalCurrency(v)) set(v)
        }}
        className="bg-transparent text-foreground outline-none"
      >
        <option value="AUTO" className="bg-background text-foreground">
          Auto · follows language ({auto})
        </option>
        {CODES.map((c) => (
          <option key={c} value={c} className="bg-background text-foreground">
            {CURRENCIES[c].symbol} {c}
          </option>
        ))}
      </select>
    </label>
  )
}
