import { describe, it, expect } from 'vitest'
import { parse } from '../index.js'

const A = '0xAbC0000000000000000000000000000000000001'
const B = '0xDeF0000000000000000000000000000000000002'

describe('parse - batch (comma-separated multi-recipient)', () => {
  it('detects a 3-way comma list', () => {
    const r = parse('send 5 cUSD to alice, bob, charlie')
    expect(r).toEqual({
      kind: 'batch',
      recipients: ['alice', 'bob', 'charlie'],
      amount: '5',
      token: 'cUSD',
    })
  })

  it('detects "a and b"', () => {
    const r = parse('send 5 cUSD to alice and bob')
    if (r.kind === 'batch') expect(r.recipients).toEqual(['alice', 'bob'])
    expect(r.kind).toBe('batch')
  })

  it('detects "a, b and c" (Oxford mix)', () => {
    const r = parse('send 5 cUSD to alice, bob and charlie')
    expect(r.kind).toBe('batch')
    if (r.kind === 'batch') expect(r.recipients).toEqual(['alice', 'bob', 'charlie'])
  })

  it('carries amount and token', () => {
    const r = parse('pay 2.5 cEUR to a, b')
    expect(r).toMatchObject({ kind: 'batch', amount: '2.5', token: 'cEUR' })
  })

  it('preserves 0x address case in the list', () => {
    const r = parse(`send 1 cUSD to ${A}, ${B}`)
    expect(r.kind).toBe('batch')
    if (r.kind === 'batch') expect(r.recipients).toEqual([A, B])
  })

  it('mixes alias + address + phone', () => {
    const r = parse(`send 1 USDT to mom, ${A}, +234 801 234 5678`)
    expect(r.kind).toBe('batch')
    if (r.kind === 'batch') {
      expect(r.recipients).toEqual(['mom', A, '+2348012345678'])
    }
  })

  it('trims surrounding whitespace', () => {
    const r = parse('send 5 cUSD to  alice ,  bob ')
    expect(r.kind).toBe('batch')
    if (r.kind === 'batch') expect(r.recipients).toEqual(['alice', 'bob'])
  })

  it('supports the "&" separator', () => {
    const r = parse('send 5 cUSD to alice & bob')
    expect(r.kind).toBe('batch')
    if (r.kind === 'batch') expect(r.recipients).toEqual(['alice', 'bob'])
  })

  it('dedupes case-insensitively (first form kept)', () => {
    const r = parse('send 2 cUSD to alice, bob, Alice')
    expect(r.kind).toBe('batch')
    if (r.kind === 'batch') expect(r.recipients).toEqual(['alice', 'bob'])
  })

  it('strips a trailing "for ..." note', () => {
    const r = parse('send 5 cUSD to alice, bob for lunch')
    expect(r.kind).toBe('batch')
    if (r.kind === 'batch') expect(r.recipients).toEqual(['alice', 'bob'])
  })

  it('works with the transfer verb', () => {
    const r = parse('transfer 10 cUSD to x, y')
    expect(r).toMatchObject({ kind: 'batch', recipients: ['x', 'y'] })
  })

  it('works with the pay verb', () => {
    expect(parse('pay 1 cUSD to a, b, c').kind).toBe('batch')
  })

  it('a single recipient stays a normal send (not batch)', () => {
    expect(parse('send 5 cUSD to mom')).toEqual({
      kind: 'send',
      recipient: 'mom',
      amount: '5',
      token: 'cUSD',
    })
  })

  it('a single 0x recipient stays a normal send', () => {
    expect(parse(`send 1 cUSD to ${A}`).kind).toBe('send')
  })

  it('a duplicate-only list collapses to a single send', () => {
    // "to bob, bob" → dedupe → 1 → not a batch
    expect(parse('send 1 cUSD to bob, bob').kind).toBe('send')
  })

  it('a frequency takes precedence — scheduled batch is out of scope', () => {
    const r = parse('send 5 cUSD to a, b every week')
    expect(r.kind).toBe('schedule')
  })

  it('does not batch non-send verbs', () => {
    expect(parse('save 5 cUSD for x, y target 100').kind).toBe('save')
  })

  it('amount is per-recipient (UI multiplies by count)', () => {
    const r = parse('send 7 cUSD to a, b, c')
    expect(r.kind).toBe('batch')
    if (r.kind === 'batch') {
      expect(r.amount).toBe('7')
      expect(r.recipients).toHaveLength(3)
    }
  })
})
