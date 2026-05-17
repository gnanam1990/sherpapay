'use client'

import { useAccount, useChainId, usePublicClient, useWriteContract } from 'wagmi'
import { celo, celoAlfajores } from 'wagmi/chains'
import { Loader2, PiggyBank, Target } from 'lucide-react'
import { erc20Abi, VAULT_ADDRESS } from '@sherpapay/celo'
import { formatAddress, weiToAmount, type TokenSymbol } from '@sherpapay/core'
import { Providers } from '@/components/providers'
import { Header } from '@/components/header'
import { BottomNav } from '@/components/bottom-nav'
import { EmptyState } from '@/components/empty-state'
import { TOKENS } from '@/lib/wagmi'
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
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-card/70 p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading goal…
      </div>
    )
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
    <div className="space-y-3 rounded-lg border border-border/70 bg-card/80 p-4 shadow-soft-panel">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{goal.label}</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{formatAddress(goalId)}</p>
        </div>
        <span className="shrink-0 rounded-full border border-border/70 bg-background/50 px-2 py-1 text-xs">
          {goal.achieved ? 'Achieved' : `${pct.toFixed(0)}%`}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-celo" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
        <div>
          <p className="text-foreground">
            {weiToAmount(goal.currentAmount, symbol)} / {weiToAmount(goal.targetAmount, symbol)}{' '}
            {symbol}
          </p>
          <p>saved</p>
        </div>
        <div>
          <p className="text-foreground">
            {weiToAmount(goal.monthlyContribution, symbol)} {symbol}
          </p>
          <p>monthly</p>
        </div>
      </div>

      {!goal.emergencyWithdrawn && (
        <div className="flex flex-wrap gap-2">
          {!goal.achieved && (
            <button
              disabled={busy}
              onClick={() => void contributeMonthly()}
              className="inline-flex items-center gap-1 rounded-md border border-border/80 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <PiggyBank className="h-3.5 w-3.5" /> Contribute monthly
            </button>
          )}
          {goal.achieved && (
            <button
              disabled={busy}
              onClick={() => void run(withdraw)}
              className="inline-flex items-center gap-1 rounded-md border border-celo/50 px-3 py-2 text-xs font-medium text-celo transition-colors hover:bg-celo/10 disabled:opacity-50"
            >
              Withdraw
            </button>
          )}
          <button
            disabled={busy}
            onClick={() => void run(emergency)}
            className="inline-flex items-center gap-1 rounded-md border border-destructive/50 px-3 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
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
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your goals…
      </div>
    )
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
    <div className="mx-auto grid w-full max-w-3xl gap-4">
      <h1 className="text-2xl font-semibold text-foreground">Your savings goals</h1>
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
