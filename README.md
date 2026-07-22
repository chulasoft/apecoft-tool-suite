# Apecoft Tool Suite

[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)
[![Powered by CoinGecko](https://img.shields.io/badge/Powered%20by-CoinGecko-brightgreen)](https://www.coingecko.com/)
[![Data from DefiLlama](https://img.shields.io/badge/Data%20from-DefiLlama-purple)](https://defillama.com/)

A suite of browser-based calculators and simulators for decentralized finance. Each tool runs entirely client-side, pulls live market data on demand, and keeps your inputs in local storage. No build step, no backend state.

---

## Tools

| Tool | What it does |
| --- | --- |
| **Liquidity Pool Calculator** | Projects returns, impermanent loss, and out-of-range risk for concentrated liquidity positions. |
| **DeFi Yield Calculator** | Tracks a portfolio of yield positions and models the fee, investment, or APR needed to hit an income target. |
| **Market Cap Comparator** | Compares two assets and projects one's price at the other's market cap (spot or all-time-high). |
| **PT/YT Strategy Simulator** | Models Principal- and Yield-Token outcomes against your own APY and price forecasts. |
| **Test Your Luck** | A set of probability games — Dice Duel, Penney Race, Designate Choice, and Fish Prawn Crab. |

More tools are in progress; see [`docs/FEATURE.md`](docs/FEATURE.md) for the full status list.

---

## Tech stack

- **Frontend:** HTML5, Tailwind CSS, vanilla JavaScript (ES modules) — no bundler
- **Animation:** anime.js (vendored locally)
- **Market data:** [CoinGecko](https://www.coingecko.com/en/api) and [DefiLlama](https://defillama.com/docs/api)
- **Export:** jsPDF and jspdf-autotable (PDF), qrcode

---

## Running it

The app is static. To run locally, serve the repository root with any static file server and open `index.html`:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Deploying to Vercel serves the same files and enables the CoinGecko request proxy under `api/`. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for how data fetching and deployment fit together.

---

## Documentation

Working docs for anyone continuing the project live in [`docs/`](docs/):

- [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) — how the app is put together
- [`STYLE_GUIDE.md`](docs/STYLE_GUIDE.md) — coding conventions
- [`FEATURE.md`](docs/FEATURE.md) — feature status: shipped and planned
- [`DATABASE.md`](docs/DATABASE.md) — local-storage and API data shapes
- [`TODO.md`](docs/TODO.md) — outstanding work
- [`PROMPT.md`](docs/PROMPT.md) — quick context brief for continuing the work

---

## License

Licensed under [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-nc-sa/4.0/).

- **Share** — copy and redistribute in any medium or format
- **Adapt** — remix, transform, and build upon the material

Under these terms: **Attribution**, **NonCommercial**, and **ShareAlike**.

Thanks to [CoinGecko](https://www.coingecko.com/) and [DefiLlama](https://defillama.com/) for their free data APIs.
