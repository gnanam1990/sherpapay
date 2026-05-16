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

## Next Wiring

- Add `SCHEDULER_CONTRACT_ADDRESS=0x135Ea0F5422fB1D4aDeaC8A205735498ffA5B933` to the worker deployment.
- Wire the web scheduling and savings flows to submit wallet transactions against these contracts.
- Add both contract addresses as Celo mainnet data sources in Talent.
