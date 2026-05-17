import { describe, it, expect } from 'vitest'
import { parse, normalizeSpokenNumbers } from '../index.js'

// People (and speech-to-text) say "USD"/"dollars", never "cUSD". The
// amount regex used to require the Celo symbol glued to the number, so
// "send 1 USD to mum" parsed as amount 0 and got blocked.
describe('currency aliases', () => {
  it('maps USD → cUSD ("send 1 USD to mum")', () => {
    const r = parse('send 1 USD to mum')
    expect(r).toEqual({ kind: 'send', recipient: 'mum', amount: '1', token: 'cUSD' })
  })

  it('maps "dollar"/"dollars" → cUSD', () => {
    expect(parse('send 2 dollars to bob')).toMatchObject({ amount: '2', token: 'cUSD' })
    expect(parse('pay 3 dollar to bob')).toMatchObject({ amount: '3', token: 'cUSD' })
  })

  it('maps "euro"/"euros"/EUR → cEUR', () => {
    expect(parse('send 4 euros to x')).toMatchObject({ amount: '4', token: 'cEUR' })
    expect(parse('send 5 euro to x')).toMatchObject({ amount: '5', token: 'cEUR' })
    expect(parse('send 6 EUR to x')).toMatchObject({ amount: '6', token: 'cEUR' })
  })

  it('maps "tether" → USDT', () => {
    expect(parse('send 7 tether to z')).toMatchObject({ amount: '7', token: 'USDT' })
  })

  it('is case-insensitive', () => {
    expect(parse('send 8 usd to mum')).toMatchObject({ amount: '8', token: 'cUSD' })
    expect(parse('SEND 9 DOLLARS TO MUM')).toMatchObject({ amount: '9', token: 'cUSD' })
  })

  it('still parses the native Celo symbols', () => {
    expect(parse('send 5 cUSD to mom')).toEqual({
      kind: 'send',
      recipient: 'mom',
      amount: '5',
      token: 'cUSD',
    })
    expect(parse('send 10 cEUR to a')).toMatchObject({ amount: '10', token: 'cEUR' })
    expect(parse('send 11 USDT to b')).toMatchObject({ amount: '11', token: 'USDT' })
  })

  it('end-to-end with voice normalization ("send one dollar to mum")', () => {
    const r = parse(normalizeSpokenNumbers('send one dollar to mum'))
    expect(r).toMatchObject({ kind: 'send', amount: '1', token: 'cUSD', recipient: 'mum' })
  })

  it('does not get greedy: a currency word is still required for an amount', () => {
    // No currency → amount stays 0 (unchanged); guards against grabbing
    // unrelated numbers.
    expect(parse('send 5 to mom')).toMatchObject({ kind: 'send', amount: '0' })
  })

  it('regression guard: save target number is NOT taken as the amount', () => {
    // "save cUSD ... target 100" has no "<n> <currency>"; contribution
    // must stay 0 so validateGoalIntent still rejects it.
    const r = parse('save cUSD weekly for rent target 100')
    if (r.kind === 'save') {
      expect(r.amount).toBe('0')
      expect(r.goal.target).toBe('100')
    }
  })

  it('regression guard: save with a real contribution still parses it', () => {
    const r = parse('save 5 cUSD weekly for emergency target 100')
    if (r.kind === 'save') {
      expect(r.amount).toBe('5')
      expect(r.goal.target).toBe('100')
    }
  })
})
