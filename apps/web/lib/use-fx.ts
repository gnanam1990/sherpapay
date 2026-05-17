'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchLocalRate, localeToCurrency, formatLocal } from '@sherpapay/celo'
import { useLocale } from '@/components/i18n-provider'

const TEN_MIN = 10 * 60 * 1000

/**
 * Local-currency helper for cUSD amounts. Currency is derived from the
 * active app locale; the rate is fetched (cached) from CoinGecko. When
 * no rate is available, `format` returns null so the UI hides the
 * approximation instead of showing a broken value.
 */
export function useLocalCurrency() {
  const { locale } = useLocale()
  const currency = localeToCurrency(locale)

  const { data: rate } = useQuery({
    queryKey: ['fx', currency],
    queryFn: () => fetchLocalRate(currency),
    staleTime: TEN_MIN,
    gcTime: TEN_MIN,
    refetchOnWindowFocus: false,
    retry: 1,
  })

  return {
    currency,
    rate: rate ?? null,
    format: (amountCusd: number): string | null =>
      rate ? formatLocal(amountCusd, currency, rate) : null,
  }
}
