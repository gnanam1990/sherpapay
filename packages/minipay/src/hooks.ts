'use client'

import { useEffect, useState } from 'react'
import { isMiniPayEnvironment, getMiniPayProvider } from './detect.js'

export interface UseMiniPayResult {
  /** True when running inside the MiniPay in-app browser. */
  isMiniPay: boolean
  /** The connected MiniPay account address, if already authorized. */
  address: string | null
}

/**
 * Detects the MiniPay environment and, when present, reads the already
 * authorized account via `eth_accounts` (no connect prompt).
 */
export function useMiniPay(): UseMiniPayResult {
  const [isMiniPay, setIsMiniPay] = useState(false)
  const [address, setAddress] = useState<string | null>(null)

  useEffect(() => {
    const detected = isMiniPayEnvironment()
    setIsMiniPay(detected)

    if (!detected) return

    const provider = getMiniPayProvider()
    if (!provider?.request) return

    provider
      .request({ method: 'eth_accounts' })
      .then((result: unknown) => {
        const accounts = Array.isArray(result) ? (result as string[]) : []
        if (accounts[0]) setAddress(accounts[0])
      })
      .catch(() => {
        /* eth_accounts can reject before authorization — ignore */
      })
  }, [])

  return { isMiniPay, address }
}
