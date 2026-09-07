import { asArray, firstNumber, type JsonRecord } from './_shared';

export interface BuyerPnl {
  realizedPnl: number | null;
  unrealizedPnl: number | null;
  avgBuyPrice: number | null;
}

interface TokenLeg {
  time: number;
  change: number;
  price: number;
}

function extractLegs(trades: JsonRecord[], mint: string): TokenLeg[] {
  const legs: TokenLeg[] = [];
  for (const trade of asArray(trades)) {
    const time = firstNumber(trade.block_unix_time, trade.blockUnixTime, trade.block_time, trade.time) ?? 0;
    for (const legKey of ['base', 'quote'] as const) {
      const leg = trade[legKey] as JsonRecord | undefined;
      if (!leg || String(leg.address ?? '') !== mint) continue;
      const change = firstNumber(leg.ui_change_amount, leg.uiChangeAmount, leg.change_amount);
      const price = firstNumber(leg.price, leg.nearest_price, leg.nearestPrice);
      if (change === null || price === null || change === 0) continue;
      legs.push({ time, change, price });
    }
  }
  // Process oldest-first regardless of provider ordering.
  return legs.sort((a, b) => a.time - b.time);
}

/**
 * Compute realized + unrealized PnL for one wallet on one token from Birdeye
 * trade items (`/trader/txs/seek_by_time` response items).
 *
 * Trades are sorted chronologically and a running weighted-average cost basis
 * is maintained:
 * - Buys add to held amount and cost basis.
 * - Sells realize `proceeds − soldAmount × current average cost`, and remove
 *   that cost from the basis.
 * - Oversell policy: if a sell exceeds the tracked held amount (tokens arrived
 *   via transfer/airdrop rather than a swap), the excess is treated as
 *   zero-cost — its proceeds count fully as realized profit. This is explicit
 *   and conservative-optimistic; we cannot know the transfer's true cost.
 * - Unrealized PnL = currentBalance × (currentPrice − remaining average cost),
 *   or null when the current price or basis is unknown.
 */
export function computeBuyerPnl(
  trades: JsonRecord[],
  mint: string,
  currentBalance: number | null,
  currentPrice: number | null,
): BuyerPnl {
  const legs = extractLegs(trades, mint);
  if (!legs.length) return { realizedPnl: null, unrealizedPnl: null, avgBuyPrice: null };

  let held = 0;
  let basisUsd = 0;
  let realized = 0;
  let anySell = false;

  for (const leg of legs) {
    if (leg.change > 0) {
      held += leg.change;
      basisUsd += leg.change * leg.price;
    } else {
      anySell = true;
      const sellAmount = -leg.change;
      const fromBasis = Math.min(sellAmount, held);
      const avgCost = held > 0 ? basisUsd / held : 0;
      realized += sellAmount * leg.price - fromBasis * avgCost;
      basisUsd -= fromBasis * avgCost;
      held -= fromBasis;
    }
  }

  const avgBuyPrice = held > 0 ? basisUsd / held : null;
  const realizedPnl = anySell ? realized : 0;
  const unrealizedPnl = currentBalance !== null && currentBalance <= 0
    ? 0
    : currentBalance !== null && currentBalance > 0 && currentPrice !== null && avgBuyPrice !== null
      ? currentBalance * (currentPrice - avgBuyPrice)
      : null;

  return { realizedPnl, unrealizedPnl, avgBuyPrice };
}
