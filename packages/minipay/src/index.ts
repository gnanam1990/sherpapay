/// <reference lib="dom" />

export function isMiniPay(): boolean {
  if (typeof window === 'undefined') return false
  return /MiniPay/i.test(navigator.userAgent)
}

export function getMiniPayProvider(): unknown {
  if (typeof window === 'undefined') return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).ethereum ?? null
}
