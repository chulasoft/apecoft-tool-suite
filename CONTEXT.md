# CONTEXT — Read This First

> **This is the core context file for the project. Any agent or contributor MUST read this file in full before reading any other file, opening any tool, or writing any code.** It is the foundation; everything else (the docs, the source, the tools) only makes sense after this. Start here, every time.

Once you have read this file, continue to [`docs/SKILL.md`](docs/SKILL.md) (the one-page map and hard rules), then the rest of [`docs/`](docs/) in order: [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) → [`STYLE_GUIDE.md`](docs/STYLE_GUIDE.md) → [`FEATURE.md`](docs/FEATURE.md) → [`DATABASE.md`](docs/DATABASE.md) → [`TODO.md`](docs/TODO.md).

## What this is

Apecoft Tool Suite is a static, client-side collection of DeFi calculators and probability games. One HTML shell (`index.html`) hosts every view; vanilla ES modules under `src/` drive each tool. There is no build step and no backend — market data comes from public APIs and user input lives in `localStorage`.

## How it's organized

- Views are static markup in `index.html`, toggled by `setView()` in `src/index.js`.
- Each tool is a module in `src/apps/` (or `src/games/`) exporting `{ initialState, initialize(context) }`.
- Shared helpers: `src/animations.js` (motion), `src/services/cryptoService.js` (pricing), `src/components/` (coin picker, icons, graph), `src/i18n/` (strings).
- All CSS is in the `<style>` block of `index.html`, built on a design-token layer. Tools are themed with `#<view-id>`-scoped rules so the JavaScript never changes.

Full detail is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md); conventions are in [`docs/STYLE_GUIDE.md`](docs/STYLE_GUIDE.md).

## Ground rules

- **Preserve element IDs and `data-i18n-key` attributes.** Modules bind to them; renaming breaks the tool.
- **No build step.** Everything must run directly in the browser — relative `.js` imports and valid importmap entries only.
- **Theme via scoped CSS, not JS edits.** To restyle a tool's generated markup, add `#<view-id>` rules; ID specificity beats inline Tailwind.
- **Motion goes through `animations.js`** and must honor `prefers-reduced-motion`.
- Keep each tool's single identity accent consistent (LP cyan, Yield indigo, Comparator amber, PT/YT green).

## Verifying changes

Serve the root statically and click through the affected views, watching the console for errors:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

For pricing-dependent tools, the request path is `cryptoService.js` → `/api/coingecko` (on Vercel) → public CORS-proxy fallbacks. Locally, tiers 2–3 handle it.

## Where to start

[`docs/TODO.md`](docs/TODO.md) has the prioritized list. The highest-value next steps are deploying to Vercel with a CoinGecko demo key, then modernizing the two remaining dev-locked tools (DeFi Seeker, Moon Sheet) to match the shipped four.
