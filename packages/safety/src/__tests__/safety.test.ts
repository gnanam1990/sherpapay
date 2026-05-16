import { describe, it, expect } from 'vitest'
import { runSafetyChecks } from '../rings.js'
import type { Intent, SafetyContext } from '@sherpapay/core'

const defaultContext: SafetyContext = {
  userAddress: '0x1234567890abcdef1234567890abcdef12345678',
  userBalance: BigInt(1000e18),
  dailySpent: BigInt(0),
  monthlySpent: BigInt(0),
  knownRecipients: ['0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'],
  averageAmount: BigInt(10e18),
}

describe('safety - input validation', () => {
  it('blocks zero amount', () => {
    const intent: Intent = { kind: 'send', recipient: 'mom', amount: '0', token: 'cUSD' }
    const result = runSafetyChecks(intent, defaultContext)
    expect(result.passed).toBe(false)
    expect(result.level).toBe('block')
  })

  it('blocks insufficient balance', () => {
    const intent: Intent = {
      kind: 'send',
      recipient: 'mom',
      amount: String(BigInt(2000e18)),
      token: 'cUSD',
    }
    const result = runSafetyChecks(intent, defaultContext)
    expect(result.passed).toBe(false)
  })

  it('passes valid amount', () => {
    const intent: Intent = {
      kind: 'send',
      recipient: 'mom',
      amount: String(BigInt(5e18)),
      token: 'cUSD',
    }
    const result = runSafetyChecks(intent, defaultContext)
    expect(result.passed).toBe(true)
  })

  it('accepts human decimal amounts from the parser', () => {
    const intent: Intent = {
      kind: 'send',
      recipient: 'mom',
      amount: '5.5',
      token: 'cUSD',
    }
    const result = runSafetyChecks(intent, defaultContext)
    expect(result.passed).toBe(true)
  })

  it('blocks invalid amount strings without throwing', () => {
    const intent: Intent = {
      kind: 'send',
      recipient: 'mom',
      amount: 'five',
      token: 'cUSD',
    }
    const result = runSafetyChecks(intent, defaultContext)
    expect(result.passed).toBe(false)
    expect(result.checks.some((c) => c.message === 'Amount is invalid')).toBe(true)
  })
})

describe('safety - recipient verification', () => {
  it('blocks unknown recipient', () => {
    const intent: Intent = { kind: 'send', recipient: 'unknown', amount: '5', token: 'cUSD' }
    const result = runSafetyChecks(intent, defaultContext)
    expect(result.passed).toBe(false)
  })

  it('warns on first-time address', () => {
    const intent: Intent = {
      kind: 'send',
      recipient: '0x1111111111111111111111111111111111111111',
      amount: '5',
      token: 'cUSD',
    }
    const result = runSafetyChecks(intent, defaultContext)
    expect(
      result.checks.some((c) => c.name === 'recipient-verification' && c.level === 'warn'),
    ).toBe(true)
  })

  it('passes known recipient', () => {
    const intent: Intent = {
      kind: 'send',
      recipient: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      amount: '5',
      token: 'cUSD',
    }
    const result = runSafetyChecks(intent, defaultContext)
    expect(
      result.checks.some((c) => c.name === 'recipient-verification' && c.level === 'block'),
    ).toBe(false)
  })
})

describe('safety - amount limits', () => {
  it('blocks amount exceeding per-tx max', () => {
    const intent: Intent = {
      kind: 'send',
      recipient: 'mom',
      amount: String(BigInt(600e18)),
      token: 'cUSD',
    }
    const result = runSafetyChecks(intent, { ...defaultContext, userBalance: BigInt(10000e18) })
    expect(result.passed).toBe(false)
  })

  it('warns when approaching daily limit', () => {
    const intent: Intent = {
      kind: 'send',
      recipient: 'mom',
      amount: String(BigInt(100e18)),
      token: 'cUSD',
    }
    const ctx = { ...defaultContext, dailySpent: BigInt(950e18) }
    const result = runSafetyChecks(intent, ctx)
    expect(result.checks.some((c) => c.name === 'amount-limits' && c.level === 'warn')).toBe(true)
  })

  it('warns on anomalous amount', () => {
    const intent: Intent = {
      kind: 'send',
      recipient: 'mom',
      amount: String(BigInt(100e18)),
      token: 'cUSD',
    }
    const ctx = { ...defaultContext, averageAmount: BigInt(10e18) }
    const result = runSafetyChecks(intent, ctx)
    expect(result.checks.some((c) => c.name === 'amount-limits' && c.level === 'warn')).toBe(true)
  })
})

describe('safety - sanctions', () => {
  it('blocks zero address', () => {
    const intent: Intent = {
      kind: 'send',
      recipient: '0x0000000000000000000000000000000000000000',
      amount: '5',
      token: 'cUSD',
    }
    const result = runSafetyChecks(intent, defaultContext)
    expect(result.passed).toBe(false)
  })
})

describe('safety - frequency validation', () => {
  it('blocks interval less than 1 hour', () => {
    const intent: Intent = {
      kind: 'schedule',
      recipient: 'mom',
      amount: '5',
      token: 'cUSD',
      frequency: { kind: 'custom', intervalSeconds: 60 },
    }
    const result = runSafetyChecks(intent, defaultContext)
    expect(result.passed).toBe(false)
  })

  it('passes valid weekly frequency', () => {
    const intent: Intent = {
      kind: 'schedule',
      recipient: 'mom',
      amount: '5',
      token: 'cUSD',
      frequency: { kind: 'weekly', dayOfWeek: 5 },
    }
    const result = runSafetyChecks(intent, defaultContext)
    expect(result.passed).toBe(true)
  })
})

describe('safety - confirmation', () => {
  it('generates confirmation for send', () => {
    const intent: Intent = { kind: 'send', recipient: 'mom', amount: '5', token: 'cUSD' }
    const result = runSafetyChecks(intent, defaultContext)
    expect(result.checks.some((c) => c.name === 'confirmation')).toBe(true)
  })

  it('generates confirmation for schedule', () => {
    const intent: Intent = {
      kind: 'schedule',
      recipient: 'mom',
      amount: '5',
      token: 'cUSD',
      frequency: { kind: 'weekly', dayOfWeek: 5 },
    }
    const result = runSafetyChecks(intent, defaultContext)
    expect(result.checks.some((c) => c.name === 'confirmation')).toBe(true)
  })

  it('generates confirmation for save', () => {
    const intent: Intent = {
      kind: 'save',
      amount: '50',
      token: 'cUSD',
      goal: { label: 'emergency' },
      frequency: { kind: 'weekly', dayOfWeek: 1 },
    }
    const result = runSafetyChecks(intent, defaultContext)
    expect(result.checks.some((c) => c.name === 'confirmation')).toBe(true)
  })
})

describe('safety - non-blocking intents', () => {
  it('passes cancel intent', () => {
    const intent: Intent = { kind: 'cancel', scheduleAlias: 'rent' }
    const result = runSafetyChecks(intent, defaultContext)
    expect(result.passed).toBe(true)
  })

  it('passes pause intent', () => {
    const intent: Intent = { kind: 'pause', scheduleAlias: 'rent' }
    const result = runSafetyChecks(intent, defaultContext)
    expect(result.passed).toBe(true)
  })

  it('passes status intent', () => {
    const intent: Intent = { kind: 'status', query: 'how much' }
    const result = runSafetyChecks(intent, defaultContext)
    expect(result.passed).toBe(true)
  })

  it('passes unknown intent', () => {
    const intent: Intent = { kind: 'unknown', raw: 'hello' }
    const result = runSafetyChecks(intent, defaultContext)
    expect(result.passed).toBe(true)
  })
})
