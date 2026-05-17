import { describe, it, expect } from 'vitest'
import {
  requireWorkerPrivateKey,
  loadConfig,
  planExecution,
  dayKey,
  type Hex,
} from '../execution.js'

const VALID = `0x${'a'.repeat(64)}`
const ZERO = `0x${'0'.repeat(64)}`

describe('requireWorkerPrivateKey', () => {
  it('throws when missing (refuses to run without a real signer)', () => {
    expect(() => requireWorkerPrivateKey(undefined)).toThrow(/required/)
    expect(() => requireWorkerPrivateKey('')).toThrow(/required/)
    expect(() => requireWorkerPrivateKey('   ')).toThrow(/required/)
  })

  it('throws on malformed keys', () => {
    expect(() => requireWorkerPrivateKey('0x123')).toThrow(/32-byte hex/)
    expect(() => requireWorkerPrivateKey('a'.repeat(64))).toThrow(/32-byte hex/)
  })

  it('throws on the zero placeholder', () => {
    expect(() => requireWorkerPrivateKey(ZERO)).toThrow(/zero placeholder/)
  })

  it('returns a trimmed valid key', () => {
    expect(requireWorkerPrivateKey(`  ${VALID}  `)).toBe(VALID)
  })
})

describe('loadConfig', () => {
  it('applies defaults around a valid key', () => {
    const cfg = loadConfig({ WORKER_PRIVATE_KEY: VALID } as NodeJS.ProcessEnv)
    expect(cfg.rpcUrl).toBe('https://forno.celo.org')
    expect(cfg.cronSchedule).toBe('* * * * *')
    expect(cfg.dueLimit).toBe(50)
    expect(cfg.healthPort).toBe(8080)
  })

  it('honors overrides and falls back on bad numbers', () => {
    const cfg = loadConfig({
      WORKER_PRIVATE_KEY: VALID,
      CELO_RPC_URL: 'https://rpc.example',
      CRON_SCHEDULE: '*/5 * * * *',
      DUE_LIMIT: 'not-a-number',
      HEALTH_PORT: '9090',
    } as NodeJS.ProcessEnv)
    expect(cfg.rpcUrl).toBe('https://rpc.example')
    expect(cfg.cronSchedule).toBe('*/5 * * * *')
    expect(cfg.dueLimit).toBe(50)
    expect(cfg.healthPort).toBe(9090)
  })

  it('refuses to load without a key', () => {
    expect(() => loadConfig({} as NodeJS.ProcessEnv)).toThrow(/required/)
  })
})

describe('planExecution', () => {
  const id = (n: number): Hex => `0x${String(n).padStart(64, '0')}`
  it('returns none for an empty set', () => {
    expect(planExecution([])).toBe('none')
  })
  it('returns single for one id', () => {
    expect(planExecution([id(1)])).toBe('single')
  })
  it('returns batch for multiple ids', () => {
    expect(planExecution([id(1), id(2), id(3)])).toBe('batch')
  })
})

describe('dayKey', () => {
  it('formats a UTC YYYY-MM-DD key', () => {
    expect(dayKey(new Date('2026-05-17T23:59:00Z'))).toBe('2026-05-17')
  })
})
