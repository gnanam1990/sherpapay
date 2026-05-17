import { describe, it, expect } from 'vitest'
import {
  aggregateOutflow,
  aggregateRecipients,
  aggregateScheduleStats,
  type AnalyticsTx,
  type ScheduleLike,
} from '../analytics'

const DAY = 86_400_000
const NOW = Date.UTC(2026, 4, 17, 12, 0, 0) // 2026-05-17T12:00Z

function tx(p: Partial<AnalyticsTx>): AnalyticsTx {
  return {
    amount: '1',
    token: 'cUSD',
    direction: 'out',
    counterparty: '0xrecipient',
    timestamp: NOW,
    ...p,
  }
}

describe('aggregateOutflow', () => {
  it('counts only outgoing tx inside the window', () => {
    const items = [
      tx({ timestamp: NOW - 1 * DAY }),
      tx({ direction: 'in', timestamp: NOW - 1 * DAY }), // ignored (incoming)
      tx({ timestamp: NOW - 40 * DAY }), // ignored (outside 30d)
      tx({ direction: 'self', timestamp: NOW }), // ignored (self)
    ]
    const r = aggregateOutflow(items, 30, NOW)
    expect(r.count).toBe(1)
  })

  it('sums amount per token', () => {
    const items = [
      tx({ amount: '5', token: 'cUSD' }),
      tx({ amount: '2.5', token: 'cUSD' }),
      tx({ amount: '3', token: 'cEUR' }),
    ]
    const r = aggregateOutflow(items, 30, NOW)
    expect(r.byToken).toEqual({ cUSD: 7.5, cEUR: 3 })
  })

  it('buckets a daily frequency by UTC date', () => {
    const items = [
      tx({ timestamp: Date.UTC(2026, 4, 17, 1) }),
      tx({ timestamp: Date.UTC(2026, 4, 17, 23) }),
      tx({ timestamp: Date.UTC(2026, 4, 16, 10) }),
    ]
    const r = aggregateOutflow(items, 30, NOW)
    expect(r.byDate['2026-05-17']).toBe(2)
    expect(r.byDate['2026-05-16']).toBe(1)
  })

  it('ignores non-numeric amounts in the token sum but still counts them', () => {
    const items = [tx({ amount: 'NaNish' }), tx({ amount: '4' })]
    const r = aggregateOutflow(items, 30, NOW)
    expect(r.count).toBe(2)
    expect(r.byToken.cUSD).toBe(4)
  })

  it('returns empty aggregates for no data', () => {
    const r = aggregateOutflow([], 30, NOW)
    expect(r).toEqual({ count: 0, byToken: {}, byDate: {} })
  })

  it('treats the window edge inclusively', () => {
    const r = aggregateOutflow([tx({ timestamp: NOW - 30 * DAY })], 30, NOW)
    expect(r.count).toBe(1)
  })
})

describe('aggregateRecipients', () => {
  it('ranks outgoing recipients by tx count, top N', () => {
    const items = [
      tx({ counterparty: '0xA' }),
      tx({ counterparty: '0xA' }),
      tx({ counterparty: '0xB' }),
      tx({ counterparty: '0xC', direction: 'in' }), // incoming ignored
    ]
    const top = aggregateRecipients(items, 5)
    expect(top[0]).toMatchObject({ address: '0xa', count: 2 })
    expect(top[1]).toMatchObject({ address: '0xb', count: 1 })
    expect(top).toHaveLength(2)
  })

  it('limits to topN', () => {
    const items = ['0xA', '0xB', '0xC', '0xD'].map((c) => tx({ counterparty: c }))
    expect(aggregateRecipients(items, 2)).toHaveLength(2)
  })

  it('accumulates per-token amounts per recipient', () => {
    const items = [
      tx({ counterparty: '0xA', amount: '5', token: 'cUSD' }),
      tx({ counterparty: '0xA', amount: '2', token: 'cEUR' }),
    ]
    expect(aggregateRecipients(items, 5)[0]?.byToken).toEqual({ cUSD: 5, cEUR: 2 })
  })

  it('returns [] for no outgoing tx', () => {
    expect(aggregateRecipients([tx({ direction: 'in' })], 5)).toEqual([])
  })
})

describe('aggregateScheduleStats', () => {
  const s = (status: number, remainingBalance: bigint, token = 'cUSD'): ScheduleLike => ({
    status,
    remainingBalance,
    token,
  })

  it('counts by status (0=active 1=paused 2=cancelled 3=expired)', () => {
    const r = aggregateScheduleStats([
      s(0, BigInt(10)),
      s(0, BigInt(5)),
      s(1, BigInt(3)),
      s(2, BigInt(0)),
      s(3, BigInt(0)),
    ])
    expect(r).toMatchObject({ total: 5, active: 2, paused: 1, cancelled: 1, expired: 1 })
  })

  it('locks only active+paused remaining balances, per token', () => {
    const r = aggregateScheduleStats([
      s(0, BigInt(10), 'cUSD'),
      s(1, BigInt(4), 'cUSD'),
      s(0, BigInt(7), 'cEUR'),
      s(2, BigInt(99), 'cUSD'), // cancelled — not locked
    ])
    expect(r.lockedByToken).toEqual({ cUSD: BigInt(14), cEUR: BigInt(7) })
  })

  it('handles an empty schedule list', () => {
    expect(aggregateScheduleStats([])).toEqual({
      total: 0,
      active: 0,
      paused: 0,
      cancelled: 0,
      expired: 0,
      lockedByToken: {},
    })
  })
})
