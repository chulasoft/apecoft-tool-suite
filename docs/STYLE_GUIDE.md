# Style Guide

Conventions for keeping the codebase consistent. Match the surrounding code first; the notes below capture the patterns already in use.

## JavaScript

- **ES modules only.** Import with explicit relative paths and the `.js` extension (`./components/icons.js`). No bundler is involved, so paths must resolve as written in the browser.
- **No framework.** Plain DOM APIs. Modules render markup as template strings and attach listeners with `addEventListener`, usually via event delegation on a container.
- **Module shape.** A tool module exports one object: `{ initialState, initialize(context), ... }`. Read `state`, `elements`, and `utils` from `context`; do not reach into other modules' internals.
- **State.** Keep each tool's state in its slice of the shared `state` object. Persist across reloads with `localStorage` under a single namespaced key (see `DATABASE.md`); guard reads/writes in `try/catch`.
- **Naming.** `camelCase` for variables and functions, `UPPER_SNAKE_CASE` for module constants, `kebab-case` for element IDs and files.
- **Formatting.** 4-space indentation, semicolons, single quotes. Prefer small pure helpers for formatting and calculation.
- **Numbers/money.** Format through the shared `utils` formatters so currency, percent, and big-number output stays consistent.

## HTML

- All views live in `index.html`, each in a container with a stable `id` that JavaScript depends on. **Do not rename or remove these IDs** without updating the corresponding module.
- Mark translatable text with `data-i18n-key`. Parameterized strings use `data-i18n-param-*` attributes.
- Keep markup accessible: label inputs, give buttons `aria-label` where the text is an icon, preserve focus order.

## CSS

- Author styles in the `<style>` block of `index.html`. Use the design tokens (CSS custom properties: `--bg`, `--surface-solid`, `--surface-2`, `--border`, `--border-strong`, `--text-1/2/3`, `--accent`, `--radius*`, `--font-display`, `--font-mono`) rather than hard-coded values where a token exists.
- **The Tailwind Play CDN does not process `@apply` inside a `<style>` tag.** Write plain CSS there, not `@apply` rules.
- To theme a tool's JS-generated markup, add `#<view-id>`-scoped rules. ID specificity overrides inline Tailwind utilities, so the JavaScript never has to change. Give each tool one identity accent (LP cyan, Yield indigo, Comparator amber, PT/YT green) and keep it consistent across that view.
- Numeric-heavy readouts use `--font-mono` with `font-variant-numeric: tabular-nums` so figures align.

## Motion

- Route animations through `src/animations.js`; do not sprinkle raw anime.js calls across modules.
- Every animation must have a reason (hierarchy, feedback, state change) and must honor `prefers-reduced-motion`. Helpers already no-op when motion is reduced or anime.js failed to load — preserve that.
- Animate `transform` and `opacity` only. Never bind continuous values (scroll, pointer) to layout properties.

## Dependencies

- Third-party libraries load via the importmap in `index.html`. Pin versions. anime.js is vendored under `vendor/` to avoid a CDN runtime dependency; prefer vendoring for anything load-critical.

## Git

- Descriptive, imperative commit subjects. Keep each commit focused on one change.
