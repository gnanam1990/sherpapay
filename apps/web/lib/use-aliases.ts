'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import {
  readAliases,
  upsertAlias,
  deleteAlias,
  resolveAlias,
  toEntries,
  type AliasMap,
  type AliasEntry,
} from '@/lib/aliases'

/**
 * Recipient aliases for the connected wallet. Empty when no wallet is
 * connected. State is local to the browser (see lib/aliases.ts).
 */
export function useAliases() {
  const { address } = useAccount()
  const [map, setMap] = useState<AliasMap>({})

  useEffect(() => {
    setMap(address ? readAliases(address) : {})
  }, [address])

  const add = useCallback(
    (name: string, recipient: string) => {
      if (!address) return
      setMap(upsertAlias(address, name, recipient))
    },
    [address],
  )

  const remove = useCallback(
    (name: string) => {
      if (!address) return
      setMap(deleteAlias(address, name))
    },
    [address],
  )

  const resolve = useCallback((name: string): string | null => resolveAlias(map, name), [map])

  const entries: AliasEntry[] = toEntries(map)

  return { connected: !!address, entries, add, remove, resolve }
}
