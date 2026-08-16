import { computeBuyerPnl } from './pnl';
import type {
  ProviderName,
  ProviderStatus,
  WalletActivity,
  WalletAnalysis,
  WalletHolding,
  WalletSwap,
  WalletTransfer,
} from './types';
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

const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const TOKEN_PROGRAMS = [
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
];

function provider(name: ProviderName, configured: boolean, available: boolean, message?: string): ProviderStatus {
  return { name, configured, available, ...(message ? { message } : {}) };
}

async function solanaRpc(method: string, params: unknown[]) {
  const body = await fetchJson<JsonRecord>(SOLANA_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 'dyorly-wallet', method, params }),
  });
  if (body.error) throw new Error(`${body.error.code ?? 'RPC'}: ${body.error.message ?? 'Solana RPC request failed'}`);
  return body.result ?? {};
}

async function publicPortfolio(address: string) {
  const [balanceResult, ...tokenResults] = await Promise.all([
    solanaRpc('getBalance', [address, { commitment: 'confirmed' }]),
    ...TOKEN_PROGRAMS.map((programId) => solanaRpc('getTokenAccountsByOwner', [
      address,
      { programId },
      { encoding: 'jsonParsed', commitment: 'confirmed' },
    ])),
  ]);

  const tokenAccounts = tokenResults.flatMap((result) => asArray(result.value));
  return {
    solBalance: firstNumber(balanceResult.value) !== null ? (firstNumber(balanceResult.value) ?? 0) / 1e9 : null,
    tokenAccounts,
  };
}

async function heliusPortfolio(address: string, key: string) {
  const body = await fetchJson<JsonRecord>(`https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'dyorly',
      method: 'getAssetsByOwner',
      params: { ownerAddress: address, page: 1, limit: 100, displayOptions: { showFungible: true, showNativeBalance: true } },
    }),
  });
  return body.result ?? {};
}

async function solscanTokens(address: string, key: string) {
  return fetchJson<JsonRecord>(`https://pro-api.solscan.io/v2.0/account/token-accounts?address=${encodeURIComponent(address)}&page=1&page_size=100`, {
    headers: { token: key },
  });
}

async function solscanActivity(address: string, key: string) {
  return fetchJson<JsonRecord>(`https://pro-api.solscan.io/v2.0/account/transactions?address=${encodeURIComponent(address)}&page=1&page_size=20`, {
    headers: { token: key },
  });
}

async function heliusActivity(address: string, key: string) {
  return fetchJson<JsonRecord[]>(
    `https://api.helius.xyz/v0/addresses/${encodeURIComponent(address)}/transactions?api-key=${encodeURIComponent(key)}&limit=100`,
  );
}

async function birdeyeTokens(address: string, key: string) {
  return fetchJson<JsonRecord>(`https://public-api.birdeye.so/v1/wallet/token_list?wallet=${encodeURIComponent(address)}&chain=solana`, {
    headers: { 'X-API-KEY': key, 'x-chain': 'solana' },
  });
}

async function birdeyeSwaps(address: string, key: string) {
  return fetchJson<JsonRecord>(
    `https://public-api.birdeye.so/trader/txs/seek_by_time?address=${encodeURIComponent(address)}&tx_type=swap&limit=100`,
    { headers: { 'X-API-KEY': key, 'x-chain': 'solana' } },
  );
}

function rows(body: JsonRecord | undefined) {
  if (!body) return [];
  const data = body.data;
  if (Array.isArray(data)) return asArray(data);
  if (data && typeof data === 'object') return asArray((data as JsonRecord).items ?? (data as JsonRecord).result);
  return asArray(body.items ?? body.result);
}

function normalizeHolding(item: JsonRecord): WalletHolding | null {
  const tokenInfo = (item.token_info ?? item.tokenInfo ?? {}) as JsonRecord;
  const parsedInfo = ((item.account as JsonRecord | undefined)?.data as JsonRecord | undefined)?.parsed as JsonRecord | undefined;
  const parsedToken = (parsedInfo?.info ?? {}) as JsonRecord;
  const tokenAmount = (parsedToken.tokenAmount ?? {}) as JsonRecord;
  const decimals = firstNumber(tokenInfo.decimals, item.decimals, tokenAmount.decimals);
  const uiBalance = firstNumber(item.uiAmount, item.ui_amount, tokenAmount.uiAmount);
  const rawBalance = firstNumber(tokenInfo.balance, item.amount, item.balance, tokenAmount.amount);
  const balance = uiBalance ?? (rawBalance !== null && decimals !== null ? rawBalance / 10 ** decimals : rawBalance);
  const priceInfo = (tokenInfo.price_info ?? {}) as JsonRecord;
  const pricePerToken = firstNumber(
    item.price_per_token_usd,
    item.pricePerTokenUsd,
    item.price,
    priceInfo.price_per_token,
  );
  const valueUsd = firstNumber(
    item.valueUsd,
    item.value,
    item.usdValue,
    priceInfo.total_price,
    pricePerToken !== null && balance !== null ? pricePerToken * balance : null,
  );
  const address = String(
    item.id
      ?? item.address
      ?? tokenInfo.address
      ?? parsedToken.mint
      ?? '',
  );
  if (!address || decimals === null || balance === null || balance <= 0) return null;

  return {
    address,
    symbol: String(item.content?.metadata?.symbol ?? item.symbol ?? tokenInfo.symbol ?? `…${address.slice(-6)}`),
    name: String(item.content?.metadata?.name ?? item.name ?? tokenInfo.name ?? `Token ${address.slice(0, 6)}…`),
    logo: String(item.content?.links?.image ?? item.logo ?? '') || null,
    balance,
    valueUsd,
    decimals,
  };
}

function normalizeTransfers(items: JsonRecord[], wallet: string): WalletTransfer[] {
  return items.flatMap((item) => asArray(item.tokenTransfers).map((transfer) => {
    const from = String(transfer.fromUserAccount ?? '');
    const to = String(transfer.toUserAccount ?? '');
    const direction = to === wallet ? 'in' : from === wallet ? 'out' : null;
    if (!direction) return null;
    return {
      signature: String(item.signature ?? '—'),
      tokenMint: String(transfer.mint ?? '') || null,
      direction,
      amount: firstNumber(transfer.tokenAmount, transfer.amount),
      counterparty: direction === 'in' ? from || null : to || null,
      timestamp: firstNumber(item.timestamp, item.blockTime)
        ? new Date((firstNumber(item.timestamp, item.blockTime) ?? 0) * 1000).toISOString()
        : null,
      source: 'Helius',
    } satisfies WalletTransfer;
  })).filter((item): item is WalletTransfer => Boolean(item)).slice(0, 30);
}

function normalizeSwaps(items: JsonRecord[]): WalletSwap[] {
  return items.map((item) => {
    const base = (item.base ?? {}) as JsonRecord;
    const quote = (item.quote ?? {}) as JsonRecord;
    const token = String(base.address ?? item.token_address ?? item.address ?? '') || null;
    return {
      signature: String(item.txHash ?? item.tx_hash ?? item.signature ?? '—'),
      tokenMint: token,
      tokenSymbol: String(base.symbol ?? item.symbol ?? '') || null,
      side: String(item.side ?? item.type ?? '') || null,
      volumeUsd: firstNumber(item.volume_usd, item.volumeUsd, item.volume),
      timestamp: firstNumber(item.block_unix_time, item.blockUnixTime, item.block_time, item.time)
        ? new Date((firstNumber(item.block_unix_time, item.blockUnixTime, item.block_time, item.time) ?? 0) * 1000).toISOString()
        : null,
      source: 'Birdeye',
    };
  }).filter((item) => item.signature !== '—').slice(0, 30);
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method && request.method !== 'GET') return sendJson(response, 405, { error: 'Only GET is supported.' });
  const address = queryValue(request, 'address')?.trim();
  if (!address || !isSolanaAddress(address)) return sendJson(response, 400, { error: 'Enter a valid Solana wallet address.' });

  const heliusKey = getEnv('HELIUS_API_KEY');
  const birdeyeKey = getEnv('BIRDEYE_API_KEY');
  const solscanKey = getEnv('SOLSCAN_API_KEY');
  const [publicResult, heliusResult, solscanTokenResult, solscanActivityResult, birdeyeResult, heliusActivityResult, birdeyeSwapResult] = await Promise.all([
    optionalProvider(() => publicPortfolio(address)),
    heliusKey ? optionalProvider(() => heliusPortfolio(address, heliusKey)) : Promise.resolve({ value: undefined, error: 'HELIUS_API_KEY is not configured' }),
    solscanKey ? optionalProvider(() => solscanTokens(address, solscanKey)) : Promise.resolve({ value: undefined, error: 'SOLSCAN_API_KEY is not configured' }),
    solscanKey ? optionalProvider(() => solscanActivity(address, solscanKey)) : Promise.resolve({ value: undefined, error: 'SOLSCAN_API_KEY is not configured' }),
    birdeyeKey ? optionalProvider(() => birdeyeTokens(address, birdeyeKey)) : Promise.resolve({ value: undefined, error: 'BIRDEYE_API_KEY is not configured' }),
    heliusKey ? optionalProvider(() => heliusActivity(address, heliusKey)) : Promise.resolve({ value: undefined, error: 'HELIUS_API_KEY is not configured' }),
    birdeyeKey ? optionalProvider(() => birdeyeSwaps(address, birdeyeKey)) : Promise.resolve({ value: undefined, error: 'BIRDEYE_API_KEY is not configured' }),
  ]);

  const heliusItems = asArray(heliusResult.value?.items);
  const solscanItems = rows(solscanTokenResult.value);
  const birdeyeItems = rows(birdeyeResult.value);
  const publicItems = publicResult.value?.tokenAccounts ?? [];
  const heliusHoldings = heliusItems.map(normalizeHolding).filter((item): item is WalletHolding => Boolean(item));
  const birdeyeHoldings = birdeyeItems.map(normalizeHolding).filter((item): item is WalletHolding => Boolean(item));
  const solscanHoldings = solscanItems.map(normalizeHolding).filter((item): item is WalletHolding => Boolean(item));
  const publicHoldings = publicItems.map(normalizeHolding).filter((item): item is WalletHolding => Boolean(item));
  const sourceHoldings = heliusHoldings.length ? heliusHoldings : birdeyeHoldings.length ? birdeyeHoldings : solscanHoldings.length ? solscanHoldings : publicHoldings;
  const holdings = Array.from(new Map(sourceHoldings.map((item) => [item.address, item])).values())
    .sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0))
    .slice(0, 20);

  const solscanActivity: WalletActivity[] = rows(solscanActivityResult.value).slice(0, 10).map((item) => ({
    signature: String(item.tx_hash ?? item.signature ?? item.trans_id ?? '—'),
    type: String(item.activity_type ?? item.type ?? item.main_action ?? 'Transaction'),
    description: String(item.description ?? item.program_id ?? 'Solana transaction'),
    timestamp: firstNumber(item.block_time, item.blockTime, item.time) ? new Date((firstNumber(item.block_time, item.blockTime, item.time) ?? 0) * 1000).toISOString() : null,
    source: 'Solscan',
  }));
  const heliusActivityRows = asArray(heliusActivityResult.value);
  const activity: WalletActivity[] = solscanActivity.length ? solscanActivity : heliusActivityRows.slice(0, 10).map((item) => ({
    signature: String(item.signature ?? '—'),
    type: String(item.type ?? item.source ?? 'Transaction'),
    description: String(item.description ?? 'Solana transaction'),
    timestamp: firstNumber(item.timestamp, item.blockTime) ? new Date((firstNumber(item.timestamp, item.blockTime) ?? 0) * 1000).toISOString() : null,
    source: 'Helius',
  }));
  const transfers = normalizeTransfers(heliusActivityRows, address);
  const swaps = normalizeSwaps(rows(birdeyeSwapResult.value));
  const pnlRows = holdings.map((holding) => {
    const currentPrice = holding.balance && holding.valueUsd !== null ? holding.valueUsd / holding.balance : null;
    const result = computeBuyerPnl(rows(birdeyeSwapResult.value), holding.address, holding.balance, currentPrice);
    return result.realizedPnl !== null || result.unrealizedPnl !== null ? result : null;
  }).filter(Boolean);
  const pnl = pnlRows.length ? {
    realizedUsd: pnlRows.some((row) => row?.realizedPnl !== null) ? pnlRows.reduce((sum, row) => sum + (row?.realizedPnl ?? 0), 0) : null,
    unrealizedUsd: pnlRows.some((row) => row?.unrealizedPnl !== null) ? pnlRows.reduce((sum, row) => sum + (row?.unrealizedPnl ?? 0), 0) : null,
    totalUsd: pnlRows.reduce((sum, row) => sum + (row?.realizedPnl ?? 0) + (row?.unrealizedPnl ?? 0), 0),
    source: 'Birdeye trade history',
  } : null;

  const heliusSolBalance = firstNumber(heliusResult.value?.nativeBalance?.lamports, heliusResult.value?.nativeBalance?.balance);
  const normalizedHeliusSol = heliusSolBalance !== null
    ? (heliusResult.value?.nativeBalance?.lamports ? heliusSolBalance / 1e9 : heliusSolBalance)
    : null;
  const normalizedSol = normalizedHeliusSol ?? publicResult.value?.solBalance ?? null;
  const totalValueUsd = holdings.reduce((sum, holding) => sum + (holding.valueUsd ?? 0), 0) || null;
  const topHoldingPercentage = totalValueUsd ? ((holdings[0]?.valueUsd ?? 0) / totalValueUsd) * 100 : null;
  const notes = [
    !publicResult.value ? `Public Solana RPC is unavailable: ${publicResult.error ?? 'request failed'}` : '',
    !heliusKey ? 'Add HELIUS_API_KEY for portfolio assets and native SOL balance.' : '',
    !birdeyeKey ? 'Add BIRDEYE_API_KEY for wallet token prices and USD values.' : '',
    !solscanKey ? 'Add SOLSCAN_API_KEY for wallet transaction history.' : '',
    !heliusKey ? 'Add HELIUS_API_KEY for wallet transfers and enhanced transaction types.' : '',
    !birdeyeKey ? 'Add BIRDEYE_API_KEY for swap history and calculated PnL.' : '',
    !pnl ? 'Wallet PnL is unavailable because provider trade history did not include enough cost-basis data.' : '',
    holdings.length === 0 ? 'No indexed fungible token holdings were returned for this wallet.' : '',
  ].filter(Boolean);
  const providers = [
    provider('DexScreener', true, false, 'Not needed for wallet holdings'),
    provider('Solana RPC', true, Boolean(publicResult.value), publicResult.error),
    provider('Helius', Boolean(heliusKey), Boolean(heliusResult.value || heliusActivityResult.value), heliusResult.error || heliusActivityResult.error),
    provider('Birdeye', Boolean(birdeyeKey), Boolean(birdeyeResult.value || birdeyeSwapResult.value), birdeyeResult.error || birdeyeSwapResult.error),
    provider('Solscan', Boolean(solscanKey), Boolean(solscanTokenResult.value || solscanActivityResult.value), solscanTokenResult.error),
  ];

  const result: WalletAnalysis = {
    address,
    portfolio: {
      solBalance: normalizedSol,
      totalValueUsd,
      tokenCount: holdings.length,
      nftCount: heliusItems.filter((item) => item.content?.metadata?.tokenStandard && !item.token_info).length,
    },
    holdings,
    activity,
    transfers,
    swaps,
    pnl,
    signals: {
      activeDays: null,
      topHoldingPercentage,
      risk: topHoldingPercentage !== null && topHoldingPercentage > 75 ? 'high' : holdings.length > 3 ? 'medium' : 'unknown',
      notes,
    },
    providers,
  };
  return sendJson(response, 200, result);
}