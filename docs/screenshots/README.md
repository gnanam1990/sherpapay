# Screenshots

Referenced from the root `README.md`. These are **not** auto-generated
(an AI agent can't capture a browser headlessly, and we never commit
fabricated images). Capture them from a running app and commit the PNGs
here with the exact filenames below; until then the README links to
this guide rather than embedding broken/placeholder images.

The app uses the **Soft Glass** design system with mandatory light +
dark modes, so every screen needs **both** a `-light` and `-dark` shot.
Toggle with the sun/moon control in the header.

Run `pnpm dev:web`, connect a wallet (ideally inside MiniPay at ~360px):

| Light file            | Dark file            | Screen       | What to show                                                                                            |
| --------------------- | -------------------- | ------------ | ------------------------------------------------------------------------------------------------------- |
| `home-light.png`      | `home-dark.png`      | `/`          | Hero (gradient "Send forever"), glass compose card, status row                                          |
| `confirm-light.png`   | `confirm-dark.png`   | `/`          | A parsed weekly schedule → glass confirmation card (gradient amount, DetailRows, 12-cycle/total-locked) |
| `schedules-light.png` | `schedules-dark.png` | `/schedules` | An active schedule glass card: gradient initial, status badge, pause/cancel                             |
| `goals-light.png`     | `goals-dark.png`     | `/goals`     | A goal with the gradient progress bar + contribute/withdraw                                             |
| `history-light.png`   | `history-dark.png`   | `/history`   | Glass history list with a schedule-execution row + a filter applied                                     |
| `settings-light.png`  | `settings-dark.png`  | `/settings`  | Glass alias manager with 1–2 saved aliases + the language switcher                                      |

Guidelines:

- Mobile-width viewport (~360px) — SherpaPay is MiniPay-first; the
  header wordmark intentionally hides below `sm`.
- Capture both modes for every screen (12 files total).
- Use small real amounts (e.g. 0.01 cUSD) so shots match the live
  mainnet contracts.
- Nothing fake: every value shown must be real on-chain/app state.
