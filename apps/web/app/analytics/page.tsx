'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { celo, celoAlfajores } from 'wagmi/chains'
import { BarChart3, TrendingUp, Calendar, Target, Users } from 'lucide-react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { formatAddress, weiToAmount, type TokenSymbol } from '@sherpapay/core'
import { Providers } from '@/components/providers'
import { Header } from '@/components/header'
import { BottomNav } from '@/components/bottom-nav'
import { EmptyState } from '@/components/empty-state'
import { SkeletonList } from '@/components/skeleton'
import { TOKENS } from '@/lib/wagmi'
import { useHistory } from '@/lib/use-history'
import { useUserSchedules, useSchedule } from '@/lib/scheduler-hooks'
import { useUserGoals, useGoal } from '@/lib/vault-hooks'
import {
  aggregateOutflow,
  aggregateRecipients,
  aggregateScheduleStats,
  type ScheduleLike,
} from '@/lib/analytics'

type Hex = `0x${string}`

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

// ─── Hidden per-id readers (real on-chain data, no fabricated stats) ──

function ScheduleProbe({
  id,
  chainId,
  onLoad,
}: {
  id: Hex
  chainId: number
  onLoad: (id: string, s: ScheduleLike) => void
}) {
  const { data } = useSchedule(id)
  useEffect(() => {
    if (data) {
      onLoad(id, {
        status: data.status,
        remainingBalance: data.remainingBalance,
        token: tokenSymbol(chainId, data.token),
      })
    }
  }, [data, id, chainId, onLoad])
  return null
}

interface GoalSnapshot {
  token: TokenSymbol
  current: bigint
  target: bigint
  achieved: boolean
}

function GoalProbe({
  id,
  chainId,
  onLoad,
}: {
  id: Hex
  chainId: number
  onLoad: (id: string, g: GoalSnapshot) => void
}) {
  const { data } = useGoal(id)
  useEffect(() => {
    if (data) {
      onLoad(id, {
        token: tokenSymbol(chainId, data.token),
        current: data.currentAmount,
        target: data.targetAmount,
        achieved: data.achieved,
      })
    }
  }, [data, id, chainId, onLoad])
  return null
}

// ─── Sections ────────────────────────────────────────────────────────

function Card({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof BarChart3
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="glass-card animate-fade-in rounded-3xl p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-celo-green-dark dark:text-celo-green-light" />
        <h2 className="font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function tokenChips(byToken: Record<string, number>): string {
  const entries = Object.entries(byToken)
  if (entries.length === 0) return '—'
  return entries.map(([t, v]) => `${v % 1 === 0 ? v : v.toFixed(2)} ${t}`).join(' · ')
}

function last30Series(byDate: Record<string, number>): { day: string; count: number }[] {
  const out: { day: string; count: number }[] = []
  const today = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i),
    )
    const key = d.toISOString().slice(0, 10)
    out.push({ day: key.slice(5), count: byDate[key] ?? 0 })
  }
  return out
}

function AnalyticsView() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const history = useHistory()
  const { data: scheduleIds } = useUserSchedules(address)
  const { data: goalIds } = useUserGoals(address)

  const [sched, setSched] = useState<Record<string, ScheduleLike>>({})
  const [goals, setGoals] = useState<Record<string, GoalSnapshot>>({})

  const onSched = useCallback((id: string, s: ScheduleLike) => {
    setSched((m) => (m[id] === s ? m : { ...m, [id]: s }))
  }, [])
  const onGoal = useCallback((id: string, g: GoalSnapshot) => {
    setGoals((m) => ({ ...m, [id]: g }))
  }, [])

  const outflow = useMemo(() => aggregateOutflow(history.items, 30), [history.items])
  const recipients = useMemo(() => aggregateRecipients(history.items, 5), [history.items])
  const scheduleStats = useMemo(() => aggregateScheduleStats(Object.values(sched)), [sched])
  const series = useMemo(() => last30Series(outflow.byDate), [outflow.byDate])

  const goalList = Object.values(goals)
  const goalsAchieved = goalList.filter((g) => g.achieved).length
  const savedByToken = useMemo(() => {
    const acc: Record<string, bigint> = {}
    for (const g of goalList) acc[g.token] = (acc[g.token] ?? BigInt(0)) + g.current
    return acc
  }, [goalList])

  if (!isConnected) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Connect your wallet"
        description="Connect MiniPay or another Celo wallet to see your spending analytics."
        actionHref="/"
        actionLabel="Open command"
        tone="celo"
      />
    )
  }

  const ids = scheduleIds ?? []
  const gids = goalIds ?? []
  const maxRecipient = recipients[0]?.count ?? 1

  return (
    <div className="stagger mx-auto grid w-full max-w-3xl gap-3">
      {ids.map((id) => (
        <ScheduleProbe key={id} id={id} chainId={chainId} onLoad={onSched} />
      ))}
      {gids.map((id) => (
        <GoalProbe key={id} id={id} chainId={chainId} onLoad={onGoal} />
      ))}

      <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-foreground">Analytics</h1>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card icon={TrendingUp} title="Sent · last 30 days">
          <p className="font-mono text-2xl font-bold text-foreground">
            {tokenChips(outflow.byToken)}
          </p>
          <p className="mt-1 text-xs text-foreground/55">
            {outflow.count} outgoing transaction{outflow.count === 1 ? '' : 's'} · summed per token
            (not across tokens)
          </p>
        </Card>

        <Card icon={Calendar} title="Active schedules">
          <p className="font-mono text-2xl font-bold text-foreground">{scheduleStats.active}</p>
          <p className="mt-1 text-xs text-foreground/55">
            Locked:{' '}
            {(Object.entries(scheduleStats.lockedByToken) as [TokenSymbol, bigint][])
              .map(([t, v]) => `${weiToAmount(v, t)} ${t}`)
              .join(' · ') || '—'}
          </p>
        </Card>
      </div>

      <Card icon={Target} title="Goals">
        {gids.length === 0 ? (
          <p className="text-sm text-foreground/55">No savings goals yet.</p>
        ) : (
          <p className="text-sm text-foreground">
            <span className="font-mono font-bold">{gids.length}</span> goal
            {gids.length === 1 ? '' : 's'} ·{' '}
            <span className="font-mono font-bold">{goalsAchieved}</span> achieved · saved{' '}
            <span className="font-mono">
              {(Object.entries(savedByToken) as [TokenSymbol, bigint][])
                .map(([t, v]) => `${weiToAmount(v, t)} ${t}`)
                .join(' · ') || '—'}
            </span>
          </p>
        )}
      </Card>

      <Card icon={BarChart3} title="Send frequency · last 30 days">
        {history.loading ? (
          <SkeletonList />
        ) : history.unavailable ? (
          <p className="text-sm text-foreground/55">
            History is unavailable right now (keyless Celoscan rate limit). Charts fill in once it
            responds — nothing is fabricated.
          </p>
        ) : outflow.count === 0 ? (
          <p className="text-sm text-foreground/55">
            No outgoing transactions in the last 30 days.
          </p>
        ) : (
          <div className="h-44 w-full text-celo-green-dark dark:text-celo-green-light">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <XAxis
                  dataKey="day"
                  interval={6}
                  tick={{ fontSize: 10, fill: 'currentColor' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(127,127,127,0.12)' }}
                  contentStyle={{
                    background: 'rgba(20,20,24,0.92)',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 12,
                    color: '#fff',
                  }}
                />
                <Bar dataKey="count" fill="currentColor" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card icon={Users} title="Top recipients">
        {recipients.length === 0 ? (
          <p className="text-sm text-foreground/55">No outgoing transactions yet.</p>
        ) : (
          <ul className="space-y-2">
            {recipients.map((r) => (
              <li key={r.address} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate font-mono text-[11px] text-foreground/70">
                  {formatAddress(r.address)}
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-foreground/[0.08] dark:bg-white/[0.08]">
                  <span
                    className="block h-full rounded-full bg-accent-gradient"
                    style={{ width: `${Math.max(8, (r.count / maxRecipient) * 100)}%` }}
                  />
                </span>
                <span className="w-6 shrink-0 text-right font-mono text-[11px] font-semibold text-foreground">
                  {r.count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <Providers>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="container flex-1 py-6 pb-24 md:py-8">
          <AnalyticsView />
        </main>
        <BottomNav />
      </div>
    </Providers>
  )
}
