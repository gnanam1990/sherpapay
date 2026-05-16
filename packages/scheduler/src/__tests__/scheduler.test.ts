import { describe, it, expect } from 'vitest'
import {
  nextExecutionTime,
  validateScheduleParameters,
  calculateTotalLifetime,
  generateScheduleId,
  formatFrequency,
} from '../scheduler.js'
import type { Intent, Frequency } from '@sherpapay/core'

describe('nextExecutionTime', () => {
  it('calculates daily frequency', () => {
    const freq: Frequency = { kind: 'daily' }
    const startTime = 1000000
    const result = nextExecutionTime(freq, startTime, 0)
    expect(result).toBe(startTime + 86400)
  })

  it('calculates weekly frequency', () => {
    const freq: Frequency = { kind: 'weekly', dayOfWeek: 5 }
    const startTime = 1000000
    const result = nextExecutionTime(freq, startTime, 0)
    expect(result).toBeGreaterThan(startTime)
  })

  it('calculates monthly frequency', () => {
    const freq: Frequency = { kind: 'monthly', dayOfMonth: 1 }
    const startTime = 1000000
    const result = nextExecutionTime(freq, startTime, 0)
    expect(result).toBeGreaterThan(startTime)
  })

  it('calculates custom frequency', () => {
    const freq: Frequency = { kind: 'custom', intervalSeconds: 3600 }
    const startTime = 1000000
    const result = nextExecutionTime(freq, startTime, 0)
    expect(result).toBe(startTime + 3600)
  })

  it('calculates from last execution', () => {
    const freq: Frequency = { kind: 'daily' }
    const startTime = 1000000
    const lastExecution = 2000000
    const result = nextExecutionTime(freq, startTime, lastExecution)
    expect(result).toBe(lastExecution + 86400)
  })

  it('handles once frequency', () => {
    const freq: Frequency = { kind: 'once' }
    const startTime = 1000000
    const result = nextExecutionTime(freq, startTime, 0)
    expect(result).toBe(startTime)
  })
})

describe('validateScheduleParameters', () => {
  it('validates correct schedule', () => {
    const intent: Intent = {
      kind: 'schedule',
      recipient: 'mom',
      amount: '5',
      token: 'cUSD',
      frequency: { kind: 'weekly', dayOfWeek: 5 },
    }
    const result = validateScheduleParameters(intent)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rejects missing recipient', () => {
    const intent: Intent = {
      kind: 'schedule',
      recipient: 'unknown',
      amount: '5',
      token: 'cUSD',
      frequency: { kind: 'weekly', dayOfWeek: 5 },
    }
    const result = validateScheduleParameters(intent)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Recipient is required')
  })

  it('rejects zero amount', () => {
    const intent: Intent = {
      kind: 'schedule',
      recipient: 'mom',
      amount: '0',
      token: 'cUSD',
      frequency: { kind: 'weekly', dayOfWeek: 5 },
    }
    const result = validateScheduleParameters(intent)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Amount must be greater than 0')
  })

  it('rejects interval less than 1 hour', () => {
    const intent: Intent = {
      kind: 'schedule',
      recipient: 'mom',
      amount: '5',
      token: 'cUSD',
      frequency: { kind: 'custom', intervalSeconds: 60 },
    }
    const result = validateScheduleParameters(intent)
    expect(result.valid).toBe(false)
  })

  it('passes non-schedule intents', () => {
    const intent: Intent = { kind: 'send', recipient: 'mom', amount: '5', token: 'cUSD' }
    const result = validateScheduleParameters(intent)
    expect(result.valid).toBe(true)
  })
})

describe('calculateTotalLifetime', () => {
  it('calculates total for finite schedule', () => {
    const schedule = {
      startTime: 1000000,
      interval: 86400,
      endTime: 1000000 + 86400 * 10,
      amount: BigInt(10e18),
    }
    const result = calculateTotalLifetime(schedule)
    expect(result).toBe(BigInt(10e18) * BigInt(10))
  })

  it('returns 0 for perpetual schedule', () => {
    const schedule = {
      startTime: 1000000,
      interval: 86400,
      endTime: 0,
      amount: BigInt(10e18),
    }
    const result = calculateTotalLifetime(schedule)
    expect(result).toBe(BigInt(0))
  })

  it('handles weekly interval', () => {
    const schedule = {
      startTime: 1000000,
      interval: 604800,
      endTime: 1000000 + 604800 * 4,
      amount: BigInt(50e18),
    }
    const result = calculateTotalLifetime(schedule)
    expect(result).toBe(BigInt(50e18) * BigInt(4))
  })
})

describe('generateScheduleId', () => {
  it('generates deterministic IDs', () => {
    const params = {
      sender: '0x1234',
      recipient: '0x5678',
      token: 'cUSD',
      amount: '100',
      timestamp: 1000,
    }
    const id1 = generateScheduleId(params)
    const id2 = generateScheduleId(params)
    expect(id1).toBe(id2)
  })

  it('generates different IDs for different params', () => {
    const id1 = generateScheduleId({ sender: '0x1234', recipient: '0x5678', token: 'cUSD', amount: '100', timestamp: 1000 })
    const id2 = generateScheduleId({ sender: '0x1234', recipient: '0x5678', token: 'cUSD', amount: '200', timestamp: 1000 })
    expect(id1).not.toBe(id2)
  })

  it('generates 66-char hex string', () => {
    const id = generateScheduleId({ sender: '0x1', recipient: '0x2', token: 'cUSD', amount: '1', timestamp: 1 })
    expect(id).toMatch(/^0x[0-9a-f]{64}$/)
  })
})

describe('formatFrequency', () => {
  it('formats once', () => {
    expect(formatFrequency({ kind: 'once' })).toBe('one-time')
  })

  it('formats daily', () => {
    expect(formatFrequency({ kind: 'daily' })).toBe('every day')
  })

  it('formats weekly', () => {
    expect(formatFrequency({ kind: 'weekly', dayOfWeek: 5 })).toBe('every Friday')
  })

  it('formats monthly', () => {
    expect(formatFrequency({ kind: 'monthly', dayOfMonth: 1 })).toBe('every month on the 1st')
  })

  it('formats custom', () => {
    expect(formatFrequency({ kind: 'custom', intervalSeconds: 3600 })).toBe('every 3600 seconds')
  })
})
