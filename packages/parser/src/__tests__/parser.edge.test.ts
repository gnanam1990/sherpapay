import { describe, it, expect } from 'vitest'
import { parse } from '../parser.js'

describe('parse — edge cases', () => {
  it('empty / whitespace input is unknown', () => {
    expect(parse('')).toEqual({ kind: 'unknown', raw: '' })
    expect(parse('   ')).toMatchObject({ kind: 'unknown' })
  })

  it('token + keyword are case-insensitive', () => {
    expect(parse('SEND 1 usdt to bob')).toMatchObject({
      kind: 'send',
      token: 'USDT',
      amount: '1',
      recipient: 'bob',
    })
    expect(parse('PAY 2 cEUR to alice')).toMatchObject({ kind: 'send', token: 'cEUR' })
  })

  it('decimal amounts are preserved as strings', () => {
    expect(parse('send 0.01 cUSD to mom')).toMatchObject({ amount: '0.01' })
  })

  it('recipient is lowercased; 0x addresses survive \\w+', () => {
    const r = parse('send 5 cUSD to 0xABCdef0123 every week')
    expect(r).toMatchObject({ kind: 'schedule', recipient: '0xabcdef0123' })
  })

  it('missing token defaults to cUSD and amount falls back to 0', () => {
    // AMOUNT_PATTERN needs a token after the number, so "5 to bob" → no amount
    expect(parse('send 5 to bob')).toMatchObject({
      kind: 'send',
      token: 'cUSD',
      amount: '0',
      recipient: 'bob',
    })
  })

  it('named weekday → weekly with that dayOfWeek', () => {
    expect(parse('send 5 cUSD to mom every tuesday')).toMatchObject({
      kind: 'schedule',
      frequency: { kind: 'weekly', dayOfWeek: 2 },
    })
    expect(parse('send 1 cUSD to x every fri')).toMatchObject({
      frequency: { kind: 'weekly', dayOfWeek: 5 },
    })
  })

  it('"every hour" → custom 3600s schedule', () => {
    expect(parse('send 1 cUSD to bob every hour')).toMatchObject({
      kind: 'schedule',
      frequency: { kind: 'custom', intervalSeconds: 3600 },
    })
  })

  it('daily/monthly keywords', () => {
    expect(parse('send 1 cUSD to a daily')).toMatchObject({
      frequency: { kind: 'daily' },
    })
    expect(parse('send 1 cUSD to a monthly')).toMatchObject({
      frequency: { kind: 'monthly', dayOfMonth: 1 },
    })
  })

  it('cancel/pause/resume capture an alias, bare verb → unknown alias', () => {
    expect(parse('cancel my groceries')).toEqual({
      kind: 'cancel',
      scheduleAlias: 'groceries',
    })
    expect(parse('pause rent')).toEqual({ kind: 'pause', scheduleAlias: 'rent' })
    expect(parse('resume')).toEqual({ kind: 'resume', scheduleAlias: 'unknown' })
  })

  it('status queries', () => {
    expect(parse('how much do I have')).toMatchObject({ kind: 'status' })
    expect(parse('show my schedules')).toMatchObject({ kind: 'status' })
  })

  it('save parses goal label + target + frequency', () => {
    expect(parse('save 5 cUSD for rent every month target 100')).toMatchObject({
      kind: 'save',
      amount: '5',
      token: 'cUSD',
      goal: { label: 'rent', target: '100' },
      frequency: { kind: 'monthly', dayOfMonth: 1 },
    })
  })

  it('save defaults to weekly + cUSD + "savings" label', () => {
    expect(parse('save 10 cUSD')).toMatchObject({
      kind: 'save',
      token: 'cUSD',
      goal: { label: 'savings' },
      frequency: { kind: 'weekly' },
    })
  })

  it('unrecognized verbs are unknown (raw preserved)', () => {
    expect(parse('yeet 5 cUSD to bob')).toEqual({ kind: 'unknown', raw: 'yeet 5 cUSD to bob' })
  })
})
