# Security Policy

SherpaPay holds user escrow in Solidity contracts on Celo mainnet, so
we take security seriously.

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Use GitHub's private vulnerability reporting:

1. Go to the repository's **Security** tab → **Report a vulnerability**.
2. Describe the issue, impact, and reproduction steps.

(If private reporting is unavailable, contact the maintainer through
their [GitHub profile](https://github.com/gnanam1990) and request a
secure channel before sharing details.)

We aim to acknowledge reports within 72 hours and to keep you updated
through triage and a fix.

## Scope

In scope:

- `contracts/src/` — `SherpaPayScheduler`, `SherpaPayVault`
  (Celo mainnet: `0x135Ea0…B933`, `0x70A581…26ee`)
- The contract-driven worker (key handling, execution logic)
- The web app's transaction construction / safety checks

Out of scope:

- Third-party services (Celoscan, CoinGecko, RPC providers)
- Issues requiring a compromised user device or wallet
- Best-effort, gracefully-degrading features (e.g. keyless Celoscan
  history) failing due to upstream rate limits

## Handling

- The on-chain contracts are immutable and source-verified on Celoscan.
- `executeDuePayment` / `executeBatch` are permissionless by design;
  escrow is pre-funded and refundable via `cancelSchedule`.
- Never commit keys — `.env` is git-ignored; the worker refuses to
  start without a real `WORKER_PRIVATE_KEY` and never fakes execution.

Thank you for helping keep SherpaPay users safe.
