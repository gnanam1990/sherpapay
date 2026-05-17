'use client'

import { useAccount, useChainId, usePublicClient, useWriteContract } from 'wagmi'
import { celo, celoAlfajores } from 'wagmi/chains'
import { PiggyBank, Target } from 'lucide-react'
import { erc20Abi, VAULT_ADDRESS } from '@sherpapay/celo'
import { formatAddress, weiToAmount, type TokenSymbol } from '@sherpapay/core'
import { Providers } from '@/components/providers'
import { Header } from '@/components/header'
import { BottomNav } from '@/components/bottom-nav'
import { EmptyState } from '@/components/empty-state'
import { TOKENS } from '@/lib/wagmi'
import { SkeletonCard, SkeletonList } from '@/components/skeleton'
import {
  useUserGoals,
  useGoal,
  useGoalProgress,
  useContribute,
  useWithdraw,
  useEmergencyWithdraw,
} from '@/lib/vault-hooks'

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

function GoalCard({ goalId, chainId }: { goalId: Hex; chainId: number }) {
  const { data: goal, isLoading, refetch } = useGoal(goalId)
  const { data: progressBps } = useGoalProgress(goalId)
  const contribute = useContribute()
  const withdraw = useWithdraw()
  const emergency = useEmergencyWithdraw()
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient()

  if (isLoading) {
    return <SkeletonCard />
  }
  if (!goal) return null

  const symbol = tokenSymbol(chainId, goal.token)
  const pct = progressBps !== undefined ? Number(progressBps) / 100 : 0
  const busy = contribute.isPending || withdraw.isPending || emergency.isPending

  async function contributeMonthly() {
    if (!publicClient || !goal) return
    try {
      const approveHash = await writeContractAsync({
        address: goal.token,
        abi: erc20Abi,
        functionName: 'approve',
        args: [VAULT_ADDRESS, goal.monthlyContribution],
      })
      await publicClient.waitForTransactionReceipt({ hash: approveHash })
      await contribute(goalId, goal.monthlyContribution)
      await refetch()
    } catch {
      /* error surfaced via hook state; leave the card interactive */
    }
  }

  async function run(action: (id: Hex) => Promise<unknown>) {
    try {
      await action(goalId)
      await refetch()
    } catch {
      /* see above */
    }
  }

  return (
    <div className="glass-card animate-fade-in space-y-3.5 rounded-3xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-bold text-foreground">{goal.label}</p>
          <p className="mt-0.5 font-mono text-[11px] text-foreground/55">{formatAddress(goalId)}</p>
        </div>
        <div className="text-right font-mono text-sm font-bold text-foreground">
          {weiToAmount(goal.currentAmount, symbol)} {symbol}
          <span className="block text-[10px] font-medium text-foreground/50">
            / {weiToAmount(goal.targetAmount, symbol)}
          </span>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-foreground/[0.08] dark:bg-white/[0.08]">
        <div
          className={`h-full rounded-full ${pct >= 80 ? 'bg-progress-gradient-green' : 'bg-progress-gradient'}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      <div className="font-mono text-[11px] font-semibold text-foreground/70">
        {goal.achieved ? 'Achieved ✨' : `${pct.toFixed(0)}% complete`} ·{' '}
        {weiToAmount(goal.monthlyContribution, symbol)} {symbol}/mo
      </div>

      {!goal.emergencyWithdrawn && (
        <div className="flex flex-wrap gap-2">
          {!goal.achieved && (
            <button
              disabled={busy}
              onClick={() => void contributeMonthly()}
              className="inline-flex items-center gap-1 rounded-2xl bg-foreground/[0.06] px-3.5 py-2 text-xs font-semibold text-foreground transition hover:bg-foreground/[0.12] disabled:opacity-50 dark:bg-white/[0.06] dark:hover:bg-white/[0.12]"
            >
              <PiggyBank className="h-3.5 w-3.5" /> Contribute monthly
            </button>
          )}
          {goal.achieved && (
            <button
              disabled={busy}
              onClick={() => void run(withdraw)}
              className="inline-flex items-center gap-1 rounded-2xl border border-celo-green/50 px-3.5 py-2 text-xs font-semibold text-celo-green-dark transition hover:bg-celo-green/10 disabled:opacity-50 dark:text-celo-green-light"
            >
              Withdraw
            </button>
          )}
          <button
            disabled={busy}
            onClick={() => void run(emergency)}
            className="inline-flex items-center gap-1 rounded-2xl border border-destructive/50 px-3.5 py-2 text-xs font-semibold text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
          >
            Emergency withdraw (2% fee)
          </button>
        </div>
      )}
    </div>
  )
}

// Child of <Providers> so wagmi hooks see WagmiProvider during prerender.
function GoalsView() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { data: goalIds, isLoading } = useUserGoals(address)

  if (!isConnected) {
    return (
      <EmptyState
        icon={Target}
        title="Connect your wallet"
        description="Connect MiniPay or another Celo wallet to see your savings goals."
        actionHref="/"
        actionLabel="Open command"
        tone="celo"
      />
    )
  }
  if (isLoading) {
    return <SkeletonList />
  }
  if (!goalIds || goalIds.length === 0) {
    return (
      <EmptyState
        icon={Target}
        title="No savings goals yet"
        description="Goal creation lands with the savings flow (Phase 2 wires the vault contract)."
        actionHref="/"
        actionLabel="Open command"
        tone="celo"
      />
    )
  }
  return (
    <div className="stagger mx-auto grid w-full max-w-3xl gap-3">
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-foreground">
        Your savings goals
      </h1>
      {goalIds.map((id) => (
        <GoalCard key={id} goalId={id} chainId={chainId} />
      ))}
    </div>
  )
}

export default function GoalsPage() {
  return (
    <Providers>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="container flex-1 py-6 pb-24 md:py-8">
          <GoalsView />
        </main>
        <BottomNav />
      </div>
    </Providers>
  )
}
