import { describe, it, expect } from 'vitest'
import { localeToCurrency, parseRate, formatLocal, type RateResponse } from '../fx.js'

describe('localeToCurrency', () => {
  it('maps locales to default MiniPay-market currencies', () => {
    expect(localeToCurrency('sw')).toBe('KES')
    expect(localeToCurrency('es')).toBe('MXN')
    expect(localeToCurrency('hi')).toBe('INR')
    expect(localeToCurrency('en')).toBe('NGN')
    expect(localeToCurrency('whatever')).toBe('NGN')
  })
})

describe('parseRate', () => {
  const json: RateResponse = { 'celo-dollar': { ngn: 1650.5, inr: 83.2 } }
  it('extracts the rate for the requested currency', () => {
    expect(parseRate(json, 'NGN')).toBe(1650.5)
    expect(parseRate(json, 'INR')).toBe(83.2)
  })
  it('returns null when missing or non-positive', () => {
    expect(parseRate(json, 'KES')).toBeNull()
    expect(parseRate({ 'celo-dollar': { ngn: 0 } }, 'NGN')).toBeNull()
    expect(parseRate({}, 'NGN')).toBeNull()
  })
})

describe('formatLocal', () => {
  it('includes the symbol and currency code', () => {
    const out = formatLocal(0.12, 'NGN', 1650)
    expect(out).toContain('₦')
    expect(out).toContain('NGN')
  })
  it('drops decimals for large values, keeps them for small', () => {
    expect(formatLocal(5, 'NGN', 1650)).not.toMatch(/\.\d/) // 8250 → no decimals
    expect(formatLocal(0.01, 'INR', 83)).toMatch(/\d/)
  })
})
