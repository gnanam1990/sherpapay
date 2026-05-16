import { TOKEN_DECIMALS } from './constants.js'
import type { TokenSymbol } from './types.js'

/**
 * Convert a human-readable amount to wei (bigint)
 * @param amount - Human-readable amount (e.g., "5.5")
 * @param token - Token symbol to determine decimals
 * @returns Amount in wei as bigint
 */
export function amountToWei(amount: string, token: TokenSymbol): bigint {
  const decimals = TOKEN_DECIMALS[token]
  const [whole, fraction = ''] = amount.split('.')
  const wholePart = whole ?? '0'
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals)
  return BigInt(wholePart + paddedFraction)
}

/**
 * Convert wei (bigint) to human-readable amount string
 * @param wei - Amount in wei
 * @param token - Token symbol to determine decimals
 * @returns Human-readable amount string
 */
export function weiToAmount(wei: bigint, token: TokenSymbol): string {
  const decimals = TOKEN_DECIMALS[token]
  const str = wei.toString().padStart(decimals + 1, '0')
  const whole = str.slice(0, -decimals) || '0'
  const fraction = str.slice(-decimals).replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : whole
}

/**
 * Format an Ethereum address for display (truncated)
 * @param address - Full address
 * @param chars - Characters to show on each side
 * @returns Truncated address like "0x1234...5678"
 */
export function formatAddress(address: string, chars: number = 4): string {
  if (address.length < 10) return address
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

/**
 * Validate an Ethereum address format
 * @param address - Address to validate
 * @returns true if valid address format
 */
export function isValidAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address)
}

/**
 * Generate a deterministic schedule ID from parameters
 * @param params - Schedule parameters
 * @returns A unique schedule ID string
 */
export function generateScheduleId(params: {
  sender: string
  recipient: string
  token: string
  amount: string
  timestamp: number
}): string {
  const data = `${params.sender}:${params.recipient}:${params.token}:${params.amount}:${params.timestamp}`
  // Simple hash for ID generation (actual onchain uses keccak256)
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  return `0x${Math.abs(hash).toString(16).padStart(64, '0')}`
}

/**
 * Get token symbol from string (case-insensitive)
 * @param str - String to parse
 * @returns TokenSymbol or undefined
 */
export function parseTokenSymbol(str: string): TokenSymbol | undefined {
  const normalized = str.toUpperCase()
  if (normalized === 'CUSD') return 'cUSD'
  if (normalized === 'CEUR') return 'cEUR'
  if (normalized === 'USDT') return 'USDT'
  return undefined
}

/**
 * Format a token amount for display with symbol
 * @param amount - Amount in wei
 * @param token - Token symbol
 * @returns Formatted string like "5.50 cUSD"
 */
export function formatTokenAmount(amount: bigint, token: TokenSymbol): string {
  const humanAmount = weiToAmount(amount, token)
  return `${humanAmount} ${token}`
}
