# Features

Status of every tool in the suite.

## Shipped

These are fully implemented, reachable from the landing page, and visually modernized.

| Tool | View id | Module | Notes |
| --- | --- | --- | --- |
| Liquidity Pool Calculator | `calculator-app` | `src/apps/calculator.js` | Live pricing, impermanent-loss and out-of-range projections, PDF/Excel export. Accent: cyan. |
| DeFi Yield Calculator | `yield-dashboard` | `src/apps/yield.js` | Portfolio table, income-target optimizer, CSV import/export, PDF export. Accent: indigo. |
| Market Cap Comparator | `comparator-app` | `src/apps/comparator.js` | Two-asset comparison, spot or all-time-high market cap. Accent: amber. |
| PT/YT Strategy Simulator | `pt-calculator-app` | `src/apps/pt-calculator.js` | PT/YT modelling from user APY and price forecasts. Accent: green. |
| Test Your Luck | `luck-game-app` | `src/games/luck.js` | Hub for the four playable games below. |

### Test Your Luck — playable games

| Game | Module |
| --- | --- |
| Dice Duel | `src/games/dice-duel.js` |
| Penney Race | `src/games/penney-race.js` |
| Designate Choice | `src/games/designate-choice.js` |
| Fish Prawn Crab | `src/games/fish-prawn-crab.js` |

## Dev-locked (hidden behind a 5-second press)

Functional or partly-functional, but intentionally hidden on the landing page. Open by pressing and holding the card for five seconds.

| Tool | View id | Module | State |
| --- | --- | --- | --- |
| DeFi Seeker | `yield-finder-app` | `src/apps/yield-finder.js` | Working; queries DefiLlama pools. Not yet visually modernized. |
| Moon Sheet | `moon-sheet-app` | `src/apps/moon-sheet.js` | Working; market-cap value projection. Not yet visually modernized. |
| RPS - King's Edition | inside `luck-game-app` | `src/games/rps.js` | Playable; reached as a locked Test Your Luck room. |

## Placeholder (stub — "Coming Soon" only)

Wired into navigation but render a placeholder. They need real content or should be hidden until built.

| Tool | View id | Module |
| --- | --- | --- |
| Airdrop Hunter's Companion | `airdrop-app` | `src/apps/airdrop.js` |
| Make it or Rekt it | `make-it-or-rekt-it-app` | `src/apps/make-it-or-rekt-it.js` |
| Repay or Invest | `repay-or-invest-app` | `src/apps/repay-or-invest.js` |

Three Test Your Luck rooms are also placeholders rendered via a shared "coming soon" renderer in `luck.js`: Wheel of Fortune, Jukebox, and Dice Nim Zero.

## Cross-cutting

- **Internationalization:** the framework is in place (`data-i18n-key` + `translateUI`), but only English (`src/i18n/en.js`) is populated. The TH and KO language buttons are shown disabled.
- **Persistence:** LP Calculator, Yield, Comparator, and Moon Sheet save their inputs to `localStorage` (see `DATABASE.md`).
- **Export:** LP Calculator and Yield support PDF export; Yield also does CSV import/export.
