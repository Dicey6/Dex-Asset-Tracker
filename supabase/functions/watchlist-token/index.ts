import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

const validAddress = (value: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Only POST is supported.' }, 405);

  const authorization = request.headers.get('Authorization') || '';
  const client = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_ANON_KEY') || '',
    { global: { headers: { Authorization: authorization } } },
  );
  const { data: userData } = await client.auth.getUser();
  if (!userData.user) return json({ error: 'Sign in to watch tokens.' }, 401);

  const body = await request.json().catch(() => ({}));
  const tokenMint = String(body.token_mint || '').trim();
  if (!validAddress(tokenMint)) return json({ error: 'Enter a valid Solana token mint.' }, 400);

  const { data: market } = await fetch(
    `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(tokenMint)}`,
    { headers: { Accept: 'application/json' } },
  ).then(async (response) => response.ok ? response.json() : ({ pairs: [] }))
    .catch(() => ({ pairs: [] }));
  const pair = (market?.pairs || [])
    .filter((item: Record<string, unknown>) => item.chainId === 'solana')
    .sort((a: Record<string, any>, b: Record<string, any>) => Number(b.liquidity?.usd || 0) - Number(a.liquidity?.usd || 0))[0];
  if (!pair) return json({ error: 'No live Solana market was found for this token.' }, 404);

  const price = Number(pair.priceUsd);
  const marketCap = Number(pair.marketCap || pair.fdv);
  const payload = {
    user_id: userData.user.id,
    token_mint: tokenMint,
    token_symbol: String(pair.baseToken?.symbol || ''),
    token_name: String(pair.baseToken?.name || ''),
    current_market_cap: Number.isFinite(marketCap) ? marketCap : null,
    market_cap_at_watch: Number.isFinite(marketCap) ? marketCap : null,
    price_at_watch: Number.isFinite(price) ? price : null,
    alert_enabled: body.alert_enabled !== false,
    alert_up_percent: Math.max(0, Number(body.alert_up_percent ?? 50)),
    alert_down_percent: Math.max(0, Number(body.alert_down_percent ?? 20)),
    is_active: true,
  };

  const { data, error } = await client
    .from('watchlists')
    .upsert(payload, { onConflict: 'user_id,token_mint' })
    .select()
    .single();
  if (error) return json({ error: error.message }, 400);
  return json(data);
});