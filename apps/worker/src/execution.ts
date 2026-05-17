/**
 * Pure, side-effect-free helpers for the worker. Kept separate from
 * worker.ts so they can be unit-tested without RPC or a private key.
 */

export type Hex = `0x${string}`

const PRIVATE_KEY_RE = /^0x[0-9a-fA-F]{64}$/
const ZERO_KEY = `0x${'0'.repeat(64)}`

/**
 * Validates WORKER_PRIVATE_KEY. The worker refuses to run without a real
 * key — it must submit real on-chain transactions, never fake them.
 */
export function requireWorkerPrivateKey(raw: string | undefined): Hex {
  if (!raw || raw.trim() === '') {
    throw new Error(
      'WORKER_PRIVATE_KEY is required — the worker submits real on-chain ' +
        'executions and will not start without a funded signer.',
    )
  }
  const key = raw.trim()
  if (!PRIVATE_KEY_RE.test(key)) {
    throw new Error('WORKER_PRIVATE_KEY must be a 0x-prefixed 32-byte hex string.')
  }
  if (key.toLowerCase() === ZERO_KEY) {
    throw new Error('WORKER_PRIVATE_KEY is the zero placeholder — set a real funded key.')
  }
  return key as Hex
}

export interface WorkerConfig {
  privateKey: Hex
  rpcUrl: string
  cronSchedule: string
  dueLimit: number
  healthPort: number
}

export function loadConfig(env: NodeJS.ProcessEnv): WorkerConfig {
  const dueLimit = Number.parseInt(env.DUE_LIMIT ?? '50', 10)
  const healthPort = Number.parseInt(env.HEALTH_PORT ?? '8080', 10)
  return {
    privateKey: requireWorkerPrivateKey(env.WORKER_PRIVATE_KEY),
    rpcUrl: env.CELO_RPC_URL ?? 'https://forno.celo.org',
    cronSchedule: env.CRON_SCHEDULE ?? '* * * * *',
    dueLimit: Number.isFinite(dueLimit) && dueLimit > 0 ? dueLimit : 50,
    healthPort: Number.isFinite(healthPort) && healthPort > 0 ? healthPort : 8080,
  }
}

export type ExecutionMode = 'none' | 'single' | 'batch'

/** Decide how to execute the set of due schedule ids. */
export function planExecution(ids: readonly Hex[]): ExecutionMode {
  if (ids.length === 0) return 'none'
  if (ids.length === 1) return 'single'
  return 'batch'
}

/** UTC day key (YYYY-MM-DD) used to reset the per-day execution counter. */
export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export interface HealthInput {
  signer: string
  scheduler: string
  lastSuccessAt: string | null
  executedToday: number
  pendingDue: number
  walletCelo: string
  lastError: string | null
}

export interface HealthPayload extends HealthInput {
  status: 'ok' | 'degraded'
  checkedAt: string
}

/**
 * Builds the /health JSON. `degraded` when the worker can't pay gas
 * (zero CELO) or the last cycle errored — a signal for leaderboard
 * reviewers / uptime monitors that the worker is real but unhappy.
 */
export function buildHealthPayload(input: HealthInput, now: Date = new Date()): HealthPayload {
  const broke = Number.parseFloat(input.walletCelo) === 0
  const status: HealthPayload['status'] = broke || input.lastError !== null ? 'degraded' : 'ok'
  return { ...input, status, checkedAt: now.toISOString() }
}
