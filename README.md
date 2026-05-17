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

## Why SherpaPay

- **No addresses to retype.** Save "mom" once; every future command resolves it.
- **Recurring, hands-off.** A schedule is funded once and a permissionless
  on-chain worker executes each due payment — no app open, no reminders.
- **Self-custodial.** Escrow lives in an audited-style Solidity contract on
  Celo; cancel anytime and the unspent balance is refunded to you.
- **Built for the markets MiniPay serves.** English/Swahili/Spanish/Hindi,
  local-currency equivalents (₦/KSh/₹…), works in the MiniPay webview.
- **Cheap.** A weekly 0.01 cUSD schedule for 12 cycles costs cents of CELO gas.

## MiniPay Native Integration

SherpaPay is built MiniPay-first. When the app is opened inside the MiniPay
in-app browser it:

- **Auto-detects MiniPay** — via `window.ethereum.isMiniPay`, the MiniPay
  user agent, or a nested injected provider (`@sherpapay/minipay`).
- **Auto-connects** — binds to MiniPay's injected wallet through the
  EIP-6963 connector, so users skip the manual "connect wallet" step.
- **Shows a "Connected via MiniPay" badge** so users can see the native
  session is active.
- **Sends Celo stablecoins from plain English** — live cUSD, cEUR, and
  USDT transfers, parsed and safety-checked before signing.

Non-MiniPay browsers are unaffected — the standard RainbowKit wallet
picker still applies.

### Testing in MiniPay

MiniPay detection and auto-connect only run inside the MiniPay app (they
cannot be exercised in a normal desktop browser).

1. Open the MiniPay app (Android / iOS)
2. Tap **Discover**
3. Enter the deployed SherpaPay URL
4. The app auto-connects — type a command such as
   `send 0.01 cUSD to 0x...` to send instantly

## Features

- **Natural-language input** — type a payment in plain English
- **Direct sends** — cUSD / cEUR / USDT transfers on Celo
- **Scheduled payments** — `schedulePayment` + prefunded escrow, executed
  on-chain by a permissionless worker; pause / resume / cancel + refund
- **Safety checks** — multi-ring validation before any signature
- **MiniPay native** — auto-detect + auto-connect in the MiniPay webview
- **Recipient aliases** — "mom" → `0x…`, per-wallet, on-device
- **Local-currency equivalents** — ₦ / KSh / GH₵ / MX$ / ₱ / ₹ via CoinGecko
- **i18n** — English, Kiswahili, Español, हिन्दी
- **Transaction history** — native + token + schedule activity from Celoscan
- **Savings vault** — contribute / withdraw against on-chain goals

## Roadmap

Honest status — what is shipped vs not.

**Shipped**

- [x] Natural-language parser + multi-ring safety
- [x] Live cUSD/cEUR/USDT sends (mainnet, smoke-tested)
- [x] On-chain scheduled payments — create, fund, pause/resume/cancel
- [x] Contract-driven worker — real `executeDuePayment`/`executeBatch`
      (mainnet smoke-tested; no faked executions anywhere)
- [x] `/schedules` and `/goals` read live contract state
- [x] MiniPay detection + auto-connect
- [x] i18n (en/sw/es/hi) + local-currency display
- [x] Per-wallet recipient aliases (on-device)
- [x] Transaction history via Celoscan

**Coming soon**

- [ ] Create savings goals from a natural-language command
      (the vault + `/goals` actions are live; the "save …" intent is
      not yet wired to `createGoal`)
- [ ] User-selectable display currency (locale-derived default for now)
- [ ] Optional server sync for aliases/history (currently on-device only)
- [ ] CI test matrix, issue templates, expanded coverage
- [ ] Demo video

## Screenshots

> The UI uses the **Soft Glass** design system (mandatory light + dark).
> Shots are captured separately and committed under `docs/screenshots/`
> (see [`docs/screenshots/README.md`](docs/screenshots/README.md) for the
> exact list). Not embedded here until the real images are added — no
> placeholder or fabricated graphics.

| Screen    | Light                                  | Dark                                  |
| --------- | -------------------------------------- | ------------------------------------- |
| Home      | `docs/screenshots/home-light.png`      | `docs/screenshots/home-dark.png`      |
| Confirm   | `docs/screenshots/confirm-light.png`   | `docs/screenshots/confirm-dark.png`   |
| Schedules | `docs/screenshots/schedules-light.png` | `docs/screenshots/schedules-dark.png` |
| Goals     | `docs/screenshots/goals-light.png`     | `docs/screenshots/goals-dark.png`     |
| History   | `docs/screenshots/history-light.png`   | `docs/screenshots/history-dark.png`   |
| Settings  | `docs/screenshots/settings-light.png`  | `docs/screenshots/settings-dark.png`  |

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

- **Celo mainnet:** `0x135Ea0F5422fB1D4aDeaC8A205735498ffA5B933`
- `schedulePayment()` — Create a new recurring payment
- `fundSchedule()` — Add escrow for future executions
- `executeDuePayment()` — Execute a payment that's due
- `executeBatch()` — Execute multiple due payments
- `pauseSchedule()` / `resumeSchedule()` / `cancelSchedule()`

### SherpaPayVault

Savings goals with auto-DCA.

- **Celo mainnet:** `0x70A58169BF96587E55F500c4b5cb9d956Ef826ee`
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

# Deploy to Celo mainnet with an encrypted Foundry account
forge script script/DeployMainnet.s.sol:DeployMainnet \
  --rpc-url https://forno.celo.org \
  --account sherpapay-deployer \
  --broadcast
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
