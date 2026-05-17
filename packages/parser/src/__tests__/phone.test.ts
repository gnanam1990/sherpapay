import { describe, it, expect } from 'vitest'
import { parse, normalizePhone } from '../index.js'

describe('normalizePhone', () => {
  it('strips spaces, dashes, dots, parens; keeps a leading +', () => {
    expect(normalizePhone('+234 801-234.5678')).toBe('+2348012345678')
    expect(normalizePhone('+1 (415) 555-2671')).toBe('+14155552671')
  })

  it('drops a + that is not leading and keeps digits only', () => {
    expect(normalizePhone('2348012345678')).toBe('2348012345678')
    expect(normalizePhone(' +44 7911 123456 ')).toBe('+447911123456')
  })
})

describe('parse - phone recipients', () => {
  it('detects a bare +international number as a phone recipient', () => {
    const r = parse('send 5 cUSD to +2348012345678')
    expect(r.kind).toBe('send')
    if (r.kind === 'send') {
      expect(r.recipient).toBe('+2348012345678')
      expect(r.recipientType).toBe('phone')
    }
  })

  it('normalizes a spaced phone number', () => {
    const r = parse('send 5 cUSD to +234 801 234 5678')
    if (r.kind === 'send') {
      expect(r.recipient).toBe('+2348012345678')
      expect(r.recipientType).toBe('phone')
    }
  })

  it('normalizes a phone with parens and dashes', () => {
    const r = parse('pay 20 USDT to +1 (415) 555-2671')
    if (r.kind === 'send') {
      expect(r.recipient).toBe('+14155552671')
      expect(r.recipientType).toBe('phone')
    }
  })

  it('detects a UK number', () => {
    const r = parse('transfer 10 cEUR to +44 7911 123456')
    if (r.kind === 'send') {
      expect(r.recipient).toBe('+447911123456')
      expect(r.recipientType).toBe('phone')
    }
  })

  it('detects a phone recipient on a scheduled send', () => {
    const r = parse('send 5 cUSD to +254712345678 every week')
    expect(r.kind).toBe('schedule')
    if (r.kind === 'schedule') {
      expect(r.recipient).toBe('+254712345678')
      expect(r.recipientType).toBe('phone')
      expect(r.frequency).toEqual({ kind: 'weekly', dayOfWeek: 1 })
    }
  })

  it('leaves a normal alias recipient untouched (no recipientType)', () => {
    expect(parse('send 5 cUSD to mom')).toEqual({
      kind: 'send',
      recipient: 'mom',
      amount: '5',
      token: 'cUSD',
    })
  })

  it('does not tag a 0x address recipient as a phone', () => {
    const addr = '0x99f37717f2EB28955CFB553f3B7Eb4eFaDf4dA8C'
    const r = parse(`send 1 cUSD to ${addr}`)
    if (r.kind === 'send') {
      expect(r.recipient.toLowerCase()).toBe(addr.toLowerCase())
      expect(r.recipientType).toBeUndefined()
    }
  })

  it('does not treat a too-short +number as a phone', () => {
    const r = parse('send 5 cUSD to +12')
    if (r.kind === 'send') {
      expect(r.recipientType).toBeUndefined()
    }
  })

  it('does not treat a digit string without + as a phone', () => {
    const r = parse('send 5 cUSD to 2348012345678')
    if (r.kind === 'send') {
      expect(r.recipientType).toBeUndefined()
    }
  })

  it('accepts the max E.164 length (15 digits)', () => {
    const r = parse('send 5 cUSD to +123456789012345')
    if (r.kind === 'send') {
      expect(r.recipient).toBe('+123456789012345')
      expect(r.recipientType).toBe('phone')
    }
  })
})
