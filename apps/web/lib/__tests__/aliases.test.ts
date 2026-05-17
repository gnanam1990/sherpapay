import { describe, it, expect } from 'vitest'
import {
  normalizeAlias,
  aliasStorageKey,
  resolveAlias,
  addToMap,
  removeFromMap,
  toEntries,
  readAliases,
  upsertAlias,
  deleteAlias,
} from '../aliases'

function fakeStorage() {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  }
}

const ADDR = '0xAbC0000000000000000000000000000000000001'
const TARGET = '0x99f37717f2EB28955CFB553f3B7Eb4eFaDf4dA8C'

describe('pure alias helpers', () => {
  it('normalizes names case/space-insensitively', () => {
    expect(normalizeAlias('  Mom ')).toBe('mom')
    expect(normalizeAlias('DAD')).toBe('dad')
  })

  it('scopes the storage key to the lowercased wallet', () => {
    expect(aliasStorageKey(ADDR)).toBe(`sherpapay.aliases.${ADDR.toLowerCase()}`)
  })

  it('resolves case-insensitively, null when absent', () => {
    const map = addToMap({}, 'Mom', TARGET)
    expect(resolveAlias(map, 'mom')).toBe(TARGET)
    expect(resolveAlias(map, 'MOM')).toBe(TARGET)
    expect(resolveAlias(map, 'dad')).toBeNull()
  })

  it('add/remove are immutable and normalized', () => {
    const a = addToMap({}, 'Mom', TARGET)
    const b = removeFromMap(a, 'MOM')
    expect(a).toEqual({ mom: TARGET })
    expect(b).toEqual({})
  })

  it('toEntries sorts by name', () => {
    expect(toEntries({ zoe: '0x2', amy: '0x1' })).toEqual([
      { name: 'amy', address: '0x1' },
      { name: 'zoe', address: '0x2' },
    ])
  })
})

describe('storage layer (injected fake)', () => {
  it('round-trips through upsert/read/delete, wallet-scoped', () => {
    const s = fakeStorage()
    upsertAlias(ADDR, 'Mom', TARGET, s)
    expect(readAliases(ADDR, s)).toEqual({ mom: TARGET })
    // a different wallet sees nothing
    expect(readAliases('0xdifferent', s)).toEqual({})
    deleteAlias(ADDR, 'mom', s)
    expect(readAliases(ADDR, s)).toEqual({})
  })

  it('returns {} on malformed JSON', () => {
    const s = fakeStorage()
    s.setItem(aliasStorageKey(ADDR), '{not json')
    expect(readAliases(ADDR, s)).toEqual({})
  })
})
