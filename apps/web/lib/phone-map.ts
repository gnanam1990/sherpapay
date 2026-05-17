/**
 * Wallet-scoped phone→address book, stored client-side in localStorage
 * under `sherpapay.phones.<wallet>` — the exact same pattern as
 * lib/aliases.ts. There is NO network identity registry: SherpaPay does
 * not operate Celo's Self.id / Federated Attestations infrastructure, so
 * a phone number only resolves if the user mapped it themselves on this
 * device. Keys use the parser's `normalizePhone` so a number typed in a
 * command matches the same number saved here regardless of separators.
 */

import { normalizePhone } from '@sherpapay/parser'

export type PhoneMap = Record<string, string>

export interface PhoneEntry {
  /** Normalized phone (digits, leading + kept). */
  phone: string
  /** 0x wallet address. */
  address: string
}

const KEY_PREFIX = 'sherpapay.phones.'

export function phoneStorageKey(walletAddress: string): string {
  return `${KEY_PREFIX}${walletAddress.toLowerCase()}`
}

export function resolvePhone(map: PhoneMap, phone: string): string | null {
  return map[normalizePhone(phone)] ?? null
}

export function addPhoneToMap(map: PhoneMap, phone: string, address: string): PhoneMap {
  return { ...map, [normalizePhone(phone)]: address }
}

export function removePhoneFromMap(map: PhoneMap, phone: string): PhoneMap {
  const key = normalizePhone(phone)
  const next: PhoneMap = {}
  for (const [k, v] of Object.entries(map)) {
    if (k !== key) next[k] = v
  }
  return next
}

export function phoneEntries(map: PhoneMap): PhoneEntry[] {
  return Object.entries(map)
    .map(([phone, address]) => ({ phone, address }))
    .sort((a, b) => a.phone.localeCompare(b.phone))
}

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function defaultStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

export function readPhoneMap(
  walletAddress: string,
  storage: StorageLike | null = defaultStorage(),
): PhoneMap {
  if (!storage) return {}
  try {
    const raw = storage.getItem(phoneStorageKey(walletAddress))
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed as PhoneMap
    return {}
  } catch {
    return {}
  }
}

export function writePhoneMap(
  walletAddress: string,
  map: PhoneMap,
  storage: StorageLike | null = defaultStorage(),
): void {
  if (!storage) return
  storage.setItem(phoneStorageKey(walletAddress), JSON.stringify(map))
}

export function savePhoneMapping(
  walletAddress: string,
  phone: string,
  address: string,
  storage: StorageLike | null = defaultStorage(),
): PhoneMap {
  const next = addPhoneToMap(readPhoneMap(walletAddress, storage), phone, address)
  writePhoneMap(walletAddress, next, storage)
  return next
}

export function getPhoneMapping(
  walletAddress: string,
  phone: string,
  storage: StorageLike | null = defaultStorage(),
): string | null {
  return resolvePhone(readPhoneMap(walletAddress, storage), phone)
}

export function listPhoneMappings(
  walletAddress: string,
  storage: StorageLike | null = defaultStorage(),
): PhoneEntry[] {
  return phoneEntries(readPhoneMap(walletAddress, storage))
}

export function deletePhoneMapping(
  walletAddress: string,
  phone: string,
  storage: StorageLike | null = defaultStorage(),
): PhoneMap {
  const next = removePhoneFromMap(readPhoneMap(walletAddress, storage), phone)
  writePhoneMap(walletAddress, next, storage)
  return next
}
