# TODO

Outstanding work, roughly in priority order. See `FEATURE.md` for current status and `ARCHITECTURE.md` for how things fit together.

## Deployment / reliability

- [ ] Deploy to Vercel and verify the `api/coingecko` proxy responds in production.
- [ ] Add `COINGECKO_DEMO_API_KEY` to the Vercel environment (free key) to avoid shared-IP rate limiting — the main cause of intermittent pricing failures.
- [ ] Confirm the fallback chain behaves when the proxy is unavailable (open the built site as a plain static file and check pricing still loads via the CORS-proxy tiers).

## Visual modernization (remaining)

The landing page and the four shipped tools are done. Still to do:

- [ ] Modernize **DeFi Seeker** (`yield-finder-app`) to match the shipped tools (scoped `#yield-finder-app` styling; suggested accent: teal).
- [ ] Modernize **Moon Sheet** (`moon-sheet-app`) similarly (suggested accent: purple).
- [ ] Optional deeper pass on individual Test Your Luck games (dice/board visuals) — shared chrome is already themed.

## Placeholder tools

Decide per tool: build real functionality or hide from the landing page until ready.

- [ ] Airdrop Hunter's Companion (`airdrop.js`)
- [ ] Make it or Rekt it (`make-it-or-rekt-it.js`)
- [ ] Repay or Invest (`repay-or-invest.js`)
- [ ] Test Your Luck rooms: Wheel of Fortune, Jukebox, Dice Nim Zero

## Internationalization

- [ ] Translate `src/i18n/en.js` into Thai and/or Korean, register the table in `translations.js`, and enable the language buttons (currently shown disabled, and language is forced to English in `index.js`).

## Nice to have

- [ ] Replace the Tailwind Play CDN with a precompiled stylesheet for production performance (removes the runtime CDN dependency).
- [ ] Self-host the display/mono fonts instead of loading them from Google Fonts at runtime.
- [ ] Add lightweight automated checks (smoke test that each view opens without console errors).

## Known constraints (by design, not bugs)

- Dev-locked cards are intentionally blurred and open on a 5-second press. This is a staging gesture, not a defect.
- There is no build step. Anything added must run as-is in the browser (ES modules, valid importmap entries).
