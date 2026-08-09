import type { ProviderName, ProviderStatus, TokenAnalysis, TokenHolder } from './types';
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
  };
}

async function dexPairs(input: string) {
  if (isSolanaAddress(input)) {
    // DexScreener returns a bare array from the token-pairs endpoint, unlike
    // its search endpoint which wraps pairs in a `{ pairs: [...] }` object.
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

async function solscanHolders(address: string, key: string) {
  return fetchJson<JsonRecord>(`https://pro-api.solscan.io/v2.0/token/holders?address=${encodeURIComponent(address)}&page=1&page_size=20`, {
    headers: { token: key },
  });
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

  const [assetResult, heliusHolderResult, birdeyeResult, birdeyeHolderResult, solscanResult, orderResult] = await Promise.all([
    heliusKey ? optionalProvider(() => heliusAsset(address, heliusKey)) : Promise.resolve({ value: undefined, error: 'HELIUS_API_KEY is not configured' }),
    heliusKey ? optionalProvider(() => heliusHolders(address, heliusKey)) : Promise.resolve({ value: undefined, error: 'HELIUS_API_KEY is not configured' }),
    birdeyeKey ? optionalProvider(() => birdeyeOverview(address, birdeyeKey)) : Promise.resolve({ value: undefined, error: 'BIRDEYE_API_KEY is not configured' }),
    birdeyeKey ? optionalProvider(() => birdeyeHolders(address, birdeyeKey)) : Promise.resolve({ value: undefined, error: 'BIRDEYE_API_KEY is not configured' }),
    solscanKey ? optionalProvider(() => solscanHolders(address, solscanKey)) : Promise.resolve({ value: undefined, error: 'SOLSCAN_API_KEY is not configured' }),
    optionalProvider(() => fetchJson<JsonRecord>(`${DEX}/orders/v1/solana/${encodeURIComponent(address)}`)),
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

  const birdeyeData = birdeyeResult.value?.data ?? {};
  const priceUsd = firstNumber(pair.priceUsd, birdeyeData.value, birdeyeData.price);
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
      socials: asArray(pair.info?.socials).map((social) => ({ type: String(social.type ?? 'social'), url: String(social.url ?? '') })).filter((social) => social.url),
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
    developer: {
      address: authority,
      balancePercentage: developerHolder?.percentage ?? null,
      source: authority ? 'Helius asset authority' : 'Not available',
      risk: developerHolder?.percentage !== null && developerHolder && developerHolder.percentage > 10 ? 'high' : authority ? 'unknown' : 'unknown',
    },
    earlyWallets: holders.slice(0, 5).map((holder) => ({
      address: holder.address,
      amount: holder.balance,
      status: 'Unknown',
      source: solscanRows.length ? 'Solscan holder snapshot' : heliusRows.length ? 'Helius holder snapshot' : 'Birdeye holder snapshot',
    })),
    relationships: {
      wallets: holders.slice(0, 5).map((holder) => holder.address),
      directCount: 0,
      source: holders.length ? 'Top-holder overlap requires transaction history' : 'Not available',
    },
    monitoring: {
      boosts: null,
      paidOrders: orderResult.value ? asArray(orderResult.value).length > 0 : null,
      warnings,
    },
    providers,
  };
  return sendJson(response, 200, result);
}