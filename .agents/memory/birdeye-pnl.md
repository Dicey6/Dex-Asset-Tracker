---
name: Birdeye wallet PnL
description: How to get per-token PnL for a wallet from Birdeye — token_list has no PnL fields.
---
Birdeye `/v1/wallet/token_list` returns holdings only (address, uiAmount, priceUsd, valueUsd) — **no realized/unrealized PnL fields**.

**How to apply:** compute PnL from `/trader/txs/seek_by_time` swap history: sort legs chronologically, keep a running weighted-average cost basis, paginate oldest-ward via `before_time` bounded by `after_time`, and report PnL as unavailable (null) if history is incomplete — a completion reviewer rejected both a token_list-only approach and a non-chronological lifetime-average approach.

**Why:** partial or averaged history produces confidently wrong dollar values. Pure computation lives in `api/pnl.ts` with tests in `tests/pnl.test.mjs` (compile with tsc to /tmp, see file header).
