import { describe, it, expect } from 'vitest'
import { isLocale, resolveInitialLocale, MESSAGES, LOCALES } from '../index'

describe('isLocale', () => {
  it('accepts supported locales only', () => {
    expect(isLocale('en')).toBe(true)
    expect(isLocale('sw')).toBe(true)
    expect(isLocale('es')).toBe(true)
    expect(isLocale('hi')).toBe(true)
    expect(isLocale('fr')).toBe(false)
    expect(isLocale(null)).toBe(false)
    expect(isLocale(undefined)).toBe(false)
  })
})

describe('resolveInitialLocale', () => {
  it('prefers a valid stored locale', () => {
    expect(resolveInitialLocale('sw', 'en-US')).toBe('sw')
  })
  it('falls back to the browser language prefix', () => {
    expect(resolveInitialLocale(null, 'es-MX')).toBe('es')
    expect(resolveInitialLocale('bogus', 'hi-IN')).toBe('hi')
  })
  it('defaults to English when nothing matches', () => {
    expect(resolveInitialLocale(null, 'fr-FR')).toBe('en')
    expect(resolveInitialLocale(null, undefined)).toBe('en')
  })
})

describe('message catalogs', () => {
  it('every locale has the same keys as English (no missing translations)', () => {
    const enKeys = Object.keys(MESSAGES.en).sort()
    for (const { code } of LOCALES) {
      expect(Object.keys(MESSAGES[code]).sort()).toEqual(enKeys)
    }
  })
})
