# SherpaPay

> Type a payment in plain English; SherpaPay parses it, safety-checks it, and sends or schedules it onchain on Celo.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/gnanam1990/sherpapay/actions/workflows/ci.yml/badge.svg)](https://github.com/gnanam1990/sherpapay/actions/workflows/ci.yml)

## Overview

SherpaPay turns natural-language commands such as `send 5 cUSD to mom every friday`
into Celo stablecoin transfers — either a one-off send or a prefunded, recurring
schedule executed onchain. It is built for the MiniPay surface (mobile stablecoin
users in emerging markets) who today re-enter long addresses and have no native
recurring-payment option. The parser, multi-check safety layer, escrow contracts,
and a cron worker that executes due payments are all implemented; this README
reflects the current, honest state of the code.

## Features

- **Natural-language input** — a deterministic parser turns plain English (with
  spoken numbers and currency aliases) into a typed `Intent`.
- **Direct sends** — cUSD / cEUR / USDT transfers on Celo.
- **Scheduled payments** — `schedulePayment` plus prefunded escrow, executed
  onchain by a permissionless worker; pause / resume / cancel with refund of the
  unspent balance.
- **Savings goals** — the `save …` command creates an onchain goal via the vault;
  contribute and withdraw against it.
- **Safety layer** — every intent runs through input validation, recipient
  verification, amount caps (per-tx / daily / monthly + anomaly check), a
  blocklist check, frequency validation, and a confirmation card before signing.
- **MiniPay native** — auto-detects the MiniPay in-app browser and auto-connects
  its injected wallet; standard wallets fall back to the RainbowKit picker.
- **Recipient aliases** — map a name (e.g. "mom") to an address per wallet.
- **i18n** — English, Kiswahili, Español, and हिन्दी message catalogs.
- **Local-currency display** — show local-currency equivalents alongside amounts.
- **Transaction history** — native, token, and schedule activity.

Notes on maturity are in [Status](#status). Screenshots are tracked under
`docs/screenshots/` and are not embedded until real images are committed.

## Tech stack

- **Web:** Next.js 15, React 19, Tailwind CSS, wagmi, viem, RainbowKit,
  TanStack Query, react-intl, Recharts.
- **API:** Fastify 5 with CORS and rate-limit plugins, Zod, `pg` (PostgreSQL).
- **Worker:** node-cron, viem, `pg`.
- **Contracts:** Solidity 0.8.24, Foundry (Forge), OpenZeppelin.
- **Chain:** Celo (mainnet + Alfajores testnet).
- **Monorepo:** pnpm workspaces + Turborepo, TypeScript (strict), Vitest,
  ESLint, Prettier, Husky + lint-staged, commitlint.

## Architecture

A pnpm/Turborepo monorepo with three apps, nine shared packages, and the
Solidity contracts.

```
apps/
  web/        Next.js 15 frontend (parse → confirm → send/schedule, MiniPay-aware)
  api/        Fastify API: /parse, /schedules, /aliases, /goals, /health
  worker/     node-cron daemon that executes due payments onchain
packages/
  core/       Shared types, constants (incl. SAFETY_LIMITS), errors, helpers
  parser/     Natural language → typed Intent
  safety/     Safety checks run on every intent before signing
  celo/       Celo chain integration + contract ABIs
  minipay/    MiniPay detection / connector wrapper
  scheduler/  Recurring-payment logic
  memory/     PostgreSQL data layer + migrations
  identity/   Recipient / alias resolution
  ui/         Shared React components
contracts/
  src/        SherpaPayScheduler + SherpaPayVault
  test/       Foundry tests
  script/     Deployment scripts (testnet / mainnet)
docs/         Deployment notes and screenshots
```

## Getting started

### Prerequisites

- Node.js 20+
- pnpm 9+
- [Foundry](https://book.getfoundry.sh/) (for the contracts)
- PostgreSQL (a `docker-compose.yml` provides a local Postgres 16 instance)

### Installation

```bash
git clone --recurse-submodules https://github.com/gnanam1990/sherpapay.git
cd sherpapay
pnpm install
```

The contracts use git submodules (OpenZeppelin, forge-std). If you cloned
without `--recurse-submodules`, run `git submodule update --init --recursive`
or `cd contracts && forge install`.

### Configuration

Each service reads its own env file. Copy the `.env.example` next to it and fill
in values — never commit real keys. Variable names only:

**`apps/api/.env`**

| Variable                 | Purpose                               |
| ------------------------ | ------------------------------------- |
| `DATABASE_URL`           | PostgreSQL connection string          |
| `CELO_RPC_URL`           | Celo mainnet RPC endpoint             |
| `CELO_ALFAJORES_RPC_URL` | Celo Alfajores (testnet) RPC endpoint |
| `PORT`                   | API listen port                       |
| `HOST`                   | API bind host                         |
| `JWT_SECRET`             | Secret for future auth                |

**`apps/worker/.env`**

| Variable                     | Purpose                                   |
| ---------------------------- | ----------------------------------------- |
| `API_URL`                    | API base URL for fetching due schedules   |
| `CRON_SCHEDULE`              | Cron expression (default `* * * * *`)     |
| `CELO_RPC_URL`               | Celo RPC for submitting executions        |
| `WORKER_PRIVATE_KEY`         | Key of the wallet that pays execution gas |
| `SCHEDULER_CONTRACT_ADDRESS` | Deployed scheduler contract address       |
| `MAX_RETRIES`                | Max retries for a failed execution        |
| `LOG_LEVEL`                  | Log level                                 |

**`contracts/.env`**

| Variable                 | Purpose                                           |
| ------------------------ | ------------------------------------------------- |
| `CELO_ALFAJORES_RPC_URL` | Alfajores RPC for deploy / verify                 |
| `CELO_MAINNET_RPC_URL`   | Mainnet RPC for deploy / verify                   |
| `DEPLOYER_PRIVATE_KEY`   | Deployer key (use an encrypted account in prod)   |
| `ETHERSCAN_API_KEY`      | Etherscan V2 key for Celoscan source verification |

### Running

```bash
# Start a local Postgres (optional, for the API/worker)
docker compose up -d

# Dev servers (run in separate terminals)
pnpm dev:web       # Next.js web app
pnpm dev:api       # Fastify API
pnpm dev:worker    # cron worker

# Workspace tasks (via Turborepo)
pnpm build         # build all packages
pnpm typecheck     # TypeScript strict typecheck
pnpm lint          # ESLint
pnpm format        # Prettier write
```

Apply database migrations from the memory package when needed:

```bash
pnpm --filter @sherpapay/memory dev:migrate
```

### Smart contracts

```bash
cd contracts
forge build
forge test

# Deploy to Alfajores (testnet)
forge script script/DeployTestnet.s.sol --rpc-url alfajores --broadcast --verify

# Deploy to Celo mainnet (encrypted Foundry account recommended)
forge script script/DeployMainnet.s.sol:DeployMainnet \
  --rpc-url celo \
  --account sherpapay-deployer \
  --broadcast --verify
```

The repo also exposes `pnpm deploy:testnet` and `pnpm deploy:mainnet` wrappers
for the two scripts above.

## Usage

### Command flow

```
"send 5 cUSD to mom every friday"
→ parser produces a typed Intent
→ safety checks run (caps, recipient, blocklist, confirmation card)
→ user confirms → onchain send or prefunded schedule
```

### API endpoints (Fastify, prefixed `/api`)

| Method & path                 | Purpose                   |
| ----------------------------- | ------------------------- |
| `GET  /api/health`            | Liveness check            |
| `POST /api/parse`             | Parse text into an Intent |
| `POST /api/schedules`         | Create a schedule         |
| `GET  /api/schedules/:userId` | List a user's schedules   |
| `DELETE /api/schedules/:id`   | Cancel a schedule         |
| `POST /api/aliases`           | Create a recipient alias  |
| `GET  /api/aliases/:userId`   | List a user's aliases     |
| `DELETE /api/aliases/:id`     | Delete an alias           |
| `POST /api/goals` …           | Savings-goal endpoints    |

### Safety caps

Caps live in `packages/core` (`SAFETY_LIMITS`) and are enforced in
`packages/safety` (limits are authored in 18-decimal units and scaled to each
token's decimals, so they apply to 6-decimal USDT too):

- Per-transaction max: 500
- Daily max: 1000
- Monthly max: 10000
- Anomaly flag: amount > 3× the user's average
- Schedule interval: between 1 hour and 1 year

## Testing

```bash
pnpm test          # Vitest across all TS packages
cd contracts && forge test   # 25 Foundry contract tests (scheduler + vault)
```

CI (`.github/workflows/ci.yml`) runs lint, typecheck, Vitest, and build for the
TypeScript workspace; a Foundry job builds and tests the contracts; and a
Slither job runs advisory static analysis.

## Status

MVP — running on Celo mainnet.

- **Live:** the parser, the safety layer, one-off cUSD/cEUR/USDT sends, onchain
  scheduled payments (create / fund / pause / resume / cancel), the cron worker
  executing due payments, savings goals via the `save` command and the vault,
  recipient aliases, i18n (en/sw/es/hi), and the MiniPay detect/auto-connect path.
- **Contracts:** deployed and source-verified on Celo mainnet (2026-05-16).
  Addresses are recorded in `docs/celo-mainnet-deployment.md`:
  - `SherpaPayScheduler` — `0x135Ea0F5422fB1D4aDeaC8A205735498ffA5B933`
  - `SherpaPayVault` — `0x70A58169BF96587E55F500c4b5cb9d956Ef826ee`
- **Partial / not yet:** the safety simulation check is a placeholder (returns
  no findings); display currency uses a locale-derived default rather than a
  user picker; aliases and history are on-device with no server sync yet; and
  screenshots are not yet committed.

MiniPay detection and auto-connect only run inside the MiniPay app; they cannot
be exercised from a desktop browser. To test there, open MiniPay → Discover,
enter the deployed URL, and the app auto-connects.

## License

MIT — see [LICENSE](LICENSE).
