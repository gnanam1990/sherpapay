import { describe, it, expect } from 'vitest'
import { parse } from '../parser.js'

describe('parse - send intent', () => {
  it('parses simple send', () => {
    const result = parse('send 5 cUSD to mom')
    expect(result).toEqual({ kind: 'send', recipient: 'mom', amount: '5', token: 'cUSD' })
  })

  it('parses send with decimal amount', () => {
    const result = parse('send 5.5 cUSD to mom')
    expect(result).toEqual({ kind: 'send', recipient: 'mom', amount: '5.5', token: 'cUSD' })
  })

  it('parses send with cEUR', () => {
    const result = parse('send 10 cEUR to dad')
    expect(result).toEqual({ kind: 'send', recipient: 'dad', amount: '10', token: 'cEUR' })
  })

  it('parses send with USDT', () => {
    const result = parse('send 100 USDT to john')
    expect(result).toEqual({ kind: 'send', recipient: 'john', amount: '100', token: 'USDT' })
  })

  it('parses send with pay verb', () => {
    const result = parse('pay 20 cUSD to alice')
    expect(result).toEqual({ kind: 'send', recipient: 'alice', amount: '20', token: 'cUSD' })
  })

  it('parses send with transfer verb', () => {
    const result = parse('transfer 50 cUSD to bob')
    expect(result).toEqual({ kind: 'send', recipient: 'bob', amount: '50', token: 'cUSD' })
  })

  it('handles case insensitive tokens', () => {
    const result = parse('send 5 CUSD to mom')
    expect(result).toEqual({ kind: 'send', recipient: 'mom', amount: '5', token: 'cUSD' })
  })

  it('handles missing recipient', () => {
    const result = parse('send 5 cUSD')
    expect(result.kind).toBe('send')
    if (result.kind === 'send') {
      expect(result.recipient).toBe('unknown')
    }
  })

  it('handles missing amount', () => {
    const result = parse('send cUSD to mom')
    expect(result.kind).toBe('send')
    if (result.kind === 'send') {
      expect(result.amount).toBe('0')
    }
  })

  it('handles missing token', () => {
    const result = parse('send 5 to mom')
    expect(result.kind).toBe('send')
    if (result.kind === 'send') {
      expect(result.token).toBe('cUSD')
    }
  })
})

describe('parse - schedule intent', () => {
  it('parses weekly schedule on friday', () => {
    const result = parse('send 5 cUSD to mom every friday')
    expect(result).toEqual({
      kind: 'schedule',
      recipient: 'mom',
      amount: '5',
      token: 'cUSD',
      frequency: { kind: 'weekly', dayOfWeek: 5 },
    })
  })

  it('parses weekly schedule on monday', () => {
    const result = parse('send 10 cUSD to dad every monday')
    expect(result).toEqual({
      kind: 'schedule',
      recipient: 'dad',
      amount: '10',
      token: 'cUSD',
      frequency: { kind: 'weekly', dayOfWeek: 1 },
    })
  })

  it('parses daily schedule', () => {
    const result = parse('send 1 cUSD to mom every day')
    expect(result).toEqual({
      kind: 'schedule',
      recipient: 'mom',
      amount: '1',
      token: 'cUSD',
      frequency: { kind: 'daily' },
    })
  })

  it('parses daily schedule with daily keyword', () => {
    const result = parse('send 1 cUSD to mom daily')
    expect(result).toEqual({
      kind: 'schedule',
      recipient: 'mom',
      amount: '1',
      token: 'cUSD',
      frequency: { kind: 'daily' },
    })
  })

  it('parses monthly schedule', () => {
    const result = parse('send 100 cUSD to landlord every month')
    expect(result).toEqual({
      kind: 'schedule',
      recipient: 'landlord',
      amount: '100',
      token: 'cUSD',
      frequency: { kind: 'monthly', dayOfMonth: 1 },
    })
  })

  it('parses weekly schedule with abbreviated day', () => {
    const result = parse('send 5 cUSD to mom every fri')
    expect(result).toEqual({
      kind: 'schedule',
      recipient: 'mom',
      amount: '5',
      token: 'cUSD',
      frequency: { kind: 'weekly', dayOfWeek: 5 },
    })
  })

  it('parses weekly schedule on saturday', () => {
    const result = parse('send 5 cUSD to mom every saturday')
    expect(result).toEqual({
      kind: 'schedule',
      recipient: 'mom',
      amount: '5',
      token: 'cUSD',
      frequency: { kind: 'weekly', dayOfWeek: 6 },
    })
  })

  it('parses weekly schedule on sunday', () => {
    const result = parse('send 5 cUSD to mom every sunday')
    expect(result).toEqual({
      kind: 'schedule',
      recipient: 'mom',
      amount: '5',
      token: 'cUSD',
      frequency: { kind: 'weekly', dayOfWeek: 0 },
    })
  })
})

describe('parse - save intent', () => {
  it('parses save for emergency', () => {
    const result = parse('save 50 cUSD every week for emergency')
    expect(result.kind).toBe('save')
    if (result.kind === 'save') {
      expect(result.amount).toBe('50')
      expect(result.token).toBe('cUSD')
      expect(result.goal.label).toBe('emergency')
      expect(result.frequency).toEqual({ kind: 'weekly', dayOfWeek: 1 })
    }
  })

  it('parses save with target amount', () => {
    const result = parse('save 100 cUSD every month for vacation target 1000')
    expect(result.kind).toBe('save')
    if (result.kind === 'save') {
      expect(result.amount).toBe('100')
      expect(result.goal.target).toBe('1000')
    }
  })

  it('parses save with daily frequency', () => {
    const result = parse('save 5 cUSD daily for coffee')
    expect(result.kind).toBe('save')
    if (result.kind === 'save') {
      expect(result.frequency).toEqual({ kind: 'daily' })
    }
  })

  it('parses save without goal label', () => {
    const result = parse('save 50 cUSD every week')
    expect(result.kind).toBe('save')
    if (result.kind === 'save') {
      expect(result.goal.label).toBe('savings')
    }
  })

  it('parses save with cEUR', () => {
    const result = parse('save 20 cEUR every month for trip')
    expect(result.kind).toBe('save')
    if (result.kind === 'save') {
      expect(result.token).toBe('cEUR')
    }
  })
})

describe('parse - cancel/pause/resume intents', () => {
  it('parses cancel', () => {
    const result = parse('cancel rent')
    expect(result).toEqual({ kind: 'cancel', scheduleAlias: 'rent' })
  })

  it('parses cancel with my', () => {
    const result = parse('cancel my rent')
    expect(result).toEqual({ kind: 'cancel', scheduleAlias: 'rent' })
  })

  it('parses pause', () => {
    const result = parse('pause rent')
    expect(result).toEqual({ kind: 'pause', scheduleAlias: 'rent' })
  })

  it('parses pause with my', () => {
    const result = parse('pause my subscription')
    expect(result).toEqual({ kind: 'pause', scheduleAlias: 'subscription' })
  })

  it('parses resume', () => {
    const result = parse('resume rent')
    expect(result).toEqual({ kind: 'resume', scheduleAlias: 'rent' })
  })

  it('parses resume with my', () => {
    const result = parse('resume my subscription')
    expect(result).toEqual({ kind: 'resume', scheduleAlias: 'subscription' })
  })
})

describe('parse - status intent', () => {
  it('parses how much question', () => {
    const result = parse('how much have I saved')
    expect(result.kind).toBe('status')
  })

  it('parses what question', () => {
    const result = parse('what is my balance')
    expect(result.kind).toBe('status')
  })

  it('parses status keyword', () => {
    const result = parse('status of my payments')
    expect(result.kind).toBe('status')
  })

  it('parses show keyword', () => {
    const result = parse('show my schedules')
    expect(result.kind).toBe('status')
  })
})

describe('parse - unknown intent', () => {
  it('returns unknown for empty input', () => {
    const result = parse('')
    expect(result).toEqual({ kind: 'unknown', raw: '' })
  })

  it('returns unknown for unrecognized input', () => {
    const result = parse('hello world')
    expect(result).toEqual({ kind: 'unknown', raw: 'hello world' })
  })

  it('returns unknown for random text', () => {
    const result = parse('the weather is nice today')
    expect(result).toEqual({ kind: 'unknown', raw: 'the weather is nice today' })
  })
})

describe('parse - edge cases', () => {
  it('handles extra whitespace', () => {
    const result = parse('  send  5  cUSD  to  mom  ')
    expect(result.kind).toBe('send')
  })

  it('handles large amounts', () => {
    const result = parse('send 10000 cUSD to mom')
    expect(result.kind).toBe('send')
    if (result.kind === 'send') {
      expect(result.amount).toBe('10000')
    }
  })

  it('handles small decimal amounts', () => {
    const result = parse('send 0.001 cUSD to mom')
    expect(result.kind).toBe('send')
    if (result.kind === 'send') {
      expect(result.amount).toBe('0.001')
    }
  })

  it('handles multiple amounts - takes first', () => {
    const result = parse('send 5 cUSD and 10 cEUR to mom')
    expect(result.kind).toBe('send')
    if (result.kind === 'send') {
      expect(result.amount).toBe('5')
      expect(result.token).toBe('cUSD')
    }
  })

  it('handles recipient with numbers', () => {
    const result = parse('send 5 cUSD to user123')
    expect(result.kind).toBe('send')
    if (result.kind === 'send') {
      expect(result.recipient).toBe('user123')
    }
  })
})
