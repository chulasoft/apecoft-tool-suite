---
name: apecoft-tool-suite
description: The one-page map and working rules for the Apecoft Tool Suite repo — a static, no-build, client-side DeFi tool suite. Read the root CONTEXT.md first for the overview, then this for the map, hard rules, and reading order into the rest of docs/.
---

# Apecoft Tool Suite — Map & Rules

You should have read the root **[`CONTEXT.md`](../CONTEXT.md)** already — that is the core overview and the required first read. This file is the quick-reference map, the hard rules, and the path into the rest of the docs.

**Apecoft Tool Suite** is a static browser app: a set of DeFi calculators and probability games. No build step, no backend — one HTML shell plus vanilla ES modules, live data from public APIs, user input in `localStorage`.

## Reading order (after CONTEXT.md)

1. **`ARCHITECTURE.md`** — how the app is wired (shell + views, module contract, data fetching, deployment).
2. **`STYLE_GUIDE.md`** — coding conventions. Follow these when writing code.
3. **`FEATURE.md`** — what is shipped, dev-locked, or a placeholder.
4. **`DATABASE.md`** — `localStorage` keys and API data shapes (there is no real database).
5. **`TODO.md`** — prioritized outstanding work; pick your task here.

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
