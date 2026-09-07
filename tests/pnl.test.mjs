// Regression test for early-buyer PnL computation (api/pnl.ts).
// Run with:
//   npx tsc api/pnl.ts api/_shared.ts --target es2020 --module esnext --outDir /tmp/pnl-test
//   sed -i "s|from './_shared'|from './_shared.js'|" /tmp/pnl-test/pnl.js
//   node tests/pnl.test.mjs
import assert from 'node:assert/strict';
import { computeBuyerPnl } from '/tmp/pnl-test/pnl.js';

const MINT = 'MintAddress1111111111111111111111111111111';

function trade(change, price, leg = 'base') {
  return { [leg]: { address: MINT, ui_change_amount: change, price } };
}

// 1. Buy 1000 @ $1, sell 400 @ $3, hold 600 with current price $2
{
  const trades = [trade(1000, 1), trade(-400, 3)];
  const pnl = computeBuyerPnl(trades, MINT, 600, 2);
  assert.equal(pnl.avgBuyPrice, 1);
  assert.equal(pnl.realizedPnl, 400 * 3 - 400 * 1); // 800
  assert.equal(pnl.unrealizedPnl, 600 * (2 - 1));   // 600
}

// 2. Fully sold out — realized only, unrealized 0
{
  const trades = [trade(500, 2), trade(-500, 1)];
  const pnl = computeBuyerPnl(trades, MINT, 0, 3);
  assert.equal(pnl.realizedPnl, 500 * 1 - 500 * 2); // -500 (loss)
  assert.equal(pnl.unrealizedPnl, 0);
}

// 3. Still holding everything — realized 0, unrealized from price move
{
  const trades = [trade(100, 0.5)];
  const pnl = computeBuyerPnl(trades, MINT, 100, 0.75);
  assert.equal(pnl.realizedPnl, 0);
  assert.ok(Math.abs(pnl.unrealizedPnl - 25) < 1e-9);
}

// 4. Token on the quote leg is also detected
{
  const trades = [trade(200, 1, 'quote'), trade(-200, 4, 'quote')];
  const pnl = computeBuyerPnl(trades, MINT, 0, 4);
  assert.equal(pnl.realizedPnl, 600);
}

// 5. No trades involving this mint → all nulls (never fake zeros)
{
  const trades = [{ base: { address: 'Other', ui_change_amount: 5, price: 1 } }];
  const pnl = computeBuyerPnl(trades, MINT, 10, 1);
  assert.equal(pnl.realizedPnl, null);
  assert.equal(pnl.unrealizedPnl, null);
}

// 6. Unknown current price while holding → unrealized is null, realized still computed
{
  const trades = [trade(100, 1), trade(-50, 2)];
  const pnl = computeBuyerPnl(trades, MINT, 50, null);
  assert.equal(pnl.realizedPnl, 50);
  assert.equal(pnl.unrealizedPnl, null);
}

// 7. Chronological cost basis: buy 100 @ $1, sell 100 @ $3, THEN buy 100 @ $100.
//    Realized must use the $1 basis (= +200), not a lifetime average — even when
//    trades arrive in provider (newest-first) order.
{
  const trades = [
    { base: { address: MINT, ui_change_amount: 100, price: 100 }, block_unix_time: 300 },
    { base: { address: MINT, ui_change_amount: -100, price: 3 }, block_unix_time: 200 },
    { base: { address: MINT, ui_change_amount: 100, price: 1 }, block_unix_time: 100 },
  ];
  const pnl = computeBuyerPnl(trades, MINT, 100, 100);
  assert.equal(pnl.realizedPnl, 200);
  assert.equal(pnl.avgBuyPrice, 100); // remaining basis is the later $100 buy
  assert.equal(pnl.unrealizedPnl, 0);
}

// 8. Oversell policy: selling more than was bought via swaps (transfer-in) —
//    the excess is zero-cost, its proceeds count fully as realized profit.
{
  const trades = [
    { base: { address: MINT, ui_change_amount: 100, price: 1 }, block_unix_time: 1 },
    { base: { address: MINT, ui_change_amount: -150, price: 2 }, block_unix_time: 2 },
  ];
  const pnl = computeBuyerPnl(trades, MINT, 0, 2);
  // 150 sold @ $2 = 300 proceeds; basis removed = 100 × $1 → realized 200
  assert.equal(pnl.realizedPnl, 200);
  assert.equal(pnl.avgBuyPrice, null);
}

// 9. History spanning multiple pages (250 merged trades, unsorted):
//    interleaved buys/sells still resolve via chronological processing.
{
  const trades = [];
  for (let i = 0; i < 125; i++) {
    trades.push({ base: { address: MINT, ui_change_amount: 10, price: 1 }, block_unix_time: i * 2 });
    trades.push({ base: { address: MINT, ui_change_amount: -10, price: 2 }, block_unix_time: i * 2 + 1 });
  }
  // Shuffle deterministically to simulate merged pages with mixed ordering.
  trades.sort((a, b) => (a.block_unix_time * 7919) % 104729 - (b.block_unix_time * 7919) % 104729);
  const pnl = computeBuyerPnl(trades, MINT, 0, 2);
  assert.equal(pnl.realizedPnl, 125 * 10 * (2 - 1)); // each cycle realizes +10
  assert.equal(pnl.unrealizedPnl, 0);
}

console.log('All PnL regression tests passed.');
