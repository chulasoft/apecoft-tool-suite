# Data Shapes

This app has **no database**. All persistence is browser `localStorage`, and all remote data comes from public HTTP APIs. This document is the schema reference for both.

## Local storage

Everything is stored per-browser as JSON strings. Reads and writes are wrapped in `try/catch`, so corrupt or missing values degrade to defaults.

| Key | Written by | Shape |
| --- | --- | --- |
| `appLanguage` | `src/index.js`, `CoinSelector.js` | `string` — language code (`"en"`; `"th"`/`"ko"` reserved). |
| `lpCalculatorState` | `src/apps/calculator.js` | Calculator inputs (see below). |
| `yieldPortfolio` | `src/apps/yield.js` | Array of yield positions (see below). |
| `comparatorState` | `src/apps/comparator.js` | Selected coins and holdings. |
| `moonSheetState` | `src/apps/moon-sheet.js` | Selected coin and holdings. |

### `lpCalculatorState`

```jsonc
{
  "tokenAId": "ethereum",      // CoinGecko id
  "tokenBId": "usd-coin",
  "manualMode": false,         // manual price entry vs live pricing
  "manualTokenASymbol": "ETH",
  "manualTokenBSymbol": "USDC",
  "manualPrice": "",
  "investment": "1000",
  "minPrice": "",
  "maxPrice": "",
  "feeAPR": "20",
  "poolDuration": "30",        // days
  "exitPrice": ""
}
```

### `yieldPortfolio`

```jsonc
[
  {
    "id": 1699999999999,       // timestamp id
    "asset": "ETH Staking",
    "investment": 5200,        // USD
    "apr": 4.7,                // percent
    "selected": false          // row selection in the table
  }
]
```

### `comparatorState`

```jsonc
{
  "tokenAId": "bitcoin",
  "tokenBId": "ethereum",
  "tokenAHoldings": "1",
  "tokenBHoldings": "1"
}
```

### `moonSheetState`

```jsonc
{
  "selectedCoinId": "bitcoin",
  "holdings": "1"
}
```

## Remote APIs

### CoinGecko (via the proxy chain in `cryptoService.js`)

- `GET /coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page={1,2}` — the top-token list. Each item is reduced to `{ id, symbol, name, image }`.
- `GET /coins/markets?vs_currency=usd&ids={ids}` — full market rows for selected coins (price, market cap, ATH, images), keyed by `id`.
- `GET /simple/price?ids={ids}&vs_currencies=usd` — spot prices; normalized to `{ [id]: number }`.

All three are requested against `/api/coingecko/...` first, then the public CORS-proxy fallbacks.

### DefiLlama (direct, from `yield-finder.js`)

- `GET https://yields.llama.fi/pools` — yield pools. Filtered client-side (for example, by minimum TVL) and matched against CoinGecko token images.

## Notes for future work

- If a real backend is ever introduced (accounts, saved portfolios across devices), the `localStorage` shapes above are the natural migration source. Keep the keys stable, or provide a one-time migration, so existing users don't lose saved state.
