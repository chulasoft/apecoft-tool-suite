# Architecture

## Overview

Apecoft Tool Suite is a single-page, client-side application. There is **no build step and no server-side state** — the browser loads `index.html`, which pulls in ES modules directly and styles the page with the Tailwind Play CDN. Market data is fetched on demand from public APIs; user input is persisted in `localStorage`.

## Directory layout

```
index.html            App shell: every view's static markup + all CSS (<style>) + importmap
README.md             Public overview
LICENSE               CC BY-NC-SA 4.0

api/
  coingecko/[...path].js   Vercel serverless proxy for the CoinGecko API

src/
  index.js            Entry point: state, view router (setView), shared utils, event wiring
  animations.js       anime.js helpers (intro, view transitions, scroll reveal, hold ring)
  i18n/
    translations.js   Language registry
    en.js             English strings (single source; TH/KO not yet translated)
  services/
    cryptoService.js  CoinGecko fetching with a tiered fallback (see "Data fetching")
  components/
    CoinSelector.js   Reusable token-picker modal
    icons.js          Inline SVG icon factory functions
    PriceRangeGraph.js  LP price-range visual
  apps/
    calculator.js         Liquidity Pool Calculator
    yield.js              DeFi Yield Calculator / portfolio
    comparator.js         Market Cap Comparator
    pt-calculator.js      PT/YT Strategy Simulator
    moon-sheet.js         Moon Sheet (dev-locked)
    yield-finder.js       DeFi Seeker (dev-locked; uses DefiLlama)
    airdrop.js            Airdrop tool (stub)
    make-it-or-rekt-it.js Trading sim (stub)
    repay-or-invest.js    Debt-vs-invest tool (stub)
  games/
    luck.js               Test Your Luck hub + room routing
    dice-duel.js, penney-race.js, designate-choice.js,
    fish-prawn-crab.js, rps.js   Individual games

vendor/
  anime.esm.min.js    Pinned anime.js v4 ESM bundle (no CDN dependency)

docs/                 Working documentation (this folder)
```

## Application model

- **Single shell, many views.** `index.html` contains the static markup for every view, each hidden with `display:none`. `setView(viewName)` in `src/index.js` toggles visibility, lazily initializes the target module once, and runs the entry animation.
- **Module contract.** Each tool module exports an object with `initialState` and `initialize(context)`. `context` carries shared `state`, cached DOM `elements`, and `utils` (formatters, toasts, modals, `translateUI`). Modules render their own markup into a container element and wire their own event listeners.
- **Shared state.** A single `state` object in `index.js` holds `currentView`, the global coin cache, and each module's slice. Modules mutate their own slice.
- **i18n.** Elements carry `data-i18n-key`; `translateUI(lang)` fills text from the active language table, falling back to English. Only English is populated today.

## Data fetching

`src/services/cryptoService.js` fetches CoinGecko data through a **three-tier fallback**, returning the first source that yields valid JSON:

1. `/api/coingecko/*` — the same-origin serverless proxy (the reliable path on Vercel; no CORS, runs server-side).
2. `https://api.allorigins.win/raw?url=...` — public CORS proxy fallback.
3. `https://corsproxy.io/?url=...` — second public fallback.

This keeps pricing working whether the app is deployed on Vercel (tier 1) or opened as a plain static site / local file where no serverless runtime exists (tiers 2–3). The DeFi Seeker tool calls the DefiLlama pools endpoint directly (it serves permissive CORS headers).

### The serverless proxy

`api/coingecko/[...path].js` is a catch-all that forwards the path and query string to `api.coingecko.com/api/v3`, adds a `User-Agent`, and short-caches responses at the edge. It optionally reads `COINGECKO_DEMO_API_KEY` or `COINGECKO_PRO_API_KEY` from the environment and forwards the matching header. Supplying a free demo key is the single most effective way to avoid the shared-IP rate limiting that causes intermittent request failures.

## Deployment

Deploy the repository root to Vercel. Vercel serves the static files and automatically treats `api/` as serverless functions, so no extra configuration is required. Set `COINGECKO_DEMO_API_KEY` in the project's environment variables for reliable pricing under load.

## Styling and motion

- All CSS lives in the `<style>` block of `index.html`. A design-token layer (CSS custom properties for surfaces, borders, text, accent, radius, fonts) sits at the end and intentionally overrides earlier rules. Per-tool visual identity is applied with `#<view-id>`-scoped rules so JS-generated markup is themed without touching the JavaScript.
- Motion is centralized in `src/animations.js` on top of anime.js. Every helper degrades to a static no-op when anime.js is unavailable or the user prefers reduced motion.

## Hidden / dev-locked tools

Some launcher cards are intentionally blurred and only open after a five-second press (an admin gesture for staging unfinished work). The press handling and progress ring live in `src/index.js` and `src/animations.js`; the same pattern gates several Test Your Luck rooms in `src/games/luck.js`.
