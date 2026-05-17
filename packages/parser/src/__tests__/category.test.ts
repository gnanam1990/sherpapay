import { describe, it, expect } from 'vitest'
import { parse, categoryForSchedule } from '../index.js'

describe('parse - schedule category (explicit keyword only)', () => {
  it('detects "subscription"', () => {
    const r = parse('send 10 cUSD to netflix every month for subscription')
    expect(r.kind).toBe('schedule')
    if (r.kind === 'schedule') expect(r.category).toBe('subscription')
  })

  it('detects "rent"', () => {
    const r = parse('pay 500 cUSD to landlord every month rent')
    if (r.kind === 'schedule') expect(r.category).toBe('rent')
  })

  it('detects "savings"', () => {
    const r = parse('send 20 cUSD to pot every week savings')
    if (r.kind === 'schedule') expect(r.category).toBe('savings')
  })

  it('maps "fee" to subscription', () => {
    const r = parse('send 100 cUSD to gym every month monthly fee')
    if (r.kind === 'schedule') expect(r.category).toBe('subscription')
  })

  it('detects "subscribe"', () => {
    const r = parse('send 5 cUSD to spotify every month to subscribe')
    if (r.kind === 'schedule') expect(r.category).toBe('subscription')
  })

  it('is case-insensitive', () => {
    const r = parse('send 1 cUSD to ll every month RENT')
    if (r.kind === 'schedule') expect(r.category).toBe('rent')
  })

  it('rent takes precedence over fee', () => {
    const r = parse('send 1 cUSD to ll every month rent fee')
    if (r.kind === 'schedule') expect(r.category).toBe('rent')
  })

  it('omits category when no keyword (preserves strict schedule shape)', () => {
    expect(parse('send 5 cUSD to bob every week')).toEqual({
      kind: 'schedule',
      recipient: 'bob',
      amount: '5',
      token: 'cUSD',
      frequency: { kind: 'weekly', dayOfWeek: 1 },
    })
  })

  it('does not attach category to a non-schedule send', () => {
    const r = parse('send 5 cUSD to mom')
    expect(r).toEqual({ kind: 'send', recipient: 'mom', amount: '5', token: 'cUSD' })
  })
})

describe('categoryForSchedule (view-side derivation)', () => {
  it('explicit category always wins', () => {
    expect(categoryForSchedule(604_800, 'rent')).toBe('rent')
    expect(categoryForSchedule(86_400, 'savings')).toBe('savings')
  })

  it('monthly recurring defaults to subscription', () => {
    expect(categoryForSchedule(2_592_000)).toBe('subscription')
  })

  it('weekly recurring defaults to subscription', () => {
    expect(categoryForSchedule(604_800)).toBe('subscription')
  })

  it('shorter intervals default to transfer', () => {
    expect(categoryForSchedule(86_400)).toBe('transfer')
    expect(categoryForSchedule(3_600)).toBe('transfer')
  })
})
