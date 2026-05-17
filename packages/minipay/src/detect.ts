/// <reference lib="dom" />

/**
 * Minimal shape of an injected EIP-1193 provider as exposed by MiniPay and
 * other wallet browsers. We only model the fields we actually inspect.
 */
export interface InjectedProvider {
  isMiniPay?: boolean
  providers?: InjectedProvider[]
  request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

function getWindowEthereum(): InjectedProvider | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as Window & { ethereum?: InjectedProvider }).ethereum
}

/**
 * Returns true when the app is running inside the MiniPay in-app browser.
 *
 * Detection order:
 * 1. `window.ethereum.isMiniPay === true` (primary, set by MiniPay)
 * 2. User agent contains "MiniPay"
 * 3. A provider in `window.ethereum.providers` reports `isMiniPay`
 *
 * SSR-safe: returns false when `window` is undefined.
 */
export function isMiniPayEnvironment(): boolean {
  if (typeof window === 'undefined') return false

  const eth = getWindowEthereum()
  if (!eth) return false

  if (eth.isMiniPay === true) return true

  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.userAgent === 'string' &&
    navigator.userAgent.includes('MiniPay')
  ) {
    return true
  }

  if (eth.providers?.some((p) => p.isMiniPay === true)) return true

  return false
}

/**
 * Returns the MiniPay EIP-1193 provider, or null when not in MiniPay.
 *
 * When multiple providers are injected, the one flagged `isMiniPay` is
 * preferred; otherwise the top-level `window.ethereum` is returned.
 */
export function getMiniPayProvider(): InjectedProvider | null {
  if (!isMiniPayEnvironment()) return null

  const eth = getWindowEthereum()
  if (!eth) return null

  if (eth.isMiniPay === true) return eth

  const fromList = eth.providers?.find((p) => p.isMiniPay === true)
  if (fromList) return fromList

  return eth
}
