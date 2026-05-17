'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import type { LocalCurrency } from '@sherpapay/celo'
import {
  readCurrencyOverride,
  writeCurrencyOverride,
  clearCurrencyOverride,
} from '@/lib/currency-pref'

/**
 * The connected wallet's display-currency override (null = follow the
 * app locale). Local to this device — see lib/currency-pref.ts.
 */
export function useCurrencyOverride() {
  const { address } = useAccount()
  const [override, setOverride] = useState<LocalCurrency | null>(null)

  useEffect(() => {
    setOverride(address ? readCurrencyOverride(address) : null)
  }, [address])

  const set = useCallback(
    (currency: LocalCurrency) => {
      if (!address) return
      writeCurrencyOverride(address, currency)
      setOverride(currency)
    },
    [address],
  )

  const clear = useCallback(() => {
    if (!address) return
    clearCurrencyOverride(address)
    setOverride(null)
  }, [address])

  return { connected: !!address, override, set, clear }
}
