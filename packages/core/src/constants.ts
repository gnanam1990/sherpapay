import type { TokenSymbol } from './types.js'

// ─── Chain IDs ───────────────────────────────────────────────────────

export const CELO_MAINNET_CHAIN_ID = 42220 as const
export const CELO_ALFAJORES_CHAIN_ID = 44787 as const

// ─── RPC URLs ────────────────────────────────────────────────────────

export const CELO_MAINNET_RPC_URL = 'https://forno.celo.org'
export const CELO_ALFAJORES_RPC_URL = 'https://alfajores-forno.celo-testnet.org'

// ─── Block Explorers ─────────────────────────────────────────────────

export const CELO_MAINNET_EXPLORER = 'https://celoscan.io'
export const CELO_ALFAJORES_EXPLORER = 'https://alfajores.celoscan.io'

// ─── Token Addresses ─────────────────────────────────────────────────

export interface TokenAddresses {
  readonly cUSD: string
  readonly cEUR: string
  readonly USDT: string
}

export const CELO_MAINNET_TOKENS: TokenAddresses = {
  cUSD: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
  cEUR: '0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73',
  USDT: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e',
} as const

export const CELO_ALFAJORES_TOKENS: TokenAddresses = {
  cUSD: '0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1',
  cEUR: '0x10c892A6EC8626552A871393653D402e88D3b2Bd',
  USDT: '0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B',
} as const

// ─── SherpaPay Contracts ─────────────────────────────────────────────

export interface SherpaPayContractAddresses {
  readonly scheduler: string
  readonly vault: string
}

export const CELO_MAINNET_SHERPAPAY_CONTRACTS: SherpaPayContractAddresses = {
  scheduler: '0x135Ea0F5422fB1D4aDeaC8A205735498ffA5B933',
  vault: '0x70A58169BF96587E55F500c4b5cb9d956Ef826ee',
} as const

// ─── Safety Limits ───────────────────────────────────────────────────

export const SAFETY_LIMITS = {
  PER_TX_MAX: BigInt(500e18), // 500 cUSD
  DAILY_MAX: BigInt(1000e18), // 1000 cUSD
  MONTHLY_MAX: BigInt(10000e18), // 10000 cUSD
  SCHEDULE_LIFETIME_MAX: BigInt(100000e18), // 100000 cUSD
  MIN_INTERVAL_SECONDS: 3600, // 1 hour
  MAX_INTERVAL_SECONDS: 31536000, // 1 year
  MAX_SCHEDULE_DURATION_YEARS: 10,
  ANOMALY_MULTIPLIER: 3,
} as const

// ─── Known Scam Addresses (Celo-specific) ────────────────────────────

export const KNOWN_SCAM_ADDRESSES: readonly string[] = [
  // Add known scam addresses here
] as const

// ─── Schedule Defaults ───────────────────────────────────────────────

export const SCHEDULE_DEFAULTS = {
  MAX_FAILURES: 3,
  MAX_SCHEDULES_PER_USER: 50,
} as const

// ─── Token Decimals ──────────────────────────────────────────────────

export const TOKEN_DECIMALS: Record<TokenSymbol, number> = {
  cUSD: 18,
  cEUR: 18,
  USDT: 6,
} as const

// ─── Frequency Intervals ─────────────────────────────────────────────

export const FREQUENCY_INTERVALS = {
  daily: 86400, // 24 * 60 * 60
  weekly: 604800, // 7 * 24 * 60 * 60
  monthly: 2592000, // 30 * 24 * 60 * 60
} as const
