'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import {
  readPhoneMap,
  savePhoneMapping,
  deletePhoneMapping,
  resolvePhone,
  phoneEntries,
  type PhoneMap,
  type PhoneEntry,
} from '@/lib/phone-map'

/**
 * Phone→address contacts for the connected wallet. Empty when no wallet
 * is connected. Local to this browser/device only — there is no network
 * registry (see lib/phone-map.ts).
 */
export function usePhoneMap() {
  const { address } = useAccount()
  const [map, setMap] = useState<PhoneMap>({})

  useEffect(() => {
    setMap(address ? readPhoneMap(address) : {})
  }, [address])

  const add = useCallback(
    (phone: string, recipient: string) => {
      if (!address) return
      setMap(savePhoneMapping(address, phone, recipient))
    },
    [address],
  )

  const remove = useCallback(
    (phone: string) => {
      if (!address) return
      setMap(deletePhoneMapping(address, phone))
    },
    [address],
  )

  const resolve = useCallback((phone: string): string | null => resolvePhone(map, phone), [map])

  const entries: PhoneEntry[] = phoneEntries(map)

  return { connected: !!address, entries, add, remove, resolve }
}
