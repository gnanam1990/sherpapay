import type { Frequency } from '@sherpapay/core'

const DAY_SECONDS = 86_400n
const WEEK_SECONDS = 604_800n
/** 30 days — matches the schedule flow's monthly interval. */
const MONTH_SECONDS = 2_592_000n

/**
 * Seconds between contributions for a parsed frequency.
 * Returns `null` for a non-recurring ('once') frequency — a savings goal
 * must be recurring.
 */
export function frequencyToSeconds(frequency: Frequency): bigint | null {
  switch (frequency.kind) {
    case 'daily':
      return DAY_SECONDS
    case 'weekly':
      return WEEK_SECONDS
    case 'monthly':
      return MONTH_SECONDS
    case 'custom':
      return BigInt(frequency.intervalSeconds)
    case 'once':
    default:
      return null
  }
}

/**
 * Advisory completion date for a goal: `startTime + durationCycles * interval`.
 *
 * This is the spec formula `startTime + (targetAmount / contribution) *
 * frequencyInSeconds` — `durationCycles` is exactly `ceil(target /
 * contribution)`. The vault stores this as `targetDate` metadata only; goal
 * achievement is purely funding-based, so this never gates withdrawal of an
 * achieved goal.
 */
export function goalTargetDate(
  startTime: bigint,
  interval: bigint,
  durationCycles: number,
): bigint {
  if (!Number.isInteger(durationCycles) || durationCycles <= 0) {
    throw new Error(`durationCycles must be a positive integer, got ${durationCycles}`)
  }
  return startTime + interval * BigInt(durationCycles)
}
