/// <reference lib="dom" />

/**
 * Local-currency FX for cUSD amounts. cUSD is a USD stablecoin (~$1),
 * so we fetch cUSD→local rates from the CoinGecko free API and cache
 * them in-memory (CoinGecko free tier is rate-limited).
 */

export type LocalCurrency = 'NGN' | 'KES' | 'GHS' | 'MXN' | 'PHP' | 'INR' | 'USD'

export interface CurrencyMeta {
  /** CoinGecko vs_currency code (lowercase). */
  vs: string
  /** Display symbol. */
  symbol: string
  /** BCP-47 locale used for number grouping. */
  numberLocale: string
}

export const CURRENCIES: Record<LocalCurrency, CurrencyMeta> = {
  NGN: { vs: 'ngn', symbol: '₦', numberLocale: 'en-NG' },
  KES: { vs: 'kes', symbol: 'KSh', numberLocale: 'en-KE' },
  GHS: { vs: 'ghs', symbol: 'GH₵', numberLocale: 'en-GH' },
  MXN: { vs: 'mxn', symbol: 'MX$', numberLocale: 'es-MX' },
  PHP: { vs: 'php', symbol: '₱', numberLocale: 'en-PH' },
  INR: { vs: 'inr', symbol: '₹', numberLocale: 'en-IN' },
  USD: { vs: 'usd', symbol: '$', numberLocale: 'en-US' },
}

/**
 * Map an app locale to a default local currency. The English markets
 * (Nigeria/Ghana/Kenya/Philippines/India) can't be disambiguated from
 * the locale alone, so `en` defaults to NGN (largest MiniPay market).
 * A user-facing currency picker can override this later.
 */
export function localeToCurrency(locale: string): LocalCurrency {
  switch (locale) {
    case 'sw':
      return 'KES'
    case 'es':
      return 'MXN'
    case 'hi':
      return 'INR'
    default:
      return 'NGN'
  }
}

export type RateResponse = Record<string, Record<string, number>>

/** Pull the cUSD→<currency> number out of a CoinGecko price payload. */
export function parseRate(json: RateResponse, currency: LocalCurrency): number | null {
  const row = json['celo-dollar']
  const rate = row?.[CURRENCIES[currency].vs]
  return typeof rate === 'number' && rate > 0 ? rate : null
}

/** Format a cUSD amount in the local currency, e.g. "₦8,250". */
export function formatLocal(amountCusd: number, currency: LocalCurrency, rate: number): string {
  const meta = CURRENCIES[currency]
  const value = amountCusd * rate
  const formatted = new Intl.NumberFormat(meta.numberLocale, {
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value)
  return `${meta.symbol}${formatted} ${currency}`
}

interface CacheEntry {
  rate: number
  fetchedAt: number
}
const CACHE_TTL_MS = 10 * 60 * 1000
const cache = new Map<LocalCurrency, CacheEntry>()

/**
 * cUSD→currency rate, cached for 10 min. Returns null on network/parse
 * failure so callers can simply hide the local equivalent.
 */
export async function fetchLocalRate(currency: LocalCurrency): Promise<number | null> {
  const now = Date.now()
  const hit = cache.get(currency)
  if (hit && now - hit.fetchedAt < CACHE_TTL_MS) return hit.rate

  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=celo-dollar&vs_currencies=${CURRENCIES[currency].vs}`
    const res = await fetch(url)
    if (!res.ok) return hit?.rate ?? null
    const json = (await res.json()) as RateResponse
    const rate = parseRate(json, currency)
    if (rate === null) return hit?.rate ?? null
    cache.set(currency, { rate, fetchedAt: now })
    return rate
  } catch {
    return hit?.rate ?? null
  }
}
