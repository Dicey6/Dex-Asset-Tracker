# Dyorly

Dyor but smarter — a standalone Vite site for Solana token and wallet research.

## Vercel environment variables

Add these as server-side environment variables in the Vercel project. They are read only by the `/api` functions and are never exposed to the browser:

- `HELIUS_API_KEY` — portfolio, asset authority, and holder enrichment
- `BIRDEYE_API_KEY` — token and wallet pricing enrichment
- `SOLSCAN_API_KEY` — holder verification and wallet activity

DexScreener market data is public and works without an API key. The app still returns a useful market view when an optional provider is not configured, and labels any missing coverage in the UI.
