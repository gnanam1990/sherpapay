import { describe, it, expect } from 'vitest'
import { DEFAULT_SCHEDULE_CYCLES, scheduleEndTime, scheduleEscrowTotal } from '../scheduler-abi.js'

// These back the Fixed-12-cycle MVP (endTime caps the schedule; escrow
// is prefunded as amount * cycles). Pure math — verified directly.
describe('schedule helpers', () => {
  it('DEFAULT_SCHEDULE_CYCLES is 12 (MVP)', () => {
    expect(DEFAULT_SCHEDULE_CYCLES).toBe(12)
  })

  it('scheduleEndTime = start + interval * cycles', () => {
    const start = 1_700_000_000n
    const weekly = 604_800n
    expect(scheduleEndTime(start, weekly, 12)).toBe(start + weekly * 12n)
    // default cycles
    expect(scheduleEndTime(start, weekly)).toBe(start + weekly * BigInt(DEFAULT_SCHEDULE_CYCLES))
  })

  it('scheduleEscrowTotal = amount * cycles', () => {
    const amount = 10_000_000_000_000_000n // 0.01 (18dp)
    expect(scheduleEscrowTotal(amount, 12)).toBe(amount * 12n)
    expect(scheduleEscrowTotal(amount)).toBe(amount * BigInt(DEFAULT_SCHEDULE_CYCLES))
  })

  it('single-cycle schedule: endTime = start + interval, escrow = amount', () => {
    expect(scheduleEndTime(0n, 3600n, 1)).toBe(3600n)
    expect(scheduleEscrowTotal(5n, 1)).toBe(5n)
  })
})
