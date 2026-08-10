import type { ProviderName, ProviderStatus, TokenAnalysis, TokenHolder, EarlyBuyer, TraderSummary, DexBoost, WalletTokenPosition } from './types';
import {
  asArray,
  fetchJson,
  firstNumber,
  getEnv,
  isSolanaAddress,
  optionalProvider,
  queryValue,
  sendJson,
  type ApiRequest,
  type ApiResponse,
  type JsonRecord,
} from './_shared';

const DEX = 'https://api.dexscreener.com';

function provider(name: ProviderName, configured: boolean, available: boolean, message?: string): ProviderStatus {
  return { name, configured, available, ...(message ? { message } : {}) };
}

function extractRows(body: JsonRecord) {
  const data = body.data;
  if (Array.isArray(data)) return asArray(data);
  if (data && typeof data === 'object') {
    return asArray((data as JsonRecord).items ?? (data as JsonRecord).result);
  }
  return asArray(body.items ?? body.result);
}

function normalizeHolder(row: JsonRecord, index: number, supply: number | null, decimals: number | null): TokenHolder | null {
  const address = String(row.owner ?? row.address ?? row.wallet ?? row.account ?? '').trim();
  if (!address) return null;
  const rawAmount = firstNumber(row.uiAmount, row.ui_amount, row.balance, row.tokenAmount, row.amount);
  const amount = rawAmount !== null && decimals !== null && rawAmount > 1000000 ? rawAmount / 10 ** decimals : rawAmount;
  const percentage = firstNumber(row.percentage, row.percent, row.pct);
  return {
    address,
    percentage: percentage !== null ? percentage : amount !== null && supply ? (amount / supply) * 100 : null,
    balance: amount !== null ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(amount) : '—',
    rank: firstNumber(row.rank, row.position) ?? index + 1,
    valueUsd: null,
  };
}

async function dexPairs(input: string) {
  if (isSolanaAddress(input)) {
    const body = await fetchJson<unknown>(`${DEX}/token-pairs/v1/solana/${encodeURIComponent(input)}`);
    return Array.isArray(body) ? asArray(body) : asArray((body as JsonRecord).pairs);
  }
  const body = await fetchJson<JsonRecord>(`${DEX}/latest/dex/search?q=${encodeURIComponent(input)}`);
  return asArray(body.pairs).filter((pair) => pair.chainId === 'solana');
}

function choosePair(pairs: JsonRecord[]) {
  return [...pairs].sort((a, b) => {
    const aLiquidity = firstNumber(a.liquidity?.usd) ?? 0;
    const bLiquidity = firstNumber(b.liquidity?.usd) ?? 0;
    return bLiquidity - aLiquidity;
  })[0];
}

async function heliusAsset(address: string, key: string) {
  const body = await fetchJson<JsonRecord>(`https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 'dyorly', method: 'getAsset', params: { id: address } }),
  });
  return body.result ?? {};
}

async function heliusHolders(address: string, key: string) {
  const body = await fetchJson<JsonRecord>(`https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 'dyorly', method: 'getTokenAccounts', params: { mint: address, limit: 20 } }),
  });
  return body.result ?? {};
}

async function heliusEarlyBuyers(address: string, key: string): Promise<EarlyBuyer[]> {
  // Step 1: Get all signatures for the token mint (newest first, limit 1000)
  const sigsBody = await fetchJson<JsonRecord>(`https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 'dyorly',
      method: 'getSignaturesForAddress',
      params: [address, { limit: 1000, commitment: 'finalized' }],
    }),
  }, 10000);

  const sigs = asArray(sigsBody.result);
  if (!sigs.length) return [];

  // Oldest transactions are at the end of the array (Helius returns newest first)
  const oldestSigs = sigs.slice(-20).map((s) => String(s.signature)).filter(Boolean);
  if (!oldestSigs.length) return [];

  // Step 2: Parse the oldest transactions via Helius enhanced API
  const txBody = await fetchJson<unknown>(`https://api.helius.xyz/v0/transactions/?api-key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactions: oldestSigs.slice(0, 20) }),
  }, 10000);

  const buyers = new Map<string, EarlyBuyer>();
  for (const tx of asArray(txBody as JsonRecord[])) {
    const ts = firstNumber(tx.timestamp);
    const sig = String(tx.signature ?? '');
    for (const transfer of asArray(tx.tokenTransfers)) {
      const isBuy = String(transfer.mint) === address && transfer.toUserAccount && Number(transfer.tokenAmount) > 0;
      if (!isBuy) continue;
      const wallet = String(transfer.toUserAccount);
      if (!buyers.has(wallet)) {
        buyers.set(wallet, {
          address: wallet,
          firstBuyTimestamp: ts,
          initialAmount: firstNumber(transfer.tokenAmount),
          initialAmountFormatted: transfer.tokenAmount
            ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, notation: 'compact' }).format(Number(transfer.tokenAmount))
            : '—',
          signature: sig || null,
          solscanUrl: `https://solscan.io/account/${wallet}`,
          solscanTxUrl: sig ? `https://solscan.io/tx/${sig}` : null,
        });
      }
    }
  }

  return [...buyers.values()]
    .sort((a, b) => (a.firstBuyTimestamp ?? 0) - (b.firstBuyTimestamp ?? 0))
    .slice(0, 10);
}

async function birdeyeOverview(address: string, key: string) {
  return fetchJson<JsonRecord>(`https://public-api.birdeye.so/defi/token_overview?address=${encodeURIComponent(address)}&chain=solana`, {
    headers: { 'X-API-KEY': key, 'x-chain': 'solana' },
  });
}

async function birdeyeHolders(address: string, key: string) {
  return fetchJson<JsonRecord>(`https://public-api.birdeye.so/defi/v3/token/holder?address=${encodeURIComponent(address)}&offset=0&limit=20`, {
    headers: { 'X-API-KEY': key, 'x-chain': 'solana' },
  });
}

async function birdeyeTopTraders(address: string, key: string) {
  return fetchJson<JsonRecord>(
    `https://public-api.birdeye.so/defi/v3/token/top-traders?address=${encodeURIComponent(address)}&time_frame=1W&offset=0&limit=10&sort_by=volume&sort_type=desc`,
    { headers: { 'X-API-KEY': key, 'x-chain': 'solana' } },
    12000,
  );
}

function fmtAmount(v: number | null) {
  return v !== null
    ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, notation: 'compact' }).format(v)
    : '—';
}

// Per-wallet current position in this token via Birdeye
const positionCache = new Map<string, { at: number; value: WalletTokenPosition | null }>();
const POSITION_TTL_MS = 5 * 60 * 1000;

async function birdeyeWalletPosition(
  wallet: string,
  mint: string,
  key: string,
  priceUsd: number | null,
): Promise<WalletTokenPosition | null> {
  const cacheKey = `${wallet}:${mint}`;
  const cached = positionCache.get(cacheKey);
  if (cached && Date.now() - cached.at < POSITION_TTL_MS) return cached.value;

  let value: WalletTokenPosition | null = null;
  try {
    const body = await fetchJson<JsonRecord>(
      `https://public-api.birdeye.so/v1/wallet/token_balance?wallet=${encodeURIComponent(wallet)}&token_address=${encodeURIComponent(mint)}`,
      { headers: { 'X-API-KEY': key, 'x-chain': 'solana' } },
      6000,
    );
    const data = (body.data ?? {}) as JsonRecord;
    const balance = firstNumber(data.uiAmount, data.ui_amount, data.balance);
    const usd = firstNumber(data.valueUsd, data.value_usd, data.value)
      ?? (balance !== null && priceUsd !== null ? balance * priceUsd : null);
    value = {
      currentBalance: balance,
      currentBalanceFormatted: fmtAmount(balance),
      currentValueUsd: usd,
      status: 'unknown',
    };
  } catch {
    // Birdeye returns success:true, data:null when the wallet holds none — but a
    // thrown error means we genuinely don't know. Distinguish below.
    value = null;
  }
  positionCache.set(cacheKey, { at: Date.now(), value });
  return value;
}

function positionStatus(position: WalletTokenPosition | null, initialAmount: number | null): WalletTokenPosition | null {
  if (!position) return null;
  const bal = position.currentBalance ?? 0;
  let status: WalletTokenPosition['status'] = 'unknown';
  if (bal <= 0) status = 'sold';
  else if (initialAmount !== null && initialAmount > 0) {
    if (bal >= initialAmount * 1.05) status = 'increased';
    else if (bal <= initialAmount * 0.5) status = 'partial';
    else status = 'holding';
  } else status = 'holding';
  return { ...position, status };
}

async function solscanHolders(address: string, key: string) {
  return fetchJson<JsonRecord>(`https://pro-api.solscan.io/v2.0/token/holders?address=${encodeURIComponent(address)}&page=1&page_size=20`, {
    headers: { token: key },
  });
}

function normalizeTrader(row: JsonRecord): TraderSummary | null {
  const address = String(row.address ?? row.wallet ?? row.owner ?? '').trim();
  if (!address) return null;

  const realizedPnl = firstNumber(row.realizedPnl, row.realized_profit, row.realized_pnl, row.pnl);
  const unrealizedPnl = firstNumber(row.unrealizedPnl, row.unrealized_profit, row.unrealized_pnl);
  const buyVolume = firstNumber(row.buyVolume, row.buy_volume, row.volumeBuy);
  const sellVolume = firstNumber(row.sellVolume, row.sell_volume, row.volumeSell);
  const netBal = firstNumber(row.netTokenBalance, row.net_token_balance, row.balance, row.tokenBalance);

  return {
    address,
    volume: firstNumber(row.volume, row.totalVolume, row.total_volume),
    buyVolume,
    sellVolume,
    realizedPnl,
    unrealizedPnl,
    totalPnl: realizedPnl !== null && unrealizedPnl !== null ? realizedPnl + unrealizedPnl : (realizedPnl ?? unrealizedPnl),
    avgBuyPrice: firstNumber(row.avgBuyPrice, row.avg_buy_price, row.averageBuyPrice),
    avgSellPrice: firstNumber(row.avgSellPrice, row.avg_sell_price, row.averageSellPrice),
    buyCount: firstNumber(row.buyCount, row.buy_count, row.numBuys) ?? null,
    sellCount: firstNumber(row.sellCount, row.sell_count, row.numSells) ?? null,
    netTokenBalance: netBal,
    netTokenBalanceFormatted: netBal !== null
      ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, notation: 'compact' }).format(netBal)
      : '—',
    solscanUrl: `https://solscan.io/account/${address}`,
  };
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method && request.method !== 'GET') return sendJson(response, 405, { error: 'Only GET is supported.' });
  const input = queryValue(request, 'address')?.trim();
  if (!input) return sendJson(response, 400, { error: 'Enter a token address or symbol.' });
  if (input.length > 80) return sendJson(response, 400, { error: 'That token input is too long.' });

  let pairs: JsonRecord[];
  try {
    pairs = await dexPairs(input);
  } catch (error) {
    return sendJson(response, 502, { error: `DexScreener could not find this token: ${error instanceof Error ? error.message : 'request failed'}` });
  }
  const pair = choosePair(pairs);
  if (!pair) return sendJson(response, 404, { error: 'No Solana market was found for that token.' });

  const address = String(pair.baseToken?.address ?? input);
  const heliusKey = getEnv('HELIUS_API_KEY');
  const birdeyeKey = getEnv('BIRDEYE_API_KEY');
  const solscanKey = getEnv('SOLSCAN_API_KEY');

  const [
    assetResult,
    heliusHolderResult,
    birdeyeResult,
    birdeyeHolderResult,
    birdeyeTraderResult,
    solscanResult,
    orderResult,
    earlyBuyersResult,
  ] = await Promise.all([
    heliusKey ? optionalProvider(() => heliusAsset(address, heliusKey)) : Promise.resolve({ value: undefined, error: 'HELIUS_API_KEY not configured' }),
    heliusKey ? optionalProvider(() => heliusHolders(address, heliusKey)) : Promise.resolve({ value: undefined, error: 'HELIUS_API_KEY not configured' }),
    birdeyeKey ? optionalProvider(() => birdeyeOverview(address, birdeyeKey)) : Promise.resolve({ value: undefined, error: 'BIRDEYE_API_KEY not configured' }),
    birdeyeKey ? optionalProvider(() => birdeyeHolders(address, birdeyeKey)) : Promise.resolve({ value: undefined, error: 'BIRDEYE_API_KEY not configured' }),
    birdeyeKey ? optionalProvider(() => birdeyeTopTraders(address, birdeyeKey)) : Promise.resolve({ value: undefined, error: 'BIRDEYE_API_KEY not configured' }),
    solscanKey ? optionalProvider(() => solscanHolders(address, solscanKey)) : Promise.resolve({ value: undefined, error: 'SOLSCAN_API_KEY not configured' }),
    optionalProvider(() => fetchJson<JsonRecord>(`${DEX}/orders/v1/solana/${encodeURIComponent(address)}`)),
    heliusKey ? optionalProvider(() => heliusEarlyBuyers(address, heliusKey)) : Promise.resolve({ value: undefined, error: 'HELIUS_API_KEY not configured' }),
  ]);

  const asset = assetResult.value ?? {};
  const tokenInfo = asset.token_info ?? {};
  const decimals = firstNumber(tokenInfo.decimals);
  const supply = firstNumber(tokenInfo.supply, tokenInfo.circulating_supply);
  const heliusRows = asArray(heliusHolderResult.value?.token_accounts ?? heliusHolderResult.value?.items);
  const solscanRows = solscanResult.value ? extractRows(solscanResult.value) : [];
  const birdeyeRows = birdeyeHolderResult.value ? extractRows(birdeyeHolderResult.value) : [];
  const rawHolders = solscanRows.length ? solscanRows : birdeyeRows.length ? birdeyeRows : heliusRows;
  const holders = rawHolders
    .map((row, index) => normalizeHolder(row, index, supply, decimals))
    .filter((row): row is TokenHolder => Boolean(row))
    .slice(0, 10);

  const traderRows = birdeyeTraderResult.value ? extractRows(birdeyeTraderResult.value) : [];
  const topTraders: TraderSummary[] = traderRows
    .map((row) => normalizeTrader(row))
    .filter((t): t is TraderSummary => Boolean(t))
    .slice(0, 10);

  const earlyBuyers: EarlyBuyer[] = earlyBuyersResult.value ?? [];

  const birdeyeData = birdeyeResult.value?.data ?? {};
  const priceUsd = firstNumber(pair.priceUsd, birdeyeData.value, birdeyeData.price);

  // Enrich holders + early buyers with each wallet's live position in this token
  if (birdeyeKey) {
    const wallets = [...new Set([...holders.map((h) => h.address), ...earlyBuyers.map((b) => b.address)])].slice(0, 20);
    const positions = new Map<string, WalletTokenPosition | null>();
    await Promise.all(wallets.map(async (w) => {
      positions.set(w, await birdeyeWalletPosition(w, address, birdeyeKey, priceUsd));
    }));
    for (const holder of holders) {
      const p = positions.get(holder.address) ?? null;
      holder.position = positionStatus(p, null);
      if (p?.currentValueUsd !== null && p?.currentValueUsd !== undefined) holder.valueUsd = p.currentValueUsd;
    }
    for (const buyer of earlyBuyers) {
      buyer.position = positionStatus(positions.get(buyer.address) ?? null, buyer.initialAmount);
    }
  }
  const volume24h = firstNumber(pair.volume?.h24, birdeyeData.volume24h);
  const marketCap = firstNumber(pair.marketCap, birdeyeData.mc, birdeyeData.marketCap);
  const liquidityTotal = pairs.reduce((sum, item) => sum + (firstNumber(item.liquidity?.usd) ?? 0), 0) || null;

  const venues = pairs
    .map((item) => ({ name: String(item.dexId ?? 'Unknown DEX'), liquidityUsd: firstNumber(item.liquidity?.usd) ?? 0 }))
    .filter((item) => item.liquidityUsd > 0)
    .reduce<{ name: string; liquidityUsd: number }[]>((all, item) => {
      const existing = all.find((entry) => entry.name === item.name);
      if (existing) existing.liquidityUsd += item.liquidityUsd;
      else all.push(item);
      return all;
    }, [])
    .sort((a, b) => b.liquidityUsd - a.liquidityUsd)
    .slice(0, 5);

  const top10Percentage = holders.some((holder) => holder.percentage !== null)
    ? holders.reduce((sum, holder) => sum + (holder.percentage ?? 0), 0)
    : null;

  const authority = asArray(asset.authorities).find((item) => item.address)?.address
    ?? asset.authority?.address
    ?? null;
  const developerHolder = authority ? holders.find((holder) => holder.address === authority) : undefined;

  // DexScreener boosts — the boosts field can appear on any pair for the token,
  // not just the deepest-liquidity pair, so take the maximum across all pairs.
  const boostActive = pairs.reduce((max, item) => {
    const active = firstNumber((item.boosts as JsonRecord | undefined)?.active) ?? 0;
    return Math.max(max, active);
  }, 0);
  const boostAmount = pairs.reduce<number | null>((best, item) => {
    const b = item.boosts as JsonRecord | undefined;
    const amt = firstNumber(b?.amount, b?.totalAmount);
    return amt !== null && amt > (best ?? 0) ? amt : best;
  }, null);
  const dexBoosts: DexBoost | null = boostActive > 0 ? { active: boostActive, totalAmount: boostAmount } : null;

  // DEX Paid — only count orders that were actually approved/processed
  const allOrders = asArray(orderResult.value);
  const paidOrdersList = allOrders.filter((o) => {
    const status = String(o.status ?? '').toLowerCase();
    return status === 'approved' || status === 'processing' || status === '';
  });
  const paidOrderTypes = [...new Set(paidOrdersList
    .map((o) => String(o.type ?? o.orderType ?? '')).filter(Boolean))];

  const warnings = [
    !heliusKey ? 'Holder and developer signals are limited until HELIUS_API_KEY is configured.' : '',
    !birdeyeKey ? 'Birdeye enrichment is unavailable until BIRDEYE_API_KEY is configured.' : '',
    !solscanKey ? 'Solscan holder verification is unavailable until SOLSCAN_API_KEY is configured.' : '',
    pair.liquidity?.usd && Number(pair.liquidity.usd) < 25000 ? 'Low liquidity can make exits materially worse than the quoted price.' : '',
  ].filter(Boolean);

  const providers = [
    provider('DexScreener', true, true),
    provider('Helius', Boolean(heliusKey), Boolean(assetResult.value), assetResult.error),
    provider('Birdeye', Boolean(birdeyeKey), Boolean(birdeyeResult.value), birdeyeResult.error),
    provider('Solscan', Boolean(solscanKey), Boolean(solscanResult.value), solscanResult.error),
  ];

  const result: TokenAnalysis = {
    address,
    token: {
      name: String(pair.baseToken?.name ?? asset.content?.metadata?.name ?? 'Unknown token'),
      symbol: String(pair.baseToken?.symbol ?? asset.content?.metadata?.symbol ?? '—'),
      logo: String(pair.info?.imageUrl ?? asset.content?.links?.image ?? '') || null,
      priceUsd,
      priceChange24h: firstNumber(pair.priceChange?.h24, birdeyeData.priceChange24h),
      marketCap,
      fdv: firstNumber(pair.fdv, birdeyeData.fdv),
      volume24h,
      buys24h: firstNumber(pair.txns?.h24?.buys),
      sells24h: firstNumber(pair.txns?.h24?.sells),
      pairCreatedAt: pair.pairCreatedAt ? new Date(Number(pair.pairCreatedAt)).toISOString() : null,
      websites: asArray(pair.info?.websites).map((site) => String(site.url ?? '')).filter(Boolean),
      socials: asArray(pair.info?.socials).map((s) => ({ type: String(s.type ?? 'social'), url: String(s.url ?? '') })).filter((s) => s.url),
      pairUrl: String(pair.url ?? '') || null,
    },
    liquidity: {
      totalUsd: liquidityTotal,
      venues,
      pairCount: pairs.length,
      locked: firstNumber(birdeyeData.liquidityLockedPercentage, birdeyeData.lpLockedPercentage),
    },
    holders: {
      top: holders,
      top10Percentage,
      totalKnown: firstNumber(solscanResult.value?.total, birdeyeHolderResult.value?.total, heliusHolderResult.value?.total),
    },
    topTraders,
    earlyBuyers,
    developer: {
      address: authority,
      balancePercentage: developerHolder?.percentage ?? null,
      source: authority ? 'Helius asset authority' : 'Not available',
      risk: developerHolder?.percentage !== null && developerHolder && developerHolder.percentage > 10 ? 'high' : authority ? 'unknown' : 'unknown',
    },
    dexBoosts,
    relationships: {
      wallets: holders.slice(0, 5).map((h) => h.address),
      directCount: 0,
      source: holders.length ? 'Top-holder overlap requires transaction history' : 'Not available',
    },
    monitoring: {
      boosts: boostActive || null,
      paidOrders: paidOrdersList.length > 0,
      paidOrderTypes,
      warnings,
    },
    providers,
  };

  return sendJson(response, 200, result);
}
