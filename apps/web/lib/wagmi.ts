'use client'

import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { celo, celoAlfajores } from 'wagmi/chains'
import type { Config } from 'wagmi'

export const config: Config = getDefaultConfig({
  appName: 'SherpaPay',
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? 'e5e2ac7261e50897d3be44f22f30b8ca',
  chains: [celo, celoAlfajores],
  ssr: true,
}) as Config

export const TOKENS = {
  [celo.id]: {
    cUSD: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
    cEUR: '0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73',
    USDT: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e',
  },
  [celoAlfajores.id]: {
    cUSD: '0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1',
    cEUR: '0x10c892A6EC8626552A871393653D402e88D3b2Bd',
    USDT: '0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B',
  },
} as const
