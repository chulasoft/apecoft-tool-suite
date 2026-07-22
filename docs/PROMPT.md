# Continuation Brief

A quick primer for whoever picks up this project next. Read this first, then `ARCHITECTURE.md` and `TODO.md`.

## What this is

Apecoft Tool Suite is a static, client-side collection of DeFi calculators and probability games. One HTML shell (`index.html`) hosts every view; vanilla ES modules under `src/` drive each tool. There is no build step and no backend — market data comes from public APIs and user input lives in `localStorage`.

## How it's organized

- Views are static markup in `index.html`, toggled by `setView()` in `src/index.js`.
- Each tool is a module in `src/apps/` (or `src/games/`) exporting `{ initialState, initialize(context) }`.
- Shared helpers: `src/animations.js` (motion), `src/services/cryptoService.js` (pricing), `src/components/` (coin picker, icons, graph), `src/i18n/` (strings).
- All CSS is in the `<style>` block of `index.html`, built on a design-token layer. Tools are themed with `#<view-id>`-scoped rules so the JavaScript never changes.

Full detail is in `ARCHITECTURE.md`; conventions are in `STYLE_GUIDE.md`.

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

`TODO.md` has the prioritized list. The highest-value next steps are deploying to Vercel with a CoinGecko demo key, then modernizing the two remaining dev-locked tools (DeFi Seeker, Moon Sheet) to match the shipped four.

## Design skill

`docs/skill-design-taste-frontend/` contains the frontend design skill used for the UI modernization, moved here to keep the repo root clean. It is no longer in the Claude Code auto-load path (`.claude/skills/`); to use it as a live skill again, reinstall it (for example `npx skills add`) or copy the folder back under `.claude/skills/`. `docs/skills-lock.json` records its source.
