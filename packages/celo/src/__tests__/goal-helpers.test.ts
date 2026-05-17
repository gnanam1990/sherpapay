import { describe, it, expect } from 'vitest'
import { frequencyToSeconds, goalTargetDate } from '../goal-helpers.js'

// Pure math backing the natural-language goal flow. The vault treats
// targetDate as advisory (a goal completes when funded to target), so
// these only need to produce a sensible "by date" for the UI + the
// `monthly`/`targetDate` metadata args of createGoal.
describe('frequencyToSeconds', () => {
  it('maps daily / weekly / monthly to seconds', () => {
    expect(frequencyToSeconds({ kind: 'daily' })).toBe(86_400n)
    expect(frequencyToSeconds({ kind: 'weekly', dayOfWeek: 1 })).toBe(604_800n)
    expect(frequencyToSeconds({ kind: 'monthly', dayOfMonth: 1 })).toBe(2_592_000n)
  })

  it('passes through a custom interval', () => {
    expect(frequencyToSeconds({ kind: 'custom', intervalSeconds: 3600 })).toBe(3600n)
  })

  it('returns null for a non-recurring (once) frequency', () => {
    expect(frequencyToSeconds({ kind: 'once' })).toBeNull()
  })
})

describe('goalTargetDate', () => {
  it('= startTime + durationCycles * interval', () => {
    const start = 1_700_000_000n
    const weekly = 604_800n
    expect(goalTargetDate(start, weekly, 20)).toBe(start + weekly * 20n)
  })

  it('matches the spec formula (targetAmount / contribution) * interval', () => {
    // save 5 cUSD weekly target 100 -> 20 cycles
    const start = 0n
    expect(goalTargetDate(start, 604_800n, 20)).toBe(604_800n * 20n)
  })

  it('single cycle: targetDate = start + interval', () => {
    expect(goalTargetDate(0n, 86_400n, 1)).toBe(86_400n)
  })

  it('throws on a non-positive cycle count', () => {
    expect(() => goalTargetDate(0n, 86_400n, 0)).toThrow()
    expect(() => goalTargetDate(0n, 86_400n, -3)).toThrow()
  })
})
