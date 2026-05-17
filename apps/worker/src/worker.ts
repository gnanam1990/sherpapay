import cron from 'node-cron'
import { createPublicClient, createWalletClient, http } from 'viem'
import { celo } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { schedulerAbi, SCHEDULER_ADDRESS } from '@sherpapay/celo'
import { loadConfig, planExecution, dayKey, type Hex } from './execution.js'

interface Metrics {
  lastSuccessAt: string | null
  executedToday: number
  todayKey: string
  lastError: string | null
}

const metrics: Metrics = {
  lastSuccessAt: null,
  executedToday: 0,
  todayKey: dayKey(new Date()),
  lastError: null,
}

function recordSuccess(): void {
  const today = dayKey(new Date())
  if (today !== metrics.todayKey) {
    metrics.todayKey = today
    metrics.executedToday = 0
  }
  metrics.executedToday += 1
  metrics.lastSuccessAt = new Date().toISOString()
  metrics.lastError = null
}

async function main(): Promise<void> {
  // loadConfig throws on a missing/placeholder key → caught below,
  // so the worker fails loudly at startup and never fakes executions.
  const config = loadConfig(process.env)
  const account = privateKeyToAccount(config.privateKey)

  const publicClient = createPublicClient({ chain: celo, transport: http(config.rpcUrl) })
  const walletClient = createWalletClient({
    account,
    chain: celo,
    transport: http(config.rpcUrl),
  })

  // Due ids come straight from the contract — the source of truth.
  async function fetchDueScheduleIds(): Promise<readonly Hex[]> {
    return publicClient.readContract({
      address: SCHEDULER_ADDRESS,
      abi: schedulerAbi,
      functionName: 'getDueSchedules',
      args: [BigInt(config.dueLimit)],
    })
  }

  async function executeDue(scheduleId: Hex): Promise<Hex> {
    const txHash = await walletClient.writeContract({
      address: SCHEDULER_ADDRESS,
      abi: schedulerAbi,
      functionName: 'executeDuePayment',
      args: [scheduleId],
    })
    await publicClient.waitForTransactionReceipt({ hash: txHash })
    return txHash
  }

  async function processDue(): Promise<void> {
    let ids: readonly Hex[]
    try {
      ids = await fetchDueScheduleIds()
    } catch (err) {
      metrics.lastError = err instanceof Error ? err.message : 'fetch_due_failed'
      console.error('Failed to read due schedules:', err)
      return
    }

    if (planExecution(ids) === 'none') {
      console.log('No due schedules.')
      return
    }

    console.log(`Found ${ids.length} due schedule(s); executing individually.`)
    for (const id of ids) {
      try {
        const txHash = await executeDue(id)
        recordSuccess()
        console.log(`Executed ${id} → ${txHash}`)
      } catch (err) {
        metrics.lastError = err instanceof Error ? err.message : 'execution_failed'
        console.error(`Execution failed for ${id}:`, err)
      }
    }
  }

  console.log('SherpaPay Worker starting (contract-driven execution)')
  console.log(`Signer: ${account.address}`)
  console.log(`Scheduler: ${SCHEDULER_ADDRESS}`)
  console.log(`Cron: ${config.cronSchedule}`)

  await processDue()

  cron.schedule(config.cronSchedule, () => {
    void processDue().catch((err: unknown) => {
      console.error('Scheduled run failed:', err)
    })
  })

  console.log('Worker running. Press Ctrl+C to stop.')
}

main().catch((err: unknown) => {
  console.error('Worker failed to start:', err instanceof Error ? err.message : err)
  process.exit(1)
})
