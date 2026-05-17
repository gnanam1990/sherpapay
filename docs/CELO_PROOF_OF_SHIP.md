# SherpaPay — Celo Proof of Ship

**Type once. Send forever.**

A factual, verifiable summary for review. Every claim below is checkable
against the contracts on Celoscan and the public GitHub history.

## What is SherpaPay

Plain-English recurring payments for MiniPay on Celo.

- **Problem:** MiniPay's 4M+ users send stablecoins manually — retyping
  long addresses, re-creating each payment, with no native scheduling.
- **Solution:** type `send 5 cUSD to mom every friday`. SherpaPay parses
  the intent, runs safety checks, creates an on-chain schedule with
  prefunded escrow, and a permissionless worker executes each due
  payment automatically.
- **Target users:** the MiniPay markets — Nigeria, Kenya, Ghana, Mexico,
  Philippines, India (remittances, bills, rent, small savings).

## What's shipped (verifiable)

**Smart contracts — deployed and source-verified on Celo mainnet (42220):**

| Contract           | Address                                      | Status     |
| ------------------ | -------------------------------------------- | ---------- |
| SherpaPayScheduler | `0x135Ea0F5422fB1D4aDeaC8A205735498ffA5B933` | Verified ✓ |
| SherpaPayVault     | `0x70A58169BF96587E55F500c4b5cb9d956Ef826ee` | Verified ✓ |

- Scheduler source: <https://celoscan.io/address/0x135Ea0F5422fB1D4aDeaC8A205735498ffA5B933#code>
- Vault source: <https://celoscan.io/address/0x70A58169BF96587E55F500c4b5cb9d956Ef826ee#code>
- Deployed 2026-05-16, block 67032832. Deploy tx for the scheduler:
  `0x6cd072627215e765b25a0c962b03a8db3df3cb5f34b87504c699ee63e5462520`.
- Source-verified via the Etherscan V2 API (`Pass - Verified`),
  Solidity 0.8.24, optimizer 200 runs, no constructor args.

**On-chain evidence:** the full transaction history for both contracts —
schedule creation, funding, `executeDuePayment` executions, and
cancel/refund — is visible on the Celoscan address pages above. The
end-to-end flow (create → fund → worker `executeDuePayment` → recipient
paid → cancel → escrow refunded) was smoke-tested on **mainnet** with
real cUSD and a separate keeper wallet paying gas.

**Quality:**

- 201 automated tests passing (TypeScript/Vitest across parser, safety,
  scheduler, celo, worker, identity, core, web).
- 22+ Foundry contract tests (`contracts/test`).
- `pnpm typecheck` and `pnpm build` green across all 12 packages/apps.
- CI (GitHub Actions): lint, typecheck, test, build, `forge test`, plus
  an advisory Slither job.
- Conventional commits, husky + lint-staged enforced. Public history:
  <https://github.com/gnanam1990/sherpapay/commits/main>

## Architecture

pnpm + Turborepo monorepo, TypeScript strict throughout.

- **3 apps:** `web` (Next.js 15), `api` (Fastify), `worker`
  (contract-driven execution daemon).
- **9 packages:** `core`, `parser` (NL → intent), `safety`,
  `celo` (ABIs + helpers), `minipay`, `scheduler`, `memory`, `ui`,
  `identity`.
- **2 Solidity contracts** on Celo mainnet (`SherpaPayScheduler`,
  `SherpaPayVault`), OpenZeppelin-based, `forge`-built.
- Stack: Next.js + wagmi/viem on the client, Fastify + `pg` on the API,
  viem on the worker.

The on-chain contract is the source of truth: the worker reads
`getDueSchedules` directly from the scheduler and submits real
`executeDuePayment` / `executeBatch` transactions. It refuses to start
without a funded signer and never fabricates executions.

## Celo integration depth

- **MiniPay-native:** detects the MiniPay in-app browser
  (`window.ethereum.isMiniPay` / UA / nested provider) and auto-connects
  via the injected/EIP-6963 connector — no manual "connect wallet".
- **Mento stablecoins:** cUSD, cEUR, and USDT supported for sends,
  schedules, and history.
- **Local currency:** cUSD amounts shown in NGN / KES / GHS / MXN / PHP /
  INR via the CoinGecko API (cached).
- **i18n:** English, Kiswahili, Español, हिन्दी (locale-aware, persisted).
- **Real escrow + execution:** `schedulePayment` + `fundSchedule` lock
  escrow; `cancelSchedule` refunds the unspent balance to the user;
  `executeDuePayment` is permissionless so any keeper can run due
  payments.

## Honest current state

Shipped and working end-to-end (mainnet smoke-tested):

- Scheduler + Vault deployed and **verified** on mainnet
- Direct cUSD/cEUR/USDT sends
- Recurring schedules — create, fund, pause/resume, cancel + refund
- Contract-driven worker executing real due schedules with a keeper
  wallet (no faked executions anywhere in the codebase)
- `/schedules` and `/goals` read live contract state
- Recipient aliases (per-wallet, on-device), i18n, local-currency display

Not yet / known limitations (no overclaiming):

- No large user base or third-party audit yet
- Recipient aliases are on-device only (no multi-device sync)
- Transaction history uses the keyless Celoscan endpoint, which Celoscan
  has deprecated (V1) — it degrades gracefully to a "view on Celoscan"
  link and is upgradeable to live data with an Etherscan V2 key
- Creating a savings goal from a natural-language command is not yet
  wired (the vault and `/goals` actions are live)
- Deferred by choice: push/SMS notifications, user-selectable display
  currency, additional languages

## Links

- **GitHub:** <https://github.com/gnanam1990/sherpapay>
- **Commit history / activity:** <https://github.com/gnanam1990/sherpapay/commits/main>
- **Scheduler (verified):** <https://celoscan.io/address/0x135Ea0F5422fB1D4aDeaC8A205735498ffA5B933#code>
- **Vault (verified):** <https://celoscan.io/address/0x70A58169BF96587E55F500c4b5cb9d956Ef826ee#code>
- **Builder (X):** @0x_art (kRΛTOS)
- **Live app:** _add deployed URL_
- **Talent Protocol profile:** _add profile link_

_(Placeholders above are intentionally not filled with guessed URLs —
replace before submitting.)_
