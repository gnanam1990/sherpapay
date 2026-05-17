'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAccount, useChainId } from 'wagmi'
import { celo, celoAlfajores } from 'wagmi/chains'
import { Repeat, Plus, ArrowRight, CalendarClock } from 'lucide-react'
import { formatAddress, weiToAmount, type TokenSymbol } from '@sherpapay/core'
import { categoryForSchedule } from '@sherpapay/parser'
import { Providers } from '@/components/providers'
import { Header } from '@/components/header'
import { BottomNav } from '@/components/bottom-nav'
import { EmptyState } from '@/components/empty-state'
import { SkeletonList } from '@/components/skeleton'
import { TOKENS } from '@/lib/wagmi'
import { useUserSchedules, useSchedule } from '@/lib/scheduler-hooks'

type Hex = `0x${string}`

const WEEK = BigInt(604_800)
const MONTH = BigInt(2_592_000) // 30d — matches the schedule-create interval

function supportedChainId(chainId: number): keyof typeof TOKENS {
  return chainId === celoAlfajores.id ? celoAlfajores.id : celo.id
}

function tokenSymbol(chainId: number, address: string): TokenSymbol {
  const map = TOKENS[supportedChainId(chainId)]
  const entry = (Object.entries(map) as [TokenSymbol, string][]).find(
    ([, addr]) => addr.toLowerCase() === address.toLowerCase(),
  )
  return entry?.[0] ?? 'cUSD'
}

function freqLabel(interval: bigint): 'Weekly' | 'Monthly' | null {
  if (interval === WEEK) return 'Weekly'
  if (interval === MONTH) return 'Monthly'
  return null
}

interface Sub {
  id: Hex
  recipient: string
  amount: bigint
  token: TokenSymbol
  interval: bigint
  nextExecution: bigint
  remainingBalance: bigint
  category: string
}

// Hidden per-id reader: only surfaces ACTIVE weekly/monthly schedules
// (a subscription is an ongoing recurring charge). Real on-chain data.
function SubProbe({
  id,
  chainId,
  onLoad,
}: {
  id: Hex
  chainId: number
  onLoad: (id: string, sub: Sub | null) => void
}) {
  const { data } = useSchedule(id)
  useEffect(() => {
    if (!data) return
    const interval: bigint = data.interval
    const isActive = data.status === 0
    if (!isActive || freqLabel(interval) === null) {
      onLoad(id, null)
      return
    }
    onLoad(id, {
      id,
      recipient: data.recipient,
      amount: data.amount,
      token: tokenSymbol(chainId, data.token),
      interval,
      nextExecution: data.nextExecution,
      remainingBalance: data.remainingBalance,
      category: categoryForSchedule(Number(interval)),
    })
  }, [data, id, chainId, onLoad])
  return null
}

function fmtDate(unixSeconds: bigint): string {
  if (unixSeconds === BigInt(0)) return '—'
  return new Date(Number(unixSeconds) * 1000).toLocaleDateString()
}

const PREFILL_TEMPLATE = 'send 5 cUSD to NAME every month'

function SubscriptionsView() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const chainId = useChainId()

  function addSubscription() {
    // One-shot handoff: ChatInput reads + clears this on mount. No fake
    // recipient — "NAME" is an obvious placeholder the user replaces.
    window.sessionStorage.setItem('sherpapay.prefill', PREFILL_TEMPLATE)
    router.push('/')
  }
  const { data: scheduleIds, isLoading } = useUserSchedules(address)
  const [subs, setSubs] = useState<Record<string, Sub | null>>({})

  useEffect(() => {
    setSubs({})
  }, [address])

  const onLoad = useCallback((id: string, sub: Sub | null) => {
    setSubs((m) => ({ ...m, [id]: sub }))
  }, [])

  if (!isConnected) {
    return (
      <EmptyState
        icon={Repeat}
        title="Connect your wallet"
        description="Connect MiniPay or another Celo wallet to see your recurring subscriptions."
        actionHref="/"
        actionLabel="Open command"
        tone="celo"
      />
    )
  }

  const ids = scheduleIds ?? []
  const list = Object.values(subs).filter((s): s is Sub => s !== null)

  // Group by recipient (the scheduler stores no category — see
  // ScheduleCategory; this is honest grouping, not a fake construct).
  const groups = new Map<string, Sub[]>()
  for (const s of list) {
    const key = s.recipient.toLowerCase()
    groups.set(key, [...(groups.get(key) ?? []), s])
  }

  return (
    <div className="stagger mx-auto grid w-full max-w-3xl gap-3">
      {ids.map((id) => (
        <SubProbe key={id} id={id} chainId={chainId} onLoad={onLoad} />
      ))}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Recurring subscriptions
          </h1>
          <p className="mt-1 text-sm text-foreground/60">
            Your weekly &amp; monthly schedules, grouped by recipient. This is a view over your
            on-chain schedules — not a separate contract.
          </p>
        </div>
        <button
          type="button"
          onClick={addSubscription}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-accent-gradient px-4 py-2.5 text-sm font-bold text-white shadow-glow-accent transition hover:opacity-95"
        >
          <Plus className="h-4 w-4" /> Add subscription
        </button>
      </div>

      {isLoading ? (
        <SkeletonList />
      ) : ids.length === 0 || (Object.keys(subs).length === ids.length && list.length === 0) ? (
        <div className="glass-card rounded-3xl p-6 text-center">
          <CalendarClock className="mx-auto mb-3 h-8 w-8 text-foreground/40" />
          <p className="text-sm text-foreground/70">
            No weekly or monthly schedules yet. &ldquo;Add subscription&rdquo; opens the command
            prefilled with an editable template:{' '}
            <span className="font-mono">{PREFILL_TEMPLATE}</span>.
          </p>
        </div>
      ) : (
        [...groups.entries()].map(([recipient, items]) => (
          <section key={recipient} className="glass-card animate-fade-in rounded-3xl p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-gradient text-sm font-bold text-white">
                {recipient.slice(2, 3).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-mono text-sm font-bold text-foreground">
                  {formatAddress(recipient)}
                </p>
                <p className="text-[11px] text-foreground/55">
                  {items.length} subscription{items.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>

            <ul className="space-y-2">
              {items.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-foreground/[0.04] px-3.5 py-2.5 dark:bg-white/[0.04]"
                >
                  <span className="font-mono text-sm font-bold text-foreground">
                    {weiToAmount(s.amount, s.token)} {s.token}
                  </span>
                  <span className="rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground/70 dark:bg-white/[0.06]">
                    {freqLabel(s.interval)} · {s.category}
                  </span>
                  <span className="text-[11px] text-foreground/60">
                    next charge {fmtDate(s.nextExecution)}
                  </span>
                  <span className="text-[11px] text-foreground/60">
                    {weiToAmount(s.remainingBalance, s.token)} {s.token} escrowed
                  </span>
                  <Link
                    href={`/schedules#schedule-${s.id}`}
                    className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-foreground underline"
                  >
                    Manage <ArrowRight className="h-3 w-3" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}

export default function SubscriptionsPage() {
  return (
    <Providers>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="container flex-1 py-6 pb-24 md:py-8">
          <SubscriptionsView />
        </main>
        <BottomNav />
      </div>
    </Providers>
  )
}
