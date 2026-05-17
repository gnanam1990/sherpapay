import { afterEach, describe, expect, it, vi } from 'vitest'
import { isMiniPayEnvironment, getMiniPayProvider } from '../detect'

type Eth = Record<string, unknown>

function setEnv(opts: { ethereum?: Eth; userAgent?: string; noWindow?: boolean }): void {
  if (opts.noWindow) {
    vi.stubGlobal('window', undefined)
  } else {
    vi.stubGlobal('window', { ethereum: opts.ethereum } as unknown)
  }
  vi.stubGlobal('navigator', { userAgent: opts.userAgent ?? 'Mozilla/5.0' } as unknown)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('isMiniPayEnvironment', () => {
  it('returns false when window is undefined (SSR safe)', () => {
    setEnv({ noWindow: true })
    expect(isMiniPayEnvironment()).toBe(false)
  })

  it('returns false when window exists but ethereum is absent', () => {
    setEnv({ ethereum: undefined })
    expect(isMiniPayEnvironment()).toBe(false)
  })

  it('returns true when ethereum.isMiniPay is true', () => {
    setEnv({ ethereum: { isMiniPay: true } })
    expect(isMiniPayEnvironment()).toBe(true)
  })

  it('returns true when the user agent contains "MiniPay"', () => {
    setEnv({ ethereum: {}, userAgent: 'Mozilla/5.0 MiniPay/1.0' })
    expect(isMiniPayEnvironment()).toBe(true)
  })

  it('returns true when a nested provider reports isMiniPay', () => {
    setEnv({ ethereum: { providers: [{ isMiniPay: false }, { isMiniPay: true }] } })
    expect(isMiniPayEnvironment()).toBe(true)
  })

  it('returns false when neither flag, UA, nor provider matches', () => {
    setEnv({ ethereum: { isMiniPay: false } })
    expect(isMiniPayEnvironment()).toBe(false)
  })

  it('returns false when a providers array exists but none are MiniPay', () => {
    setEnv({ ethereum: { providers: [{ isMiniPay: false }, {}] } })
    expect(isMiniPayEnvironment()).toBe(false)
  })

  it('returns false when isMiniPay is explicitly false and no other signal', () => {
    setEnv({ ethereum: { isMiniPay: false }, userAgent: 'Chrome/120' })
    expect(isMiniPayEnvironment()).toBe(false)
  })
})

describe('getMiniPayProvider', () => {
  it('returns null when not in a MiniPay environment', () => {
    setEnv({ ethereum: { isMiniPay: false } })
    expect(getMiniPayProvider()).toBeNull()
  })

  it('returns the top-level provider when it is MiniPay', () => {
    const eth = { isMiniPay: true }
    setEnv({ ethereum: eth })
    expect(getMiniPayProvider()).toBe(eth)
  })

  it('returns the nested MiniPay provider when present in providers[]', () => {
    const miniPay = { isMiniPay: true }
    setEnv({ ethereum: { providers: [{ isMiniPay: false }, miniPay] } })
    expect(getMiniPayProvider()).toBe(miniPay)
  })

  it('falls back to window.ethereum when detected via user agent only', () => {
    const eth = {}
    setEnv({ ethereum: eth, userAgent: 'MiniPay' })
    expect(getMiniPayProvider()).toBe(eth)
  })
})
