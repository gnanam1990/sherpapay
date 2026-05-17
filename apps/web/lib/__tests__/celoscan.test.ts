import { describe, it, expect } from 'vitest'
import { SCHEDULER_ADDRESS } from '@sherpapay/celo'
import {
  buildTxlistUrl,
  buildTokentxUrl,
  parseResponse,
  classifyNative,
  classifyToken,
  mergeHistory,
  type HistoryItem,
} from '../celoscan'

const USER = '0xAbC0000000000000000000000000000000000001'
const OTHER = '0xDeF0000000000000000000000000000000000002'

describe('URL builders', () => {
  it('build txlist/tokentx with address, desc, offset', () => {
    expect(buildTxlistUrl(USER, 25)).toBe(
      `https://api.celoscan.io/api?module=account&action=txlist&address=${USER}&sort=desc&page=1&offset=25`,
    )
    expect(buildTokentxUrl(USER, 10)).toContain('action=tokentx')
  })
})

describe('parseResponse', () => {
  it('ok with rows on status 1', () => {
    expect(parseResponse({ status: '1', message: 'OK', result: [{ a: 1 }] })).toEqual({
      ok: true,
      rows: [{ a: 1 }],
    })
  })
  it('ok empty on "No transactions found"', () => {
    expect(parseResponse({ status: '0', message: 'No transactions found', result: [] })).toEqual({
      ok: true,
      rows: [],
    })
  })
  it('not ok on rate-limit / key errors', () => {
    const r = parseResponse({ status: '0', message: 'NOTOK', result: 'Max rate limit reached' })
    expect(r.ok).toBe(false)
    expect(r).toMatchObject({ reason: 'Max rate limit reached' })
  })
})

describe('classification', () => {
  it('native: direction + CELO formatting (18 dp)', () => {
    const item = classifyNative(
      {
        hash: '0x1',
        timeStamp: '1700000000',
        from: USER,
        to: OTHER,
        value: '1500000000000000000',
        isError: '0',
      },
      USER,
    )
    expect(item).toMatchObject({
      kind: 'native',
      token: 'CELO',
      amount: '1.5',
      direction: 'out',
      counterparty: OTHER,
    })
    expect(item.timestamp).toBe(1700000000 * 1000)
  })

  it('token transfer in, 6dp, trims trailing zeros', () => {
    const item = classifyToken(
      {
        hash: '0x2',
        timeStamp: '1700000001',
        from: OTHER,
        to: USER,
        value: '2500000',
        tokenSymbol: 'USDT',
        tokenDecimal: '6',
      },
      USER,
    )
    expect(item).toMatchObject({ kind: 'token', token: 'USDT', amount: '2.5', direction: 'in' })
  })

  it('flags scheduler interactions', () => {
    const item = classifyToken(
      {
        hash: '0x3',
        timeStamp: '1700000002',
        from: SCHEDULER_ADDRESS,
        to: USER,
        value: '10000000000000000',
        tokenSymbol: 'cUSD',
        tokenDecimal: '18',
      },
      USER,
    )
    expect(item.kind).toBe('scheduler')
    expect(item.amount).toBe('0.01')
  })

  it('self-transfer detected', () => {
    const item = classifyNative(
      { hash: '0x4', timeStamp: '1', from: USER, to: USER, value: '0', isError: '0' },
      USER,
    )
    expect(item.direction).toBe('self')
    expect(item.amount).toBe('0')
  })
})

describe('mergeHistory', () => {
  const mk = (hash: string, ts: number, token = 'CELO'): HistoryItem => ({
    hash,
    kind: 'native',
    token,
    amount: '1',
    direction: 'out',
    counterparty: OTHER,
    timestamp: ts,
    url: '',
  })
  it('sorts newest first and de-dupes hash+token+direction', () => {
    const merged = mergeHistory(
      [mk('0xa', 100), mk('0xb', 300)],
      [mk('0xa', 100), mk('0xc', 200, 'cUSD')],
    )
    expect(merged.map((m) => m.hash)).toEqual(['0xb', '0xc', '0xa'])
  })
})
