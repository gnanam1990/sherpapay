import {
  CELO_MAINNET_CHAIN_ID,
  CELO_ALFAJORES_CHAIN_ID,
  CELO_MAINNET_RPC_URL,
  CELO_ALFAJORES_RPC_URL,
  CELO_MAINNET_TOKENS,
  CELO_ALFAJORES_TOKENS,
  CELO_MAINNET_SHERPAPAY_CONTRACTS,
} from '@sherpapay/core'
import type { TokenSymbol } from '@sherpapay/core'
import { createPublicClient, http, type PublicClient, type Chain } from 'viem'
import { celo, celoAlfajores } from 'viem/chains'

// ─── Chain Configs ───────────────────────────────────────────────────

export const celoMainnet: Chain = celo
export const celoTestnet: Chain = celoAlfajores

// ─── Token Addresses ─────────────────────────────────────────────────

export const mainnetTokens = CELO_MAINNET_TOKENS
export const testnetTokens = CELO_ALFAJORES_TOKENS
export const mainnetContracts = CELO_MAINNET_SHERPAPAY_CONTRACTS

// ─── ERC-20 ABI (minimal) ────────────────────────────────────────────

export const erc20Abi = [
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'transfer',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'symbol',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
] as const

// ─── Client Factory ──────────────────────────────────────────────────

/**
 * Create a viem PublicClient for Celo
 * @param chainId - CELO_MAINNET_CHAIN_ID or CELO_ALFAJORES_CHAIN_ID
 * @returns PublicClient configured for the specified chain
 */
export function getCeloClient(chainId: number = CELO_MAINNET_CHAIN_ID): PublicClient {
  if (chainId !== CELO_MAINNET_CHAIN_ID && chainId !== CELO_ALFAJORES_CHAIN_ID) {
    throw new Error(`Unsupported chain ID: ${chainId}`)
  }
  const isMainnet = chainId === CELO_MAINNET_CHAIN_ID
  const chain = isMainnet ? celoMainnet : celoTestnet
  const rpcUrl = isMainnet ? CELO_MAINNET_RPC_URL : CELO_ALFAJORES_RPC_URL

  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  })
}

/**
 * Get token address for a given chain and token symbol
 * @param chainId - Chain ID
 * @param token - Token symbol
 * @returns Token contract address
 */
export function getTokenAddress(chainId: number, token: TokenSymbol): string {
  const tokens = chainId === CELO_MAINNET_CHAIN_ID ? mainnetTokens : testnetTokens
  return tokens[token]
}

/**
 * Get all token addresses for a given chain
 * @param chainId - Chain ID
 * @returns Token addresses object
 */
export function getAllTokenAddresses(chainId: number) {
  return chainId === CELO_MAINNET_CHAIN_ID ? mainnetTokens : testnetTokens
}

// ─── SherpaPay Contract ABIs ─────────────────────────────────────────

export * from './scheduler-abi.js'
export * from './scheduler-hooks.js'
