/**
 * Wallet-scoped recipient aliases, stored client-side in localStorage.
 * No server/DB: aliases live under `sherpapay.aliases.<wallet>` so each
 * connected wallet has its own private address book (works offline in
 * the MiniPay webview). The pure transforms are storage-agnostic and
 * unit-tested; the storage layer is a thin SSR-safe wrapper.
 */

export type AliasMap = Record<string, string>

export interface AliasEntry {
  /** Normalized name as stored (lowercased, trimmed). */
  name: string
  /** 0x wallet address. */
  address: string
}

const KEY_PREFIX = 'sherpapay.aliases.'

/** Names are matched case-insensitively, whitespace-trimmed. */
export function normalizeAlias(name: string): string {
  return name.trim().toLowerCase()
}

export function aliasStorageKey(walletAddress: string): string {
  return `${KEY_PREFIX}${walletAddress.toLowerCase()}`
}

export function resolveAlias(map: AliasMap, name: string): string | null {
  return map[normalizeAlias(name)] ?? null
}

export function addToMap(map: AliasMap, name: string, address: string): AliasMap {
  return { ...map, [normalizeAlias(name)]: address }
}

export function removeFromMap(map: AliasMap, name: string): AliasMap {
  const key = normalizeAlias(name)
  const next: AliasMap = {}
  for (const [k, v] of Object.entries(map)) {
    if (k !== key) next[k] = v
  }
  return next
}

export function toEntries(map: AliasMap): AliasEntry[] {
  return Object.entries(map)
    .map(([name, address]) => ({ name, address }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function defaultStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

export function readAliases(
  walletAddress: string,
  storage: StorageLike | null = defaultStorage(),
): AliasMap {
  if (!storage) return {}
  try {
    const raw = storage.getItem(aliasStorageKey(walletAddress))
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed as AliasMap
    return {}
  } catch {
    return {}
  }
}

export function writeAliases(
  walletAddress: string,
  map: AliasMap,
  storage: StorageLike | null = defaultStorage(),
): void {
  if (!storage) return
  storage.setItem(aliasStorageKey(walletAddress), JSON.stringify(map))
}

export function upsertAlias(
  walletAddress: string,
  name: string,
  address: string,
  storage: StorageLike | null = defaultStorage(),
): AliasMap {
  const next = addToMap(readAliases(walletAddress, storage), name, address)
  writeAliases(walletAddress, next, storage)
  return next
}

export function deleteAlias(
  walletAddress: string,
  name: string,
  storage: StorageLike | null = defaultStorage(),
): AliasMap {
  const next = removeFromMap(readAliases(walletAddress, storage), name)
  writeAliases(walletAddress, next, storage)
  return next
}
