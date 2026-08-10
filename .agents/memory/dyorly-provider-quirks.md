---
name: Dyorly provider quirks
description: Non-obvious behaviors of DexScreener, Bubblemaps, and Birdeye APIs used by this project
---

- **Bubblemaps cannot be iframed** — app.bubblemaps.io blocks embedding for most tokens. We render our own SVG bubble map from top-holder percentages and link out instead. Don't reintroduce the iframe.
- **DexScreener boosts** can appear on any pair for a token, not just the deepest-liquidity pair — take the max `boosts.active` across all pairs.
- **DexScreener paid orders** (`/orders/v1/solana/{addr}`) must be filtered to `status === 'approved' | 'processing'`; unknown/empty statuses gave false "DEX Paid" positives.
- **Per-wallet token positions** come from Birdeye `/v1/wallet/token_balance?wallet=&token_address=` (standard tier). True realized PnL per wallet is not available on this tier — the UI honestly shows current balance/value/status instead of claiming PnL.
- **Local testing**: the site is static HTML + Vercel `api/*.ts` functions; locally `python3 -m http.server` serves pages but `/api/*` 404s — that error on the token page is expected off-Vercel. Screenshot tool only reaches servers started via a configured workflow, not shell-launched ones.
- **Why:** each of these caused a user-visible bug ("bubble maps didn't work", "not properly checking dex and boost") before being fixed.
