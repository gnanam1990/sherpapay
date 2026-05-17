'use client'

import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Clock3, ExternalLink, Loader2, Repeat } from 'lucide-react'
import { formatAddress } from '@sherpapay/core'
import { Providers } from '@/components/providers'
import { Header } from '@/components/header'
import { BottomNav } from '@/components/bottom-nav'
import { EmptyState } from '@/components/empty-state'
import { CELOSCAN_ADDRESS } from '@/lib/celoscan'
import { useHistory } from '@/lib/use-history'

const FILTERS = ['all', 'scheduler', 'CELO', 'cUSD', 'cEUR', 'USDT'] as const
type Filter = (typeof FILTERS)[number]

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(ts).toLocaleDateString()
}

function HistoryView() {
  const { connected, loading, fetching, unavailable, items, address, canLoadMore, loadMore } =
    useHistory()
  const [filter, setFilter] = useState<Filter>('all')

  if (!connected) {
    return (
      <EmptyState
        icon={Clock3}
        title="Connect your wallet"
        description="Connect MiniPay or another Celo wallet to see your transaction history."
        actionHref="/"
        actionLabel="Open command"
      />
    )
  }

  if (loading) {
    return (
      <div className="mx-auto flex max-w-3xl items-center gap-2 text-sm text-foreground/60">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
      </div>
    )
  }

  if (unavailable) {
    return (
      <div className="glass-card mx-auto max-w-3xl rounded-2xl p-5 text-sm">
        <p className="font-bold text-foreground">History temporarily unavailable</p>
        <p className="mt-1 text-foreground/60">
          Celoscan rate-limited this keyless request. Try again shortly, or view your full history
          on Celoscan.
        </p>
        {address && (
          <a
            href={CELOSCAN_ADDRESS(address)}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-xs text-foreground underline"
          >
            View {formatAddress(address)} on Celoscan <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    )
  }

  const filtered = items.filter((i) =>
    filter === 'all'
      ? true
      : filter === 'scheduler'
        ? i.kind === 'scheduler'
        : i.token === filter && i.kind !== 'scheduler',
  )

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">History</h1>
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value as Filter)
          }}
          className="glass-input rounded-2xl px-3 py-2 font-mono text-xs text-foreground"
        >
          {FILTERS.map((f) => (
            <option key={f} value={f} className="bg-background font-sans">
              {f === 'all' ? 'All' : f === 'scheduler' ? 'Schedule' : f}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-foreground/55">No matching transactions.</p>
      ) : (
        <ul className="glass-card divide-y divide-foreground/[0.06] overflow-hidden rounded-2xl dark:divide-white/[0.06]">
          {filtered.map((i) => {
            const Icon =
              i.kind === 'scheduler' ? Repeat : i.direction === 'out' ? ArrowUpRight : ArrowDownLeft
            return (
              <li
                key={`${i.hash}-${i.token}-${i.direction}`}
                className="flex items-center gap-3 p-3.5"
              >
                <span
                  className={
                    i.direction === 'out'
                      ? 'grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive'
                      : 'grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-celo-green/15 text-celo-green-dark dark:text-celo-green-light'
                  }
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {i.kind === 'scheduler'
                      ? 'Schedule execution'
                      : i.direction === 'out'
                        ? 'Sent'
                        : i.direction === 'in'
                          ? 'Received'
                          : 'Self'}{' '}
                    {i.amount} {i.token}
                  </p>
                  <p className="truncate font-mono text-[11px] text-foreground/55">
                    {i.direction === 'out' ? 'to' : 'from'} {formatAddress(i.counterparty)} ·{' '}
                    {relativeTime(i.timestamp)}
                  </p>
                </div>
                <a
                  href={i.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="View on Celoscan"
                  className="text-foreground/50 transition-colors hover:text-foreground"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </li>
            )
          })}
        </ul>
      )}

      {canLoadMore && (
        <button
          type="button"
          disabled={fetching}
          onClick={() => {
            loadMore()
          }}
          className="mx-auto block rounded-2xl bg-foreground/[0.06] px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-foreground/[0.12] disabled:opacity-50 dark:bg-white/[0.06] dark:hover:bg-white/[0.12]"
        >
          {fetching ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  )
}

export default function HistoryPage() {
  return (
    <Providers>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="container flex-1 py-6 pb-24 md:py-8">
          <HistoryView />
        </main>
        <BottomNav />
      </div>
    </Providers>
  )
}
