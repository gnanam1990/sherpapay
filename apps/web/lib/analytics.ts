/**
 * Pure analytics aggregations over the user's history + schedules.
 * No I/O, no chain calls — fully unit-tested. The page feeds these
 * real data from useHistory / per-schedule reads (no fabricated stats).
 */

export interface AnalyticsTx {
  amount: string
  token: string
  direction: 'in' | 'out' | 'self'
  counterparty: string
  /** Unix ms. */
  timestamp: number
}

export interface OutflowSummary {
  /** Number of outgoing tx in the window. */
  count: number
  /** Summed amount per token (non-numeric amounts skipped). */
  byToken: Record<string, number>
  /** Outgoing-tx count per UTC date (YYYY-MM-DD) — the frequency chart. */
  byDate: Record<string, number>
}

function utcDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/** Outgoing spend over the last `days`, by token and by day. */
export function aggregateOutflow(
  items: readonly AnalyticsTx[],
  days: number,
  now: number = Date.now(),
): OutflowSummary {
  const cutoff = now - days * 86_400_000
  const byToken: Record<string, number> = {}
  const byDate: Record<string, number> = {}
  let count = 0

  for (const it of items) {
    if (it.direction !== 'out') continue
    // Real history is never in the future; only a lower bound is needed
    // (an upper bound would drop tx later in the current day).
    if (it.timestamp < cutoff) continue
    count += 1
    const n = Number(it.amount)
    if (Number.isFinite(n)) byToken[it.token] = (byToken[it.token] ?? 0) + n
    const d = utcDate(it.timestamp)
    byDate[d] = (byDate[d] ?? 0) + 1
  }

  return { count, byToken, byDate }
}

export interface RecipientStat {
  address: string
  count: number
  byToken: Record<string, number>
}

/** Top `topN` outgoing recipients, ranked by tx count then total volume. */
export function aggregateRecipients(items: readonly AnalyticsTx[], topN = 5): RecipientStat[] {
  const map = new Map<string, RecipientStat>()

  for (const it of items) {
    if (it.direction !== 'out') continue
    const key = it.counterparty.toLowerCase()
    const stat = map.get(key) ?? { address: key, count: 0, byToken: {} }
    stat.count += 1
    const n = Number(it.amount)
    if (Number.isFinite(n)) stat.byToken[it.token] = (stat.byToken[it.token] ?? 0) + n
    map.set(key, stat)
  }

  const volume = (s: RecipientStat): number => Object.values(s.byToken).reduce((a, b) => a + b, 0)

  return [...map.values()].sort((a, b) => b.count - a.count || volume(b) - volume(a)).slice(0, topN)
}

export interface ScheduleLike {
  /** ScheduleStatus: 0=Active 1=Paused 2=Cancelled 3=Expired. */
  status: number
  remainingBalance: bigint
  token: string
}

export interface ScheduleStats {
  total: number
  active: number
  paused: number
  cancelled: number
  expired: number
  /** Sum of remaining (escrowed) balance for active+paused, per token. */
  lockedByToken: Record<string, bigint>
}

export function aggregateScheduleStats(schedules: readonly ScheduleLike[]): ScheduleStats {
  const stats: ScheduleStats = {
    total: schedules.length,
    active: 0,
    paused: 0,
    cancelled: 0,
    expired: 0,
    lockedByToken: {},
  }

  for (const s of schedules) {
    if (s.status === 0) stats.active += 1
    else if (s.status === 1) stats.paused += 1
    else if (s.status === 2) stats.cancelled += 1
    else if (s.status === 3) stats.expired += 1

    if (s.status === 0 || s.status === 1) {
      stats.lockedByToken[s.token] =
        (stats.lockedByToken[s.token] ?? BigInt(0)) + s.remainingBalance
    }
  }

  return stats
}
