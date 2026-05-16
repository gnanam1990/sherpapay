/// <reference lib="dom" />

export function isMiniPay(): boolean {
  if (typeof window === 'undefined') return false
  return /MiniPay/i.test(navigator.userAgent)
}

export function getMiniPayProvider(): unknown {
  if (typeof window === 'undefined') return null
  return (window as Window & { ethereum?: unknown }).ethereum ?? null
}
