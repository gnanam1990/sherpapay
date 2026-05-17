/// <reference lib="dom" />

/**
 * Minimal keyless Celoscan client for the history page.
 *
 * The free Etherscan/Celoscan API is rate-limited and increasingly
 * key-gated, so: aggressive 60s in-memory cache, single small window
 * per list, and graceful failure (callers show a "view on Celoscan"
 * fallback instead of breaking). Pure URL/parse/classify helpers are
 * unit-tested; only `fetchHistory` touches the network.
 */

import { SCHEDULER_ADDRESS } from '@sherpapay/celo'

const BASE = 'https://api.celoscan.io/api'
export const CELOSCAN_TX = (hash: string) => `https://celoscan.io/tx/${hash}`
export const CELOSCAN_ADDRESS = (a: string) => `https://celoscan.io/address/${a}`

export interface RawNativeTx {
  hash: string
  timeStamp: string
  from: string
  to: string
  value: string
  isError: string
}

export interface RawTokenTx {
  hash: string
  timeStamp: string
  from: string
  to: string
  value: string
  tokenSymbol: string
  tokenDecimal: string
}

interface CeloscanResponse<T> {
  status: string
  message: string
  result: T[] | string
}

export type Direction = 'in' | 'out' | 'self'
export type HistoryKind = 'native' | 'token' | 'scheduler'

export interface HistoryItem {
  hash: string
  kind: HistoryKind
  token: string
  amount: string
  direction: Direction
  counterparty: string
  timestamp: number
  url: string
}

export function buildTxlistUrl(address: string, offset: number): string {
  return `${BASE}?module=account&action=txlist&address=${address}&sort=desc&page=1&offset=${offset}`
}

export function buildTokentxUrl(address: string, offset: number): string {
  return `${BASE}?module=account&action=tokentx&address=${address}&sort=desc&page=1&offset=${offset}`
}

export type ParseResult<T> = { ok: true; rows: T[] } | { ok: false; reason: string }

/** Etherscan-family quirk: status "0" can mean "no txns" (ok, empty) or an error. */
export function parseResponse<T>(json: CeloscanResponse<T>): ParseResult<T> {
  if (json.status === '1' && Array.isArray(json.result)) {
    return { ok: true, rows: json.result }
  }
  if (json.status === '0' && /no transactions found/i.test(json.message)) {
    return { ok: true, rows: [] }
  }
  const reason = typeof json.result === 'string' ? json.result : json.message
  return { ok: false, reason: reason || 'celoscan_error' }
}

function direction(from: string, to: string, user: string): Direction {
  const u = user.toLowerCase()
  const f = from.toLowerCase() === u
  const t = to.toLowerCase() === u
  if (f && t) return 'self'
  return f ? 'out' : 'in'
}

function isScheduler(from: string, to: string): boolean {
  const s = SCHEDULER_ADDRESS.toLowerCase()
  return from.toLowerCase() === s || to.toLowerCase() === s
}

function fmtUnits(value: string, decimals: number): string {
  // Integer string → decimal string without floating error.
  const neg = value.startsWith('-')
  const v = (neg ? value.slice(1) : value).padStart(decimals + 1, '0')
  const whole = v.slice(0, v.length - decimals) || '0'
  const frac = v.slice(v.length - decimals).replace(/0+$/, '')
  return `${neg ? '-' : ''}${whole}${frac ? `.${frac}` : ''}`
}

export function classifyNative(tx: RawNativeTx, user: string): HistoryItem {
  return {
    hash: tx.hash,
    kind: 'native',
    token: 'CELO',
    amount: fmtUnits(tx.value, 18),
    direction: direction(tx.from, tx.to, user),
    counterparty: direction(tx.from, tx.to, user) === 'out' ? tx.to : tx.from,
    timestamp: Number(tx.timeStamp) * 1000,
    url: CELOSCAN_TX(tx.hash),
  }
}

export function classifyToken(tx: RawTokenTx, user: string): HistoryItem {
  const scheduler = isScheduler(tx.from, tx.to)
  return {
    hash: tx.hash,
    kind: scheduler ? 'scheduler' : 'token',
    token: tx.tokenSymbol,
    amount: fmtUnits(tx.value, Number(tx.tokenDecimal) || 18),
    direction: direction(tx.from, tx.to, user),
    counterparty: direction(tx.from, tx.to, user) === 'out' ? tx.to : tx.from,
    timestamp: Number(tx.timeStamp) * 1000,
    url: CELOSCAN_TX(tx.hash),
  }
}

/** Merge native + token items, newest first, de-duplicated by hash+token. */
export function mergeHistory(native: HistoryItem[], token: HistoryItem[]): HistoryItem[] {
  const seen = new Set<string>()
  return [...token, ...native]
    .filter((i) => {
      const k = `${i.hash}:${i.token}:${i.direction}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    .sort((a, b) => b.timestamp - a.timestamp)
}

interface CacheEntry {
  at: number
  json: unknown
}
const CACHE_TTL_MS = 60_000
const cache = new Map<string, CacheEntry>()

async function getCached<T>(url: string): Promise<ParseResult<T>> {
  const now = Date.now()
  const hit = cache.get(url)
  let json: CeloscanResponse<T>
  if (hit && now - hit.at < CACHE_TTL_MS) {
    json = hit.json as CeloscanResponse<T>
  } else {
    const res = await fetch(url)
    if (!res.ok) return { ok: false, reason: `http_${res.status}` }
    json = (await res.json()) as CeloscanResponse<T>
    cache.set(url, { at: now, json })
  }
  return parseResponse(json)
}

export interface HistoryResult {
  ok: boolean
  items: HistoryItem[]
  reason?: string
}

/**
 * Fetch a window of the address's native + token history (size = limit).
 * Returns ok:false (with whatever cached/partial items) so the UI can
 * show a graceful fallback when Celoscan rate-limits a keyless request.
 */
export async function fetchHistory(address: string, limit: number): Promise<HistoryResult> {
  const [nativeRes, tokenRes] = await Promise.all([
    getCached<RawNativeTx>(buildTxlistUrl(address, limit)),
    getCached<RawTokenTx>(buildTokentxUrl(address, limit)),
  ])

  const native = nativeRes.ok
    ? nativeRes.rows.filter((t) => t.isError !== '1').map((t) => classifyNative(t, address))
    : []
  const token = tokenRes.ok ? tokenRes.rows.map((t) => classifyToken(t, address)) : []

  if (!nativeRes.ok && !tokenRes.ok) {
    return { ok: false, items: [], reason: tokenRes.reason || nativeRes.reason }
  }
  return { ok: true, items: mergeHistory(native, token) }
}
