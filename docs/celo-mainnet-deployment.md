# Celo Mainnet Deployment

SherpaPay contracts were deployed to Celo mainnet on 2026-05-16.

| Contract           | Address                                      | Deployment tx                                                        |
| ------------------ | -------------------------------------------- | -------------------------------------------------------------------- |
| SherpaPayScheduler | `0x135Ea0F5422fB1D4aDeaC8A205735498ffA5B933` | `0x6cd072627215e765b25a0c962b03a8db3df3cb5f34b87504c699ee63e5462520` |
| SherpaPayVault     | `0x70A58169BF96587E55F500c4b5cb9d956Ef826ee` | `0xe161dde89333756577fde1eed240da5615c9b01b50b6a5e67e8de7730847918e` |

## Verification

Deployment output:

```text
Chain: Celo mainnet (42220)
Block: 67032832
Total paid: 0.55835027089564132 CELO
```

Bytecode was verified locally with:

```bash
cast code 0x135Ea0F5422fB1D4aDeaC8A205735498ffA5B933 --rpc-url https://forno.celo.org
cast code 0x70A58169BF96587E55F500c4b5cb9d956Ef826ee --rpc-url https://forno.celo.org
```

## Source Verification

**Status: not yet verified on a public explorer.** The deployed bytecode
matches the source (confirmed locally via `cast code`), but neither a
Sourcify nor a Celoscan/Etherscan source match has been published yet.

Why it is still pending:

- **Celoscan/Etherscan route — needs a key.** Celoscan retired its V1 API
  (`api.celoscan.io/api`) for the Etherscan V2 multichain API. `foundry.toml`
  is now pointed at `https://api.etherscan.io/v2/api` (chain `42220`), but
  verification requires a free Etherscan API key in `ETHERSCAN_API_KEY`,
  which is not configured in this environment.
- **Sourcify route — tooling mismatch.** `forge 1.5.1`'s `--verifier sourcify`
  posts an Etherscan-style/urlencoded payload that the current Sourcify
  server rejects (`unsupported media type`); the keyless path could not be
  completed automatically here.

### How to verify (no constructor args — both constructors are parameterless)

Etherscan V2 (gives the native Celoscan "Verified" tab), with a key:

```bash
cd contracts
export ETHERSCAN_API_KEY=<free etherscan api key>

forge verify-contract --chain celo \
  --compiler-version 0.8.24 --num-of-optimizations 200 \
  0x135Ea0F5422fB1D4aDeaC8A205735498ffA5B933 \
  src/SherpaPayScheduler.sol:SherpaPayScheduler --watch

forge verify-contract --chain celo \
  --compiler-version 0.8.24 --num-of-optimizations 200 \
  0x70A58169BF96587E55F500c4b5cb9d956Ef826ee \
  src/SherpaPayVault.sol:SherpaPayVault --watch
```

Sourcify alternative (keyless): use the Sourcify web UI
(<https://sourcify.dev>) with the Standard JSON input from
`forge build` (`contracts/out`), or a Sourcify-compatible forge/CLI
version, until the forge↔Sourcify-v2 mismatch above is resolved.

Explorer links:

- Scheduler: <https://celoscan.io/address/0x135Ea0F5422fB1D4aDeaC8A205735498ffA5B933>
- Vault: <https://celoscan.io/address/0x70A58169BF96587E55F500c4b5cb9d956Ef826ee>

## Next Wiring

- Add `SCHEDULER_CONTRACT_ADDRESS=0x135Ea0F5422fB1D4aDeaC8A205735498ffA5B933` to the worker deployment.
- Wire the web scheduling and savings flows to submit wallet transactions against these contracts.
- Add both contract addresses as Celo mainnet data sources in Talent.
