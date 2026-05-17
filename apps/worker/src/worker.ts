import { createServer } from 'node:http'
import cron from 'node-cron'
import { createPublicClient, createWalletClient, http, formatEther } from 'viem'
import { celo } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { schedulerAbi, SCHEDULER_ADDRESS } from '@sherpapay/celo'
import { loadConfig, planExecution, dayKey, buildHealthPayload, type Hex } from './execution.js'

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

function recordSuccess(count = 1): void {
  const today = dayKey(new Date())
  if (today !== metrics.todayKey) {
    metrics.todayKey = today
    metrics.executedToday = 0
  }
  metrics.executedToday += count
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

  // One tx for all due ids — cheaper gas than N executeDuePayment calls.
  async function executeBatch(ids: readonly Hex[]): Promise<Hex> {
    const txHash = await walletClient.writeContract({
      address: SCHEDULER_ADDRESS,
      abi: schedulerAbi,
      functionName: 'executeBatch',
      args: [ids],
    })
    await publicClient.waitForTransactionReceipt({ hash: txHash })
    return txHash
  }

  // Per-id fallback when a batch tx fails (e.g. one bad schedule
  // shouldn't strand the rest).
  async function executeEachIndividually(ids: readonly Hex[]): Promise<void> {
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

  async function processDue(): Promise<void> {
    let ids: readonly Hex[]
    try {
      ids = await fetchDueScheduleIds()
    } catch (err) {
      metrics.lastError = err instanceof Error ? err.message : 'fetch_due_failed'
      console.error('Failed to read due schedules:', err)
      return
    }

    const mode = planExecution(ids)
    if (mode === 'none') {
      console.log('No due schedules.')
      return
    }

    if (mode === 'single') {
      await executeEachIndividually(ids)
      return
    }

    // mode === 'batch': one tx for all; fall back to per-id on failure.
    console.log(`Found ${ids.length} due schedules; executing as a batch.`)
    try {
      const txHash = await executeBatch(ids)
      recordSuccess(ids.length)
      console.log(`Batch executed ${ids.length} schedules → ${txHash}`)
    } catch (err) {
      metrics.lastError = err instanceof Error ? err.message : 'batch_failed'
      console.error('Batch execution failed; falling back to individual:', err)
      await executeEachIndividually(ids)
    }
  }

  // Health endpoint — gives reviewers / uptime monitors proof the
  // worker is real, funded, and running.
  const healthServer = createServer((req, res) => {
    if (req.url?.split('?')[0] !== '/health') {
      res.writeHead(404).end()
      return
    }
    void (async () => {
      let pendingDue = 0
      let walletCelo = '0'
      try {
        const due = await fetchDueScheduleIds()
        pendingDue = due.length
        walletCelo = formatEther(await publicClient.getBalance({ address: account.address }))
      } catch (err) {
        metrics.lastError = err instanceof Error ? err.message : 'health_probe_failed'
      }
      const payload = buildHealthPayload({
        signer: account.address,
        scheduler: SCHEDULER_ADDRESS,
        lastSuccessAt: metrics.lastSuccessAt,
        executedToday: metrics.executedToday,
        pendingDue,
        walletCelo,
        lastError: metrics.lastError,
      })
      res.writeHead(payload.status === 'ok' ? 200 : 503, {
        'content-type': 'application/json',
      })
      res.end(JSON.stringify(payload))
    })()
  })
  healthServer.listen(config.healthPort, () => {
    console.log(`Health endpoint on :${config.healthPort}/health`)
  })

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
