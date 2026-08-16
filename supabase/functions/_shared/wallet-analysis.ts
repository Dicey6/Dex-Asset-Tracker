import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json } from './cors.ts';

const RPC_URL = 'https://api.mainnet-beta.solana.com';
const TOKEN_PROGRAMS = [
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
];

type RecordValue = Record<string, any>;

async function fetchJson<T = RecordValue>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { Accept: 'application/json', ...(init.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${response.status}: ${body?.message || 'Provider request failed'}`);
  return body as T;
}

function number(...values: unknown[]) {
  for (const value of values) {
    const parsed = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function rows(body: RecordValue | undefined) {
  const data = body?.data;
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') return data.items || data.result || [];
  return body?.items || body?.result || [];
}

function validAddress(address: string) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

async function publicBalance(address: string) {
  const requests = [
    fetchJson<RecordValue>(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [address, { commitment: 'confirmed' }] }),
    }),
    ...TOKEN_PROGRAMS.map((programId) => fetchJson<RecordValue>(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: programId,
        method: 'getTokenAccountsByOwner',
        params: [address, { programId }, { encoding: 'jsonParsed', commitment: 'confirmed' }],
      }),
    })),
  ];
  const [balance, ...tokenResults] = await Promise.all(requests);
  return {
    solBalance: number(balance.result?.value) !== null ? (number(balance.result?.value) || 0) / 1e9 : null,
    tokenAccounts: tokenResults.flatMap((result) => result.result?.value || []),
  };
}

function normalizeHolding(item: RecordValue) {
  const tokenInfo = item.token_info || item.tokenInfo || {};
  const parsed = item.account?.data?.parsed?.info || {};
  const tokenAmount = parsed.tokenAmount || {};
  const decimals = number(tokenInfo.decimals, item.decimals, tokenAmount.decimals);
  const balance = number(item.uiAmount, item.ui_amount, tokenAmount.uiAmount)
    ?? (number(item.amount, item.balance, tokenAmount.amount) !== null && decimals !== null
      ? (number(item.amount, item.balance, tokenAmount.amount) || 0) / 10 ** decimals
      : number(item.amount, item.balance, tokenAmount.amount));
  const price = number(item.price_per_token_usd, item.pricePerTokenUsd, item.price, tokenInfo.price_info?.price_per_token);
  const valueUsd = number(item.valueUsd, item.value, item.usdValue, tokenInfo.price_info?.total_price)
    ?? (price !== null && balance !== null ? price * balance : null);
  const mint = String(item.id || item.address || tokenInfo.address || parsed.mint || '');
  if (!mint || balance === null || balance <= 0) return null;
  return {
    token_mint: mint,
    token_symbol: String(item.content?.metadata?.symbol || item.symbol || tokenInfo.symbol || ''),
    token_name: String(item.content?.metadata?.name || item.name || tokenInfo.name || ''),
    balance,
    value_usd: valueUsd,
    decimals,
    logo_url: String(item.content?.links?.image || item.logo || '') || null,
  };
}

async function persist(
  client: SupabaseClient,
  address: string,
  data: RecordValue,
) {
  const { data: wallet, error: walletError } = await client
    .from('wallets')
    .upsert({
      wallet_address: address,
      sol_balance: data.portfolio.solBalance,
      total_value_usd: data.portfolio.totalValueUsd,
      last_updated_at: new Date().toISOString(),
    }, { onConflict: 'wallet_address' })
    .select('id')
    .single();
  if (walletError) throw walletError;

  const walletId = wallet.id as string;
  const { data: authData } = await client.auth.getUser();
  if (!authData.user) throw new Error('Authentication required to persist wallet analysis.');

  const { error: relationError } = await client.from('user_wallets').upsert({
    user_id: authData.user.id,
    wallet_id: walletId,
    last_analyzed_at: new Date().toISOString(),
  });
  if (relationError) throw relationError;

  await client.from('wallet_holdings').delete().eq('wallet_id', walletId);
  if (data.holdings.length) {
    const { error } = await client.from('wallet_holdings').insert(
      data.holdings.map((holding: RecordValue) => ({ wallet_id: walletId, ...holding })),
    );
    if (error) throw error;
  }

  if (data.activity.length) {
    const { error } = await client.from('wallet_transactions').upsert(
      data.activity.map((activity: RecordValue) => ({
        wallet_id: walletId,
        signature: activity.signature,
        transaction_type: activity.type,
        description: activity.description,
        occurred_at: activity.timestamp,
        source: activity.source,
      })),
      { onConflict: 'wallet_id,signature' },
    );
    if (error) throw error;
  }
}

export async function handleWalletAnalysis(request: Request) {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Only POST is supported.' }, 405);

  const authHeader = request.headers.get('Authorization') || '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const client = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData } = await client.auth.getUser();
  if (!userData.user) return json({ error: 'Sign in to save wallet analysis.' }, 401);

  const body = await request.json().catch(() => ({}));
  const address = String(body.wallet_address || '').trim();
  if (!validAddress(address)) return json({ error: 'Enter a valid Solana wallet address.' }, 400);

  const heliusKey = Deno.env.get('HELIUS_API_KEY');
  const birdeyeKey = Deno.env.get('BIRDEYE_API_KEY');
  const solscanKey = Deno.env.get('SOLSCAN_API_KEY');
  const publicData = await publicBalance(address);
  const [helius, birdeye, activity] = await Promise.all([
    heliusKey
      ? fetchJson<RecordValue>(`https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(heliusKey)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0', id: 'dyorly', method: 'getAssetsByOwner',
            params: { ownerAddress: address, page: 1, limit: 100, displayOptions: { showFungible: true, showNativeBalance: true } },
          }),
        }).catch(() => undefined)
      : Promise.resolve(undefined),
    birdeyeKey
      ? fetchJson<RecordValue>(`https://public-api.birdeye.so/v1/wallet/token_list?wallet=${encodeURIComponent(address)}&chain=solana`, {
          headers: { 'X-API-KEY': birdeyeKey, 'x-chain': 'solana' },
        }).catch(() => undefined)
      : Promise.resolve(undefined),
    solscanKey
      ? fetchJson<RecordValue>(`https://pro-api.solscan.io/v2.0/account/transactions?address=${encodeURIComponent(address)}&page=1&page_size=20`, {
          headers: { token: solscanKey },
        }).catch(() => undefined)
      : Promise.resolve(undefined),
  ]);

  const sourceItems = (helius?.result?.items || []).map(normalizeHolding).filter(Boolean);
  const fallbackItems = rows(birdeye).map(normalizeHolding).filter(Boolean);
  const rpcItems = publicData.tokenAccounts.map(normalizeHolding).filter(Boolean);
  const holdings = Array.from(new Map(
    (sourceItems.length ? sourceItems : fallbackItems.length ? fallbackItems : rpcItems)
      .map((item: RecordValue) => [item.token_mint, item]),
  ).values());
  const activityRows = rows(activity).slice(0, 20).map((item: RecordValue) => ({
    signature: String(item.tx_hash || item.signature || item.trans_id || ''),
    type: String(item.activity_type || item.type || item.main_action || 'Transaction'),
    description: String(item.description || item.program_id || 'Solana transaction'),
    timestamp: number(item.block_time, item.blockTime, item.time)
      ? new Date((number(item.block_time, item.blockTime, item.time) || 0) * 1000).toISOString()
      : null,
    source: 'Solscan',
  })).filter((item: RecordValue) => item.signature);

  const solBalance = number(helius?.result?.nativeBalance?.lamports) !== null
    ? (number(helius?.result?.nativeBalance?.lamports) || 0) / 1e9
    : publicData.solBalance;
  const totalValueUsd = holdings.reduce((sum: number, item: RecordValue) => sum + (item.value_usd || 0), 0) || null;
  const result = {
    address,
    portfolio: { solBalance, totalValueUsd, tokenCount: holdings.length, nftCount: 0 },
    holdings: holdings.map((item: RecordValue) => ({
      address: item.token_mint,
      symbol: item.token_symbol,
      name: item.token_name,
      logo: item.logo_url,
      balance: item.balance,
      valueUsd: item.value_usd,
      decimals: item.decimals,
    })),
    activity: activityRows,
    signals: {
      activeDays: null,
      topHoldingPercentage: totalValueUsd ? ((holdings[0]?.value_usd || 0) / totalValueUsd) * 100 : null,
      risk: 'unknown',
      notes: [
        !heliusKey ? 'Add HELIUS_API_KEY to enrich assets and native SOL metadata.' : '',
        !birdeyeKey ? 'Add BIRDEYE_API_KEY for wallet token prices and USD values.' : '',
        !solscanKey ? 'Add SOLSCAN_API_KEY for wallet transaction history.' : '',
      ].filter(Boolean),
    },
    providers: [
      { name: 'Solana RPC', configured: true, available: true },
      { name: 'Helius', configured: Boolean(heliusKey), available: Boolean(helius) },
      { name: 'Birdeye', configured: Boolean(birdeyeKey), available: Boolean(birdeye) },
      { name: 'Solscan', configured: Boolean(solscanKey), available: Boolean(activity) },
    ],
  };

  await persist(client, address, result);
  return json(result);
}