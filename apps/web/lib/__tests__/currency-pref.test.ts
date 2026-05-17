import { describe, it, expect } from 'vitest'
import {
  isLocalCurrency,
  resolveCurrency,
  currencyStorageKey,
  readCurrencyOverride,
  writeCurrencyOverride,
  clearCurrencyOverride,
} from '../currency-pref'

function fakeStorage() {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  }
}

const W = '0xAbC0000000000000000000000000000000000001'

describe('isLocalCurrency', () => {
  it('accepts the supported codes', () => {
    for (const c of ['NGN', 'KES', 'GHS', 'MXN', 'PHP', 'INR', 'USD']) {
      expect(isLocalCurrency(c)).toBe(true)
    }
  })
  it('rejects anything else', () => {
    expect(isLocalCurrency('EUR')).toBe(false)
    expect(isLocalCurrency('ngn')).toBe(false)
    expect(isLocalCurrency('')).toBe(false)
    expect(isLocalCurrency(null)).toBe(false)
    expect(isLocalCurrency(undefined)).toBe(false)
  })
})

describe('resolveCurrency (override logic)', () => {
  it('uses the override when set', () => {
    expect(resolveCurrency('KES', 'NGN')).toBe('KES')
  })
  it('falls back to the locale-derived currency when no override', () => {
    expect(resolveCurrency(null, 'INR')).toBe('INR')
  })
})

describe('currency override storage (injected fake)', () => {
  it('is wallet-scoped under sherpapay.currency.<wallet>', () => {
    expect(currencyStorageKey(W)).toBe(`sherpapay.currency.${W.toLowerCase()}`)
  })

  it('round-trips write → read', () => {
    const s = fakeStorage()
    writeCurrencyOverride(W, 'GHS', s)
    expect(readCurrencyOverride(W, s)).toBe('GHS')
    // a different wallet has no override
    expect(readCurrencyOverride('0xother', s)).toBeNull()
  })

  it('clear removes the override', () => {
    const s = fakeStorage()
    writeCurrencyOverride(W, 'PHP', s)
    clearCurrencyOverride(W, s)
    expect(readCurrencyOverride(W, s)).toBeNull()
  })

  it('returns null for an unknown / corrupted stored value', () => {
    const s = fakeStorage()
    s.setItem(currencyStorageKey(W), 'BTC')
    expect(readCurrencyOverride(W, s)).toBeNull()
    s.setItem(currencyStorageKey(W), '{garbage')
    expect(readCurrencyOverride(W, s)).toBeNull()
  })

  it('returns null when nothing stored', () => {
    expect(readCurrencyOverride(W, fakeStorage())).toBeNull()
  })

  it('is a no-op without a wallet (null storage)', () => {
    expect(readCurrencyOverride(W, null)).toBeNull()
    // should not throw
    writeCurrencyOverride(W, 'USD', null)
    clearCurrencyOverride(W, null)
  })
})
