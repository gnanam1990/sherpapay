import { describe, it, expect } from 'vitest'
import {
  amountToWei,
  weiToAmount,
  formatAddress,
  isValidAddress,
  generateScheduleId,
  parseTokenSymbol,
  formatTokenAmount,
} from '../utils.js'

describe('amountToWei', () => {
  it('converts whole numbers for 18-decimal tokens', () => {
    expect(amountToWei('5', 'cUSD')).toBe(BigInt(5e18))
    expect(amountToWei('100', 'cEUR')).toBe(BigInt(100e18))
  })

  it('converts decimal numbers for 18-decimal tokens', () => {
    expect(amountToWei('5.5', 'cUSD')).toBe(BigInt(5.5e18))
    expect(amountToWei('0.1', 'cUSD')).toBe(BigInt(0.1e18))
  })

  it('converts amounts for 6-decimal tokens (USDT)', () => {
    expect(amountToWei('100', 'USDT')).toBe(BigInt(100e6))
    expect(amountToWei('5.5', 'USDT')).toBe(BigInt(5.5e6))
  })

  it('handles zero', () => {
    expect(amountToWei('0', 'cUSD')).toBe(BigInt(0))
  })

  it('handles very small amounts', () => {
    expect(amountToWei('0.000000000000000001', 'cUSD')).toBe(BigInt(1))
  })
})

describe('weiToAmount', () => {
  it('converts wei to human-readable for 18-decimal tokens', () => {
    expect(weiToAmount(BigInt(5e18), 'cUSD')).toBe('5')
    expect(weiToAmount(BigInt(5.5e18), 'cUSD')).toBe('5.5')
  })

  it('converts wei to human-readable for 6-decimal tokens', () => {
    expect(weiToAmount(BigInt(100e6), 'USDT')).toBe('100')
    expect(weiToAmount(BigInt(5.5e6), 'USDT')).toBe('5.5')
  })

  it('handles zero', () => {
    expect(weiToAmount(BigInt(0), 'cUSD')).toBe('0')
  })
})

describe('formatAddress', () => {
  it('formats a standard address', () => {
    const addr = '0x1234567890abcdef1234567890abcdef12345678'
    expect(formatAddress(addr)).toBe('0x1234...5678')
  })

  it('returns short addresses as-is', () => {
    expect(formatAddress('0x1234')).toBe('0x1234')
  })
})

describe('isValidAddress', () => {
  it('validates correct addresses', () => {
    expect(isValidAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe(true)
    expect(isValidAddress('0x' + 'a'.repeat(40))).toBe(true)
  })

  it('rejects invalid addresses', () => {
    expect(isValidAddress('')).toBe(false)
    expect(isValidAddress('0x123')).toBe(false)
    expect(isValidAddress('not-an-address')).toBe(false)
    expect(isValidAddress('0x' + 'g'.repeat(40))).toBe(false)
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
    const id1 = generateScheduleId({
      sender: '0x1234',
      recipient: '0x5678',
      token: 'cUSD',
      amount: '100',
      timestamp: 1000,
    })
    const id2 = generateScheduleId({
      sender: '0x1234',
      recipient: '0x5678',
      token: 'cUSD',
      amount: '200',
      timestamp: 1000,
    })
    expect(id1).not.toBe(id2)
  })
})

describe('parseTokenSymbol', () => {
  it('parses token symbols case-insensitively', () => {
    expect(parseTokenSymbol('cUSD')).toBe('cUSD')
    expect(parseTokenSymbol('CUSD')).toBe('cUSD')
    expect(parseTokenSymbol('cusd')).toBe('cUSD')
    expect(parseTokenSymbol('cEUR')).toBe('cEUR')
    expect(parseTokenSymbol('USDT')).toBe('USDT')
  })

  it('returns undefined for unknown tokens', () => {
    expect(parseTokenSymbol('ETH')).toBeUndefined()
    expect(parseTokenSymbol('')).toBeUndefined()
  })
})

describe('formatTokenAmount', () => {
  it('formats amounts with token symbol', () => {
    expect(formatTokenAmount(BigInt(5e18), 'cUSD')).toBe('5 cUSD')
    expect(formatTokenAmount(BigInt(5.5e18), 'cUSD')).toBe('5.5 cUSD')
    expect(formatTokenAmount(BigInt(100e6), 'USDT')).toBe('100 USDT')
  })
})
