# Contributing to SherpaPay

Thanks for your interest! SherpaPay is a pnpm + Turborepo monorepo
(Next.js web app, Fastify API, contract-driven worker, Solidity
contracts on Celo).

## Setup

```bash
git clone https://github.com/gnanam1990/sherpapay.git
cd sherpapay
pnpm install
```

Useful scripts (run from the repo root):

```bash
pnpm dev:web        # Next.js app
pnpm typecheck      # tsc across all packages
pnpm test           # vitest across all packages
pnpm build          # build everything
# contracts:
cd contracts && forge test
```

## Before you open a PR

- `pnpm typecheck && pnpm test && pnpm build` all green
- `cd contracts && forge test` green if you touched Solidity
- New behavior has tests (parser/safety/celo/worker are unit-tested;
  pure helpers especially)
- No secrets committed (`.env` is git-ignored — keep keys there)

## Conventions

- **Conventional Commits**, enforced by commitlint via a husky
  `commit-msg` hook (e.g. `feat(web): …`, `fix(worker): …`,
  `docs: …`). Subject starts lowercase.
- `pre-commit` runs lint-staged (Prettier + ESLint) on staged files.
- TypeScript strict mode; no `any`. Match the style of surrounding code.
- Branch from `main`; keep PRs focused (one concern per PR).

## Architecture notes

- The on-chain contract is the source of truth for schedules/goals;
  the worker is contract-driven (reads `getDueSchedules`).
- wagmi React hooks live in `apps/web/lib/`, **not** `@sherpapay/celo`
  (avoids a duplicate wagmi instance under pnpm). `@sherpapay/celo`
  stays zero-React (ABIs + pure helpers).

By contributing you agree your work is licensed under the repo's MIT
license and you follow the [Code of Conduct](CODE_OF_CONDUCT.md).
