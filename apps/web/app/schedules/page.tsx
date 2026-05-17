'use client'

import { useAccount, useChainId } from 'wagmi'
import { celo, celoAlfajores } from 'wagmi/chains'
import { CalendarClock, Pause, Play, X } from 'lucide-react'
import { formatAddress, weiToAmount, type TokenSymbol } from '@sherpapay/core'
import { Providers } from '@/components/providers'
import { Header } from '@/components/header'
import { BottomNav } from '@/components/bottom-nav'
import { EmptyState } from '@/components/empty-state'
import { TOKENS } from '@/lib/wagmi'
import { SkeletonCard, SkeletonList } from '@/components/skeleton'
import {
  useUserSchedules,
  useSchedule,
  usePauseSchedule,
  useResumeSchedule,
  useCancelSchedule,
} from '@/lib/scheduler-hooks'

type Hex = `0x${string}`

const STATUS_LABELS = ['Active', 'Paused', 'Cancelled', 'Expired'] as const
const ZERO = BigInt(0)

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

function formatDate(unixSeconds: bigint): string {
  if (unixSeconds === ZERO) return 'Perpetual'
  return new Date(Number(unixSeconds) * 1000).toLocaleDateString()
}

function ScheduleCard({ scheduleId, chainId }: { scheduleId: Hex; chainId: number }) {
  const { data: schedule, isLoading, refetch } = useSchedule(scheduleId)
  const pause = usePauseSchedule()
  const resume = useResumeSchedule()
  const cancel = useCancelSchedule()

  if (isLoading) {
    return <SkeletonCard />
  }
  if (!schedule) return null

  const symbol = tokenSymbol(chainId, schedule.token)
  const amount = weiToAmount(schedule.amount, symbol)
  const remainingCycles =
    schedule.amount > ZERO ? schedule.remainingBalance / schedule.amount : ZERO
  const status = STATUS_LABELS[schedule.status] ?? 'Unknown'
  const busy = pause.isPending || resume.isPending || cancel.isPending

  async function run(action: (id: Hex) => Promise<unknown>) {
    try {
      await action(scheduleId)
      await refetch()
    } catch {
      /* surfaced by the hook's error field; keep the card usable */
    }
  }

  const statusTone =
    status === 'Active'
      ? 'bg-celo-green/15 text-celo-green-dark dark:text-celo-green-light'
      : status === 'Paused'
        ? 'bg-accent-orange/20 text-accent-orange'
        : 'bg-foreground/[0.08] text-foreground/55 dark:bg-white/[0.08]'

  return (
    <div
      id={`schedule-${scheduleId}`}
      className="glass-card animate-fade-in scroll-mt-24 space-y-3 rounded-2xl p-4"
    >
      <div className="flex items-start gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-gradient font-bold text-white">
          {schedule.recipient.slice(2, 3).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">→ {formatAddress(schedule.recipient)}</p>
          <p className="mt-0.5 font-mono text-[11px] text-foreground/55">
            {formatAddress(scheduleId)}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[15px] font-bold text-foreground">
            {amount} {symbol}
          </p>
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusTone}`}
          >
            {status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 font-mono text-[11px] text-foreground/55">
        <div>
          <p className="text-foreground">{remainingCycles.toString()}</p>
          <p>cycles funded</p>
        </div>
        <div>
          <p className="text-foreground">{formatDate(schedule.nextExecution)}</p>
          <p>next run</p>
        </div>
        <div>
          <p className="text-foreground">{formatDate(schedule.endTime)}</p>
          <p>ends</p>
        </div>
      </div>

      {status !== 'Cancelled' && status !== 'Expired' && (
        <div className="flex flex-wrap gap-2">
          {status === 'Active' && (
            <button
              disabled={busy}
              onClick={() => void run(pause)}
              className="inline-flex items-center gap-1 rounded-2xl bg-foreground/[0.06] px-3.5 py-2 text-xs font-semibold text-foreground transition hover:bg-foreground/[0.12] disabled:opacity-50 dark:bg-white/[0.06] dark:hover:bg-white/[0.12]"
            >
              <Pause className="h-3.5 w-3.5" /> Pause
            </button>
          )}
          {status === 'Paused' && (
            <button
              disabled={busy}
              onClick={() => void run(resume)}
              className="inline-flex items-center gap-1 rounded-2xl bg-foreground/[0.06] px-3.5 py-2 text-xs font-semibold text-foreground transition hover:bg-foreground/[0.12] disabled:opacity-50 dark:bg-white/[0.06] dark:hover:bg-white/[0.12]"
            >
              <Play className="h-3.5 w-3.5" /> Resume
            </button>
          )}
          <button
            disabled={busy}
            onClick={() => void run(cancel)}
            className="inline-flex items-center gap-1 rounded-2xl border border-destructive/50 px-3.5 py-2 text-xs font-semibold text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" /> Cancel &amp; reclaim
          </button>
        </div>
      )}
    </div>
  )
}

// Must be a child of <Providers> so the wagmi hooks see WagmiProvider
// (the page component itself renders Providers, so it is outside it).
function SchedulesView() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { data: scheduleIds, isLoading } = useUserSchedules(address)

  return (
    <>
      {!isConnected ? (
        <EmptyState
          icon={CalendarClock}
          title="Connect your wallet"
          description="Connect MiniPay or another Celo wallet to see your on-chain schedules."
          actionHref="/"
          actionLabel="Open command"
          tone="accent"
        />
      ) : isLoading ? (
        <SkeletonList />
      ) : !scheduleIds || scheduleIds.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No active schedules"
          description='Try: "send 5 cUSD to 0x… every friday"'
          actionHref="/"
          actionLabel="Create one"
          tone="accent"
        />
      ) : (
        <div className="stagger mx-auto grid w-full max-w-3xl gap-3">
          <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-foreground">
            Your schedules
          </h1>
          {scheduleIds.map((id) => (
            <ScheduleCard key={id} scheduleId={id} chainId={chainId} />
          ))}
        </div>
      )}
    </>
  )
}

export default function SchedulesPage() {
  return (
    <Providers>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="container flex-1 py-6 pb-24 md:py-8">
          <SchedulesView />
        </main>
        <BottomNav />
      </div>
    </Providers>
  )
}
