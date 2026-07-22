---
name: apecoft-tool-suite
description: Orientation and working rules for the Apecoft Tool Suite repo — a static, no-build, client-side DeFi tool suite. Read this first before changing anything, then follow the reading order and hard rules below.
---

# Apecoft Tool Suite — Start Here

You are picking up work on **Apecoft Tool Suite**, a static browser app: a set of DeFi calculators and probability games. No build step, no backend — one HTML shell plus vanilla ES modules, live data from public APIs, user input in `localStorage`.

Read this file first. It is the map. The detail lives in the other docs.

## Reading order (fastest path to context)

1. **`PROMPT.md`** — the continuation brief. Read in full; it is the substance.
2. **`ARCHITECTURE.md`** — how the app is wired (shell + views, module contract, data fetching, deployment).
3. **`STYLE_GUIDE.md`** — coding conventions. Follow these when writing code.
4. **`FEATURE.md`** — what is shipped, dev-locked, or a placeholder.
5. **`DATABASE.md`** — `localStorage` keys and API data shapes (there is no real database).
6. **`TODO.md`** — prioritized outstanding work; pick your task here.

## The map in 30 seconds

- `index.html` — every view's static markup + all CSS (`<style>`) + the importmap.
- `src/index.js` — entry point, shared state, and `setView()` (the view router).
- `src/apps/*` and `src/games/*` — one module per tool; each exports `{ initialState, initialize(context) }`.
- `src/animations.js` — all motion (anime.js). `src/services/cryptoService.js` — pricing. `src/components/*` — coin picker, icons, graph. `src/i18n/*` — strings.
- `api/coingecko/[...path].js` — Vercel serverless pricing proxy. `vendor/` — pinned anime.js.

## Hard rules (do not break these)

1. **Preserve element IDs and `data-i18n-key` attributes.** Modules bind to them; renaming breaks the tool.
2. **No build step.** Everything runs directly in the browser — relative `.js` imports and valid importmap entries only. No bundler, no transpile.
3. **Theme via `#<view-id>`-scoped CSS, not JS edits.** ID specificity overrides inline Tailwind, so JS-generated markup is restyled without touching JavaScript. One identity accent per tool (LP cyan, Yield indigo, Comparator amber, PT/YT green).
4. **Route all motion through `animations.js`** and honor `prefers-reduced-motion`. Animate `transform`/`opacity` only.
5. **`@apply` does not work** inside the `<style>` block (Tailwind Play CDN). Write plain CSS there, using the design tokens.

## How to verify a change

Serve the root statically and click through the affected views with the console open:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

Pricing path is `cryptoService.js` → `/api/coingecko` (on Vercel) → public CORS-proxy fallbacks (local/static). A clean run has no console errors and every touched view opens and functions.

## When you are done

Keep commits focused with imperative subjects. Update `FEATURE.md`/`TODO.md` if you change status. Do not add product-facing mentions of tooling or assistants, and keep secrets/keys out of the repo (the CoinGecko key is an environment variable, documented in `ARCHITECTURE.md`).
