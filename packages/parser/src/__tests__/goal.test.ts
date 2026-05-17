import { describe, it, expect } from 'vitest'
import { parse, validateGoalIntent } from '../index.js'

describe('parse - goal durationCycles', () => {
  it('computes cycles for "save 5 cUSD weekly for emergency fund target 100"', () => {
    const result = parse('save 5 cUSD weekly for emergency fund target 100')
    expect(result.kind).toBe('save')
    if (result.kind === 'save') {
      expect(result.amount).toBe('5')
      expect(result.token).toBe('cUSD')
      expect(result.goal.label).toBe('emergency fund')
      expect(result.goal.target).toBe('100')
      expect(result.goal.durationCycles).toBe(20)
      expect(result.frequency).toEqual({ kind: 'weekly', dayOfWeek: 1 })
    }
  })

  it('computes cycles for "save 1 cEUR daily for laptop target 500"', () => {
    const result = parse('save 1 cEUR daily for laptop target 500')
    expect(result.kind).toBe('save')
    if (result.kind === 'save') {
      expect(result.token).toBe('cEUR')
      expect(result.goal.durationCycles).toBe(500)
      expect(result.frequency).toEqual({ kind: 'daily' })
    }
  })

  it('computes cycles for "save 10 cUSD monthly for vacation target 1200"', () => {
    const result = parse('save 10 cUSD monthly for vacation target 1200')
    expect(result.kind).toBe('save')
    if (result.kind === 'save') {
      expect(result.goal.durationCycles).toBe(120)
      expect(result.frequency).toEqual({ kind: 'monthly', dayOfMonth: 1 })
    }
  })

  it('rounds cycles up when target is not divisible by contribution', () => {
    const result = parse('save 3 cUSD weekly for buffer target 100')
    if (result.kind === 'save') {
      // ceil(100 / 3) = 34
      expect(result.goal.durationCycles).toBe(34)
    }
  })

  it('leaves durationCycles undefined when no target given', () => {
    const result = parse('save 50 cUSD every week for emergency')
    if (result.kind === 'save') {
      expect(result.goal.target).toBeUndefined()
      expect(result.goal.durationCycles).toBeUndefined()
    }
  })

  it('leaves durationCycles undefined when amount is missing', () => {
    const result = parse('save cUSD for rainy day target 100')
    if (result.kind === 'save') {
      expect(result.amount).toBe('0')
      expect(result.goal.durationCycles).toBeUndefined()
    }
  })
})

describe('validateGoalIntent', () => {
  it('accepts a complete goal intent', () => {
    const v = validateGoalIntent(parse('save 5 cUSD weekly for emergency fund target 100'))
    expect(v.ok).toBe(true)
    expect(v.errors).toEqual([])
  })

  it('rejects a non-save intent', () => {
    const v = validateGoalIntent(parse('send 5 cUSD to bob'))
    expect(v.ok).toBe(false)
    expect(v.errors.join(' ')).toMatch(/savings goal/i)
  })

  it('rejects when target is missing', () => {
    const v = validateGoalIntent(parse('save 5 cUSD weekly for emergency'))
    expect(v.ok).toBe(false)
    expect(v.errors.join(' ')).toMatch(/target/i)
  })

  it('rejects when contribution amount is zero', () => {
    const v = validateGoalIntent(parse('save cUSD weekly for rent target 100'))
    expect(v.ok).toBe(false)
    expect(v.errors.join(' ')).toMatch(/contribution|amount/i)
  })

  it('rejects an unsupported token', () => {
    const v = validateGoalIntent({
      kind: 'save',
      amount: '5',
      // @ts-expect-error deliberately invalid token for validation test
      token: 'DOGE',
      goal: { label: 'x', target: '100' },
      frequency: { kind: 'weekly', dayOfWeek: 1 },
    })
    expect(v.ok).toBe(false)
    expect(v.errors.join(' ')).toMatch(/token/i)
  })

  it('rejects a non-recurring (once) frequency', () => {
    const v = validateGoalIntent({
      kind: 'save',
      amount: '5',
      token: 'cUSD',
      goal: { label: 'x', target: '100' },
      frequency: { kind: 'once' },
    })
    expect(v.ok).toBe(false)
    expect(v.errors.join(' ')).toMatch(/recurring|frequency/i)
  })

  it('rejects a blank label', () => {
    const v = validateGoalIntent({
      kind: 'save',
      amount: '5',
      token: 'cUSD',
      goal: { label: '   ', target: '100' },
      frequency: { kind: 'weekly', dayOfWeek: 1 },
    })
    expect(v.ok).toBe(false)
    expect(v.errors.join(' ')).toMatch(/label/i)
  })

  it('rejects a negative target', () => {
    const v = validateGoalIntent({
      kind: 'save',
      amount: '5',
      token: 'cUSD',
      goal: { label: 'x', target: '-10' },
      frequency: { kind: 'weekly', dayOfWeek: 1 },
    })
    expect(v.ok).toBe(false)
    expect(v.errors.join(' ')).toMatch(/target/i)
  })

  it('accumulates multiple errors', () => {
    const v = validateGoalIntent({
      kind: 'save',
      amount: '0',
      token: 'cUSD',
      goal: { label: 'x' },
      frequency: { kind: 'weekly', dayOfWeek: 1 },
    })
    expect(v.ok).toBe(false)
    expect(v.errors.length).toBeGreaterThanOrEqual(2)
  })
})
