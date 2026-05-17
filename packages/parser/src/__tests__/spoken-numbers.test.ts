import { describe, it, expect } from 'vitest'
import { normalizeSpokenNumbers } from '../index.js'

describe('normalizeSpokenNumbers', () => {
  it('maps a single digit word in an amount', () => {
    expect(normalizeSpokenNumbers('send five cUSD to mom')).toBe('send 5 cUSD to mom')
  })

  it('handles a dictated decimal via "point"', () => {
    expect(normalizeSpokenNumbers('send five point five cUSD to mom')).toBe('send 5.5 cUSD to mom')
  })

  it('concatenates a dictated international phone number', () => {
    expect(
      normalizeSpokenNumbers(
        'send five cUSD to plus two three four eight zero one two three four five six seven eight',
      ),
    ).toBe('send 5 cUSD to +2348012345678')
  })

  it('handles a bare dictated phone number', () => {
    expect(normalizeSpokenNumbers('plus two three four')).toBe('+234')
  })

  it('treats spoken "oh"/"o" as zero inside a number run', () => {
    expect(normalizeSpokenNumbers('plus one eight oh oh')).toBe('+1800')
  })

  it('ignores dictated "dash"/"space" inside a number run', () => {
    expect(
      normalizeSpokenNumbers(
        'plus two three four dash eight zero one space two three four five six seven eight',
      ),
    ).toBe('+2348012345678')
  })

  it('keeps "plus" as a word when not followed by a digit', () => {
    expect(normalizeSpokenNumbers('one plus benefits')).toBe('1 plus benefits')
  })

  it('does not merge a standalone number into adjacent words', () => {
    expect(normalizeSpokenNumbers('send nine USDT to john')).toBe('send 9 USDT to john')
  })

  it('is case-insensitive for number words but preserves other token case', () => {
    expect(normalizeSpokenNumbers('Send Five CUSD to Mom')).toBe('Send 5 CUSD to Mom')
  })

  it('handles two separate spoken numbers', () => {
    expect(normalizeSpokenNumbers('send five cUSD to bob then nine')).toBe(
      'send 5 cUSD to bob then 9',
    )
  })

  it('leaves text with no number words unchanged', () => {
    expect(normalizeSpokenNumbers('send money to mom')).toBe('send money to mom')
  })

  it('passes "point" through when no number run is active', () => {
    expect(normalizeSpokenNumbers('get to the point')).toBe('get to the point')
  })

  it('returns empty/whitespace input unchanged-ish', () => {
    expect(normalizeSpokenNumbers('')).toBe('')
    expect(normalizeSpokenNumbers('   ')).toBe('')
  })

  it('starts a fresh number run after a + run is interrupted', () => {
    expect(normalizeSpokenNumbers('plus two three to four five')).toBe('+23 to 45')
  })
})
