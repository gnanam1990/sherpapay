import { describe, it, expect } from 'vitest'
import {
  phoneStorageKey,
  resolvePhone,
  addPhoneToMap,
  removePhoneFromMap,
  phoneEntries,
  readPhoneMap,
  savePhoneMapping,
  getPhoneMapping,
  listPhoneMappings,
  deletePhoneMapping,
} from '../phone-map'

function fakeStorage() {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  }
}

const WALLET = '0xAbC0000000000000000000000000000000000001'
const TARGET = '0x99f37717f2EB28955CFB553f3B7Eb4eFaDf4dA8C'

describe('pure phone-map helpers', () => {
  it('scopes the storage key to the lowercased wallet', () => {
    expect(phoneStorageKey(WALLET)).toBe(`sherpapay.phones.${WALLET.toLowerCase()}`)
  })

  it('keys on the normalized phone (separators ignored)', () => {
    const map = addPhoneToMap({}, '+234 801-234.5678', TARGET)
    expect(resolvePhone(map, '+2348012345678')).toBe(TARGET)
    expect(resolvePhone(map, '+234 (801) 234 5678')).toBe(TARGET)
    expect(resolvePhone(map, '+10000000000')).toBeNull()
  })

  it('add/remove are immutable and normalized', () => {
    const a = addPhoneToMap({}, '+1 (415) 555-2671', TARGET)
    expect(a).toEqual({ '+14155552671': TARGET })
    const b = removePhoneFromMap(a, '+1 415 555 2671')
    expect(b).toEqual({})
  })

  it('phoneEntries sorts by phone', () => {
    expect(phoneEntries({ '+44999': '0x2', '+11111': '0x1' })).toEqual([
      { phone: '+11111', address: '0x1' },
      { phone: '+44999', address: '0x2' },
    ])
  })
})

describe('phone-map storage layer (injected fake)', () => {
  it('round-trips through save/get/list/delete, wallet-scoped', () => {
    const s = fakeStorage()
    savePhoneMapping(WALLET, '+234 801 234 5678', TARGET, s)
    expect(getPhoneMapping(WALLET, '+2348012345678', s)).toBe(TARGET)
    expect(listPhoneMappings(WALLET, s)).toEqual([{ phone: '+2348012345678', address: TARGET }])
    // a different wallet sees nothing
    expect(getPhoneMapping('0xother', '+2348012345678', s)).toBeNull()
    deletePhoneMapping(WALLET, '+2348012345678', s)
    expect(listPhoneMappings(WALLET, s)).toEqual([])
  })

  it('returns {} on malformed JSON', () => {
    const s = fakeStorage()
    s.setItem(phoneStorageKey(WALLET), '{not json')
    expect(readPhoneMap(WALLET, s)).toEqual({})
  })

  it('getPhoneMapping returns null when absent', () => {
    const s = fakeStorage()
    expect(getPhoneMapping(WALLET, '+2348012345678', s)).toBeNull()
  })
})
