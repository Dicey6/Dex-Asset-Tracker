# Dyorly

Dyorly is a static HTML/CSS/vanilla JavaScript Solana token research desk. Paste a token address or symbol to read live market data from the public DexScreener API, with optional Helius, Birdeye, and Solscan enrichment through the serverless API functions in `api/`.

## Deployment

This project is designed to deploy from GitHub through Vercel. No local build step, React runtime, or Vite server is required.

Vercel environment variables:

- `HELIUS_API_KEY` — optional portfolio, asset authority, and holder enrichment
- `BIRDEYE_API_KEY` — optional token and wallet pricing enrichment
- `SOLSCAN_API_KEY` — optional holder verification and wallet activity

DexScreener is public and is intentionally used without an API key.

## Pages

- `/` — token analysis desk
- `/wallet.html` — wallet portfolio and activity analysis

Wallet analysis uses Solana's public RPC for SOL balances and non-zero SPL token accounts. Optional Helius, Birdeye, and Solscan keys add metadata, USD pricing, NFTs, holder verification, and activity history.

The sign-in and sign-up controls are presentation-only until account storage and authentication are connected.