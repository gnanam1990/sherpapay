/**
 * Wallet-scoped display-currency override, stored client-side under
 * `sherpapay.currency.<wallet>` — same pattern as lib/aliases.ts /
 * lib/phone-map.ts. When unset, the app falls back to the locale-derived
 * currency (see useLocalCurrency). The stored value is a plain currency
 * code, validated on read so a stale/garbage value degrades to "auto".
 */

import { CURRENCIES, type LocalCurrency } from '@sherpapay/celo'

const KEY_PREFIX = 'sherpapay.currency.'

export function isLocalCurrency(value: unknown): value is LocalCurrency {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(CURRENCIES, value)
}

/** Override wins; otherwise the locale-derived currency. */
export function resolveCurrency(
  override: LocalCurrency | null,
  localeDerived: LocalCurrency,
): LocalCurrency {
  return override ?? localeDerived
}

export function currencyStorageKey(walletAddress: string): string {
  return `${KEY_PREFIX}${walletAddress.toLowerCase()}`
}

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function defaultStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

export function readCurrencyOverride(
  walletAddress: string,
  storage: StorageLike | null = defaultStorage(),
): LocalCurrency | null {
  if (!storage) return null
  const raw = storage.getItem(currencyStorageKey(walletAddress))
  return isLocalCurrency(raw) ? raw : null
}

export function writeCurrencyOverride(
  walletAddress: string,
  currency: LocalCurrency,
  storage: StorageLike | null = defaultStorage(),
): void {
  if (!storage) return
  storage.setItem(currencyStorageKey(walletAddress), currency)
}

export function clearCurrencyOverride(
  walletAddress: string,
  storage: StorageLike | null = defaultStorage(),
): void {
  if (!storage) return
  storage.removeItem(currencyStorageKey(walletAddress))
}
