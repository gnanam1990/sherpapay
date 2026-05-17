# Screenshots

These are referenced from the root `README.md`. They are **not**
auto-generated — capture them from a running app and commit the PNGs
here with the exact filenames below. Until then the README links to
this guide rather than embedding broken images.

Run `pnpm dev:web`, connect a wallet (ideally inside MiniPay), then
capture:

| File            | Screen       | What to show                                                                                                  |
| --------------- | ------------ | ------------------------------------------------------------------------------------------------------------- |
| `home.png`      | `/`          | A parsed command + the confirmation card (e.g. a weekly schedule with the 12-cycle / total-locked disclosure) |
| `schedules.png` | `/schedules` | At least one active schedule card with status + pause/cancel actions                                          |
| `goals.png`     | `/goals`     | A savings goal with the progress bar + contribute/withdraw                                                    |
| `history.png`   | `/history`   | The history list with a schedule execution row + a filter applied                                             |
| `settings.png`  | `/settings`  | The recipient-alias manager with one or two saved aliases                                                     |

Guidelines:

- Mobile-width viewport (~390px) — SherpaPay is MiniPay-first.
- Use small real amounts (e.g. 0.01 cUSD) so screenshots match the live
  mainnet contracts.
- Redact nothing fake: every value shown should be real on-chain/app state.
