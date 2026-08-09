import type { ProviderName, ProviderStatus, WalletActivity, WalletAnalysis, WalletHolding } from './types';
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

function provider(name: ProviderName, configured: boolean, available: boolean, message?: string): ProviderStatus {
  return { name, configured, available, ...(message ? { message } : {}) };
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

async function birdeyeTokens(address: string, key: string) {
  return fetchJson<JsonRecord>(`https://public-api.birdeye.so/v1/wallet/token_list?wallet=${encodeURIComponent(address)}&chain=solana`, {
    headers: { 'X-API-KEY': key, 'x-chain': 'solana' },
  });
}

function rows(body: JsonRecord | undefined) {
  if (!body) return [];
  const data = body.data;
  if (Array.isArray(data)) return asArray(data);
  if (data && typeof data === 'object') return asArray((data as JsonRecord).items ?? (data as JsonRecord).result);
  return asArray(body.items ?? body.result);
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method && request.method !== 'GET') return sendJson(response, 405, { error: 'Only GET is supported.' });
  const address = queryValue(request, 'address')?.trim();
  if (!address || !isSolanaAddress(address)) return sendJson(response, 400, { error: 'Enter a valid Solana wallet address.' });

  const heliusKey = getEnv('HELIUS_API_KEY');
  const birdeyeKey = getEnv('BIRDEYE_API_KEY');
  const solscanKey = getEnv('SOLSCAN_API_KEY');
  const [heliusResult, solscanTokenResult, solscanActivityResult, birdeyeResult] = await Promise.all([
    heliusKey ? optionalProvider(() => heliusPortfolio(address, heliusKey)) : Promise.resolve({ value: undefined, error: 'HELIUS_API_KEY is not configured' }),
    solscanKey ? optionalProvider(() => solscanTokens(address, solscanKey)) : Promise.resolve({ value: undefined, error: 'SOLSCAN_API_KEY is not configured' }),
    solscanKey ? optionalProvider(() => solscanActivity(address, solscanKey)) : Promise.resolve({ value: undefined, error: 'SOLSCAN_API_KEY is not configured' }),
    birdeyeKey ? optionalProvider(() => birdeyeTokens(address, birdeyeKey)) : Promise.resolve({ value: undefined, error: 'BIRDEYE_API_KEY is not configured' }),
  ]);

  const heliusItems = asArray(heliusResult.value?.items);
  const solscanItems = rows(solscanTokenResult.value);
  const birdeyeItems = rows(birdeyeResult.value);
  const sourceRows = heliusItems.length ? heliusItems : birdeyeItems.length ? birdeyeItems : solscanItems;
  const holdings: WalletHolding[] = sourceRows
    .map((item) => {
      const tokenInfo = item.token_info ?? item.tokenInfo ?? {};
      const balanceRaw = firstNumber(item.amount, item.balance, tokenInfo.balance);
      const decimals = firstNumber(tokenInfo.decimals, item.decimals);
      const balance = balanceRaw !== null && decimals !== null && balanceRaw > 1000000 ? balanceRaw / 10 ** decimals : balanceRaw;
      const valueUsd = firstNumber(item.price_per_token_usd && balance ? item.price_per_token_usd * balance : null, item.valueUsd, item.value, item.usdValue);
      return {
        address: String(item.id ?? item.address ?? tokenInfo.address ?? ''),
        symbol: String(item.content?.metadata?.symbol ?? item.symbol ?? tokenInfo.symbol ?? '—'),
        name: String(item.content?.metadata?.name ?? item.name ?? tokenInfo.name ?? 'Unknown token'),
        logo: String(item.content?.links?.image ?? item.logo ?? '') || null,
        balance,
        valueUsd,
        decimals,
      };
    })
    .filter((item) => item.address && (item.balance === null || item.balance > 0))
    .sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0))
    .slice(0, 20);

  const activity: WalletActivity[] = rows(solscanActivityResult.value).slice(0, 10).map((item) => ({
    signature: String(item.tx_hash ?? item.signature ?? item.trans_id ?? '—'),
    type: String(item.activity_type ?? item.type ?? item.main_action ?? 'Transaction'),
    description: String(item.description ?? item.program_id ?? 'Solana transaction'),
    timestamp: firstNumber(item.block_time, item.blockTime, item.time) ? new Date((firstNumber(item.block_time, item.blockTime, item.time) ?? 0) * 1000).toISOString() : null,
    source: 'Solscan',
  }));

  const solBalance = firstNumber(heliusResult.value?.nativeBalance?.lamports, heliusResult.value?.nativeBalance?.balance);
  const normalizedSol = solBalance !== null && solBalance > 1000 ? solBalance / 1e9 : solBalance;
  const totalValueUsd = holdings.reduce((sum, holding) => sum + (holding.valueUsd ?? 0), 0) || null;
  const topHoldingPercentage = totalValueUsd ? ((holdings[0]?.valueUsd ?? 0) / totalValueUsd) * 100 : null;
  const notes = [
    !heliusKey ? 'Add HELIUS_API_KEY for portfolio assets and native SOL balance.' : '',
    !birdeyeKey ? 'Add BIRDEYE_API_KEY for wallet token prices and USD values.' : '',
    !solscanKey ? 'Add SOLSCAN_API_KEY for wallet transaction history.' : '',
    holdings.length === 0 ? 'No indexed fungible token holdings were returned for this wallet.' : '',
  ].filter(Boolean);
  const providers = [
    provider('DexScreener', true, false, 'Not needed for wallet holdings'),
    provider('Helius', Boolean(heliusKey), Boolean(heliusResult.value), heliusResult.error),
    provider('Birdeye', Boolean(birdeyeKey), Boolean(birdeyeResult.value), birdeyeResult.error),
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