'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { fetchHistory, type HistoryResult } from '@/lib/celoscan'

const PAGE_SIZE = 20

/**
 * Connected wallet's recent history (native + token + scheduler),
 * keyless Celoscan with a 60s cache. "Load more" widens the window.
 */
export function useHistory() {
  const { address } = useAccount()
  const [limit, setLimit] = useState(PAGE_SIZE)

  const query = useQuery<HistoryResult>({
    queryKey: ['history', address, limit],
    queryFn: () => fetchHistory(address as string, limit),
    enabled: !!address,
    staleTime: 60_000,
    gcTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
    placeholderData: (prev) => prev,
  })

  const items = query.data?.items ?? []
  return {
    connected: !!address,
    loading: query.isLoading,
    fetching: query.isFetching,
    unavailable: query.data ? !query.data.ok : query.isError,
    reason: query.data?.reason,
    items,
    address,
    // If we got a full window back, more may exist.
    canLoadMore: items.length >= limit,
    loadMore: () => {
      setLimit((l) => l + PAGE_SIZE)
    },
  }
}
