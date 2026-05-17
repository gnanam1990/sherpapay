'use client'

import { useAccount, useChainId } from 'wagmi'
import { celo, celoAlfajores } from 'wagmi/chains'
import { CalendarClock, Loader2, Pause, Play, X } from 'lucide-react'
import { formatAddress, weiToAmount, type TokenSymbol } from '@sherpapay/core'
import { Providers } from '@/components/providers'
import { Header } from '@/components/header'
import { BottomNav } from '@/components/bottom-nav'
import { EmptyState } from '@/components/empty-state'
import { TOKENS } from '@/lib/wagmi'
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
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-card/70 p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading schedule…
      </div>
    )
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

  return (
    <div className="space-y-3 rounded-lg border border-border/70 bg-card/80 p-4 shadow-soft-panel">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {amount} {symbol}{' '}
            <span className="text-muted-foreground">→ {formatAddress(schedule.recipient)}</span>
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {formatAddress(scheduleId)}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-border/70 bg-background/50 px-2 py-1 text-xs">
          {status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid-cols-3">
        <div>
          <p className="text-foreground">{remainingCycles.toString()} cycles funded</p>
          <p>remaining escrow</p>
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
              className="inline-flex items-center gap-1 rounded-md border border-border/80 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <Pause className="h-3.5 w-3.5" /> Pause
            </button>
          )}
          {status === 'Paused' && (
            <button
              disabled={busy}
              onClick={() => void run(resume)}
              className="inline-flex items-center gap-1 rounded-md border border-border/80 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" /> Resume
            </button>
          )}
          <button
            disabled={busy}
            onClick={() => void run(cancel)}
            className="inline-flex items-center gap-1 rounded-md border border-destructive/50 px-3 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
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
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your schedules…
        </div>
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
        <div className="mx-auto grid w-full max-w-3xl gap-4">
          <h1 className="text-2xl font-semibold text-foreground">Your schedules</h1>
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
