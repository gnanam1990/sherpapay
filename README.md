# SherpaPay

**Type once. Send forever.**

Plain-English payments for MiniPay — schedule recurring stablecoin transfers on Celo with natural language.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Celo](https://img.shields.io/badge/Chain-Celo-35D07F)](https://celo.org)
[![MiniPay](https://img.shields.io/badge/Surface-MiniPay-0052FF)](https://minipay.opera.com)

## Problem

MiniPay has 4M+ users in emerging markets sending stablecoin payments daily. But the UX requires manually entering long wallet addresses, setting up each payment, and remembering recipients across sessions. There's no native scheduling for recurring payments.

Users in Nigeria, Kenya, Ghana, Mexico, Philippines, and India use MiniPay primarily for family remittances, bills, rent, and small savings — all done manually, every time.

## Solution

SherpaPay lets users type plain English to create scheduled payments:

```
"send 5 cUSD to mom every friday"
→ SherpaPay parses intent, verifies safety, schedules onchain, executes automatically
```

## Features

- **Natural Language Input** — Type what you want in plain English
- **Scheduled Payments** — Daily, weekly, monthly recurring transfers
- **Recipient Aliases** — "mom" maps to a wallet address
- **Safety Rings** — 7-layer safety checks before any transaction
- **Savings Goals** — Goal-based savings with auto-DCA
- **Multi-Token** — cUSD, cEUR, USDT on Celo
- **MiniPay Native** — First-class MiniPay integration
- **Local Currency** — Display amounts in NGN, KES, GHS, MXN, PHP, INR

## Tech Stack

| Layer           | Technology                          |
| --------------- | ----------------------------------- |
| Frontend        | Next.js 15, Tailwind CSS, shadcn/ui |
| Backend         | Fastify, PostgreSQL                 |
| Smart Contracts | Solidity 0.8.24, OpenZeppelin       |
| Blockchain      | Celo (mainnet + Alfajores)          |
| Build           | pnpm workspaces, Turborepo          |
| Testing         | Vitest, Foundry (Forge)             |
| Tooling         | TypeScript strict, ESLint, Prettier |

## Architecture

```
sherpapay/
├── apps/
│   ├── web/          # Next.js 15 frontend
│   ├── api/          # Fastify backend
│   └── worker/       # Cron daemon for executions
├── packages/
│   ├── core/         # Types, constants, errors
│   ├── parser/       # NL → Intent
│   ├── safety/       # 7 safety rings
│   ├── celo/         # Celo chain integration
│   ├── minipay/      # MiniPay SDK wrapper
│   ├── scheduler/    # Recurring payment engine
│   ├── memory/       # Postgres data layer
│   ├── ui/           # Shared React components
│   └── identity/     # Recipient resolution
├── contracts/
│   ├── src/          # SherpaPayScheduler + SherpaPayVault
│   ├── test/         # 22+ contract tests
│   └── script/       # Deployment scripts
└── docs/
```

## Smart Contracts

### SherpaPayScheduler

Manages scheduled recurring payments on Celo.

- `schedulePayment()` — Create a new recurring payment
- `executeDuePayment()` — Execute a payment that's due
- `executeBatch()` — Execute multiple due payments
- `pauseSchedule()` / `resumeSchedule()` / `cancelSchedule()`

### SherpaPayVault

Savings goals with auto-DCA.

- `createGoal()` — Create a savings goal
- `contribute()` — Add funds toward a goal
- `withdraw()` — Withdraw when goal is achieved
- `emergencyWithdraw()` — Early withdrawal with 2% penalty

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Foundry (for smart contracts)

### Installation

```bash
git clone https://github.com/gnanam1990/sherpapay.git
cd sherpapay
pnpm install
```

### Development

```bash
# Start web app
pnpm dev:web

# Start API server
pnpm dev:api

# Run tests
pnpm test

# Typecheck
pnpm typecheck

# Build all packages
pnpm build
```

### Smart Contracts

```bash
cd contracts

# Build
forge build

# Test
forge test

# Deploy to Alfajores (testnet)
forge script script/DeployTestnet.s.sol --rpc-url alfajores --broadcast --verify
```

## Quality Gates

- TypeScript strict mode (no `any` types)
- 22+ smart contract tests passing
- ESLint + Prettier enforced
- Conventional commits (commitlint)
- Pre-commit hooks (husky + lint-staged)

## Related Projects

- [Sherpa](https://sherpa-web.vercel.app) — Natural-language agent on Base (sibling project)

## License

MIT

---

Built by [gnanam1990](https://github.com/gnanam1990) for Celo Proof of Ship (May 2026)
