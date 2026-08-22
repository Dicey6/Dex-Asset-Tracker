'use strict';

/**
 * Client-side token analysis pipeline.
 *
 * IMPORTANT — TEMPORARY / TEST BUILD:
 * This file runs entirely in the browser and calls Helius, Birdeye, and
 * DexScreener directly with hardcoded keys. Anyone can read these keys via
 * browser dev tools / view-source. This is intentional for now per explicit
 * instruction, but the keys below should be rotated and this file should be
 * retired in favor of server-side calls before real traffic hits this page.
 *
 * Scope (matches current priorities only):
 *   - Token overview (name/price/mcap/liquidity/volume) via DexScreener
 *   - Top 10 holders: REAL wallet owners + REAL % of supply, via Solana RPC
 *     (getTokenLargestAccounts + owner resolution), not token-account addresses
 *   - DEX Paid + DEX Boost status, correctly interpreted from DexScreener
 *   - Top traders (Birdeye, endpoint-corrected) — kept from the prior build
 *   - Developer / mint authority info — kept from the prior build
 *   - First-10-buyers REMOVED entirely (not fetched, not rendered)
 *
 * Wallet page (wallet.html / api/wallet.ts) is NOT touched by this file.
 */

(function () {
  // ─── Hardcoded keys (TEMPORARY — see notice above) ─────────────────────────
  const HELIUS_API_KEY = 'd5381285-5b00-4ad2-9255-581b5e55e2cc';
  const BIRDEYE_API_KEY = '7bff94ef999d4fb9a3a125de7502bab3';

  const HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
  const DEX = 'https://api.dexscreener.com';
  const BIRDEYE = 'https://public-api.birdeye.so';
  const RUGCHECK = 'https://api.rugcheck.xyz/v1';

  // ─── Small fetch helpers (mirrors api/_shared.ts behavior) ─────────────────
  function firstNumber(...values) {
    for (const v of values) {
      const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN;
      if (Number.isFinite(n)) return n;
    }
    return null;
  }

  function asArray(v) {
    return Array.isArray(v) ? v.filter((item) => item && typeof item === 'object') : [];
  }

  async function fetchJson(url, init = {}, timeoutMs = 10000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal, headers: { Accept: 'application/json', ...(init.headers || {}) } });
      const text = await res.text();
      let body = {};
      try { body = text ? JSON.parse(text) : {}; } catch { throw new Error(`Provider returned invalid JSON (${res.status})`); }
      if (!res.ok) {
        const detail = body && typeof body === 'object' && 'message' in body ? String(body.message) : res.statusText;
        throw new Error(`${res.status}: ${detail || 'provider request failed'}`);
      }
      return body;
    } finally {
      clearTimeout(timer);
    }
  }

  async function optionalProvider(task) {
    try { return { value: await task(), error: undefined }; }
    catch (error) { return { value: undefined, error: error instanceof Error ? error.message : 'provider request failed' }; }
  }

  async function heliusRpc(method, params, timeoutMs = 10000) {
    const body = await fetchJson(HELIUS_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 'dyorly-client', method, params }),
    }, timeoutMs);
    if (body.error) throw new Error(`${body.error.code ?? 'RPC'}: ${body.error.message ?? 'RPC request failed'}`);
    return body.result ?? null;
  }

  // ─── DexScreener: pair resolution, overview, boosts, paid orders ───────────
  function isSolanaAddress(v) {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v);
  }

  async function dexPairs(input) {
    if (isSolanaAddress(input)) {
      const body = await fetchJson(`${DEX}/token-pairs/v1/solana/${encodeURIComponent(input)}`);
      return Array.isArray(body) ? asArray(body) : asArray(body.pairs);
    }
    const body = await fetchJson(`${DEX}/latest/dex/search?q=${encodeURIComponent(input)}`);
    return asArray(body.pairs).filter((p) => p.chainId === 'solana');
  }

  function choosePair(pairs) {
    return [...pairs].sort((a, b) => (firstNumber(b.liquidity?.usd) ?? 0) - (firstNumber(a.liquidity?.usd) ?? 0))[0];
  }

  // DEX Paid: distinguishes paid / pending / not-paid / unknown, doesn't treat
  // a missing or errored response as "not paid".
  async function dexPaidStatus(chainId, tokenAddress) {
    const orders = await fetchJson(`${DEX}/orders/v1/${encodeURIComponent(chainId)}/${encodeURIComponent(tokenAddress)}`);
    const list = asArray(orders);
    const approved = list.filter((o) => String(o.status ?? '').toLowerCase() === 'approved');
    const processing = list.filter((o) => String(o.status ?? '').toLowerCase() === 'processing');
    const types = [...new Set([...approved, ...processing].map((o) => String(o.type ?? o.orderType ?? '')).filter(Boolean))];
    let state = 'not_paid'; // no orders at all = genuinely no paid data
    if (approved.length) state = 'paid';
    else if (processing.length) state = 'pending';
    return { state, types, raw: list };
  }

  // DEX Boost: only `active` is documented on the shared Pair schema — don't
  // fabricate a totalAmount field the schema doesn't confirm.
  function dexBoostFromPairs(pairs) {
    const active = pairs.reduce((max, p) => Math.max(max, firstNumber(p.boosts?.active) ?? 0), 0);
    return active > 0 ? { active } : null;
  }

  // ─── Solana RPC (via Helius): real top-10 holder resolution ────────────────
  // getTokenLargestAccounts returns TOKEN ACCOUNTS, not wallet owners. We
  // resolve each token account to its owning wallet via getMultipleAccounts,
  // then aggregate by owner in case one wallet holds more than one account
  // for this mint.
  async function resolveTopHolders(mint, decimals, supplyRaw) {
    const largest = await heliusRpc('getTokenLargestAccounts', [mint]);
    const accounts = asArray(largest?.value).slice(0, 20);
    if (!accounts.length) return [];

    const addrs = accounts.map((a) => String(a.address)).filter(Boolean);
    const infoResult = await heliusRpc('getMultipleAccounts', [addrs, { encoding: 'jsonParsed' }]);
    const infos = asArray(infoResult?.value ? infoResult.value.map((v) => v || {}) : []);

    const byOwner = new Map();
    accounts.forEach((acct, i) => {
      const parsed = infos[i]?.data?.parsed?.info;
      const owner = parsed?.owner ? String(parsed.owner) : null;
      const rawAmount = firstNumber(acct.amount);
      if (!owner || rawAmount === null) return;
      const uiAmount = decimals !== null ? rawAmount / 10 ** decimals : rawAmount;
      const existing = byOwner.get(owner);
      if (existing) existing.amount += uiAmount;
      else byOwner.set(owner, { address: owner, amount: uiAmount });
    });

    const supply = supplyRaw !== null && decimals !== null ? supplyRaw / 10 ** decimals : null;
    return [...byOwner.values()]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
      .map((h, i) => ({
        address: h.address,
        rank: i + 1,
        balance: new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(h.amount),
        rawBalance: h.amount,
        percentage: supply ? (h.amount / supply) * 100 : null,
        valueUsd: null, // filled in once we have live price
      }));
  }

  async function getMintInfo(mint) {
    const [supplyResult, accountResult] = await Promise.all([
      heliusRpc('getTokenSupply', [mint]),
      heliusRpc('getAccountInfo', [mint, { encoding: 'jsonParsed' }]),
    ]);
    const decimals = firstNumber(supplyResult?.value?.decimals);
    const supplyRaw = firstNumber(supplyResult?.value?.amount);
    const mintAuthority = accountResult?.value?.data?.parsed?.info?.mintAuthority ?? null;
    return { decimals, supplyRaw, mintAuthority: mintAuthority ? String(mintAuthority) : null };
  }

  // ─── Birdeye: top traders (endpoint-corrected) ──────────────────────────────
  async function birdeyeTopTraders(address) {
    return fetchJson(
      `${BIRDEYE}/defi/v2/tokens/top_traders?address=${encodeURIComponent(address)}&time_frame=24h&offset=0&limit=10&sort_by=volume&sort_type=desc`,
      { headers: { 'X-API-KEY': BIRDEYE_API_KEY, 'x-chain': 'solana' } },
      12000,
    );
  }

  async function rugCheckReport(address) {
    const report = await fetchJson(`${RUGCHECK}/tokens/${encodeURIComponent(address)}/report`, {}, 12000);
    const risks = asArray(report.risks);
    return {
      score: firstNumber(report.score_normalised, report.scoreNormalized, report.score),
      riskCount: risks.length,
      rugged: report.rugged === true,
      risks: risks.map((risk) => ({
        name: String(risk.name ?? risk.description ?? risk.kind ?? 'Risk signal'),
        level: String(risk.level ?? risk.severity ?? 'unknown'),
      })),
    };
  }

  function normalizeTrader(row) {
    const address = String(row.address ?? row.owner ?? '').trim();
    if (!address) return null;
    const realizedPnl = firstNumber(row.realizedPnl, row.realized_profit, row.realizedPnl);
    const unrealizedPnl = firstNumber(row.unrealizedPnl, row.unrealized_profit);
    return {
      address,
      volume: firstNumber(row.volume, row.volumeUsd),
      buyVolume: firstNumber(row.volumeBuy, row.volumeBuyUSD),
      sellVolume: firstNumber(row.volumeSell, row.volumeSellUSD),
      realizedPnl,
      unrealizedPnl,
      totalPnl: realizedPnl !== null && unrealizedPnl !== null ? realizedPnl + unrealizedPnl : (realizedPnl ?? unrealizedPnl),
      avgBuyPrice: firstNumber(row.avgBuyPrice),
      avgSellPrice: firstNumber(row.avgSellPrice),
      buyCount: firstNumber(row.tradeBuy),
      sellCount: firstNumber(row.tradeSell),
      netTokenBalance: firstNumber(row.holdVolume),
      netTokenBalanceFormatted: firstNumber(row.holdVolume) !== null
        ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, notation: 'compact' }).format(firstNumber(row.holdVolume))
        : '—',
      solscanUrl: `https://solscan.io/account/${address}`,
    };
  }

  // ─── Main entry point ────────────────────────────────────────────────────
  async function analyze(input) {
    const value = String(input || '').trim();
    if (!value) throw new Error('Enter a token address or symbol.');

    const pairs = await dexPairs(value);
    const pair = choosePair(pairs);
    if (!pair) throw new Error('No Solana market was found for that token.');

    const address = String(pair.baseToken?.address ?? value);

    const [mintInfoResult, holdersResult, paidResult, tradersResult, rugCheckResult] = await Promise.all([
      optionalProvider(() => getMintInfo(address)),
      optionalProvider(async () => {
        const mint = await getMintInfo(address);
        return resolveTopHolders(address, mint.decimals, mint.supplyRaw);
      }),
      optionalProvider(() => dexPaidStatus('solana', address)),
      optionalProvider(() => birdeyeTopTraders(address)),
      optionalProvider(() => rugCheckReport(address)),
    ]);

    const priceUsd = firstNumber(pair.priceUsd);
    const holders = (holdersResult.value ?? []).map((h) => ({
      ...h,
      valueUsd: priceUsd !== null ? h.rawBalance * priceUsd : null,
      // Entry MC / PnL intentionally omitted in this pass — would require a
      // Birdeye trade-history call per holder, which risks the 60rpm shared
      // rate limit. Shown as N/A rather than estimated.
      entryMcUsd: null,
      realizedPnl: null,
      unrealizedPnl: null,
    }));
    const top10Percentage = holders.some((h) => h.percentage !== null)
      ? holders.reduce((sum, h) => sum + (h.percentage ?? 0), 0)
      : null;

    const traderRows = tradersResult.value ? asArray(tradersResult.value.data?.items ?? tradersResult.value.items) : [];
    const topTraders = traderRows.map(normalizeTrader).filter(Boolean).slice(0, 10);

    const liquidityTotal = pairs.reduce((sum, p) => sum + (firstNumber(p.liquidity?.usd) ?? 0), 0) || null;
    const venues = pairs
      .map((p) => ({ name: String(p.dexId ?? 'Unknown DEX'), liquidityUsd: firstNumber(p.liquidity?.usd) ?? 0 }))
      .filter((v) => v.liquidityUsd > 0)
      .reduce((all, v) => {
        const existing = all.find((e) => e.name === v.name);
        if (existing) existing.liquidityUsd += v.liquidityUsd;
        else all.push(v);
        return all;
      }, [])
      .sort((a, b) => b.liquidityUsd - a.liquidityUsd)
      .slice(0, 5);

    const mintAuthority = mintInfoResult.value?.mintAuthority ?? null;
    const devHolder = mintAuthority ? holders.find((h) => h.address === mintAuthority) : undefined;

    const dexBoosts = dexBoostFromPairs(pairs);
    const paid = paidResult.value;

    const warnings = [
      !holdersResult.value?.length ? 'Holder data could not be resolved from Solana RPC.' : '',
      !paidResult.value ? `DexScreener paid-order status is unavailable: ${paidResult.error ?? 'request failed'}` : '',
      pair.liquidity?.usd && Number(pair.liquidity.usd) < 25000 ? 'Low liquidity can make exits materially worse than the quoted price.' : '',
    ].filter(Boolean);

    const providers = [
      { name: 'DexScreener', configured: true, available: true },
      { name: 'Solana RPC (Helius)', configured: true, available: Boolean(holdersResult.value), message: holdersResult.error },
      { name: 'Birdeye', configured: true, available: Boolean(tradersResult.value), message: tradersResult.error },
      { name: 'RugCheck', configured: true, available: Boolean(rugCheckResult.value), message: rugCheckResult.error },
    ];

    return {
      address,
      token: {
        name: String(pair.baseToken?.name ?? 'Unknown token'),
        symbol: String(pair.baseToken?.symbol ?? '—'),
        logo: String(pair.info?.imageUrl ?? '') || null,
        priceUsd,
        priceChange24h: firstNumber(pair.priceChange?.h24),
        marketCap: firstNumber(pair.marketCap),
        fdv: firstNumber(pair.fdv),
        volume24h: firstNumber(pair.volume?.h24),
        buys24h: firstNumber(pair.txns?.h24?.buys),
        sells24h: firstNumber(pair.txns?.h24?.sells),
        pairCreatedAt: pair.pairCreatedAt ? new Date(Number(pair.pairCreatedAt)).toISOString() : null,
        websites: asArray(pair.info?.websites).map((s) => String(s.url ?? '')).filter(Boolean),
        socials: asArray(pair.info?.socials).map((s) => ({ type: String(s.type ?? 'social'), url: String(s.url ?? '') })).filter((s) => s.url),
        pairUrl: String(pair.url ?? '') || null,
      },
      liquidity: { totalUsd: liquidityTotal, venues, pairCount: pairs.length, locked: null },
      holders: { top: holders, top10Percentage, totalKnown: null },
      topTraders,
      earlyBuyers: [], // removed per requirements
      developer: {
        address: mintAuthority,
        balancePercentage: devHolder?.percentage ?? null,
        source: mintAuthority ? 'Solana RPC mint authority' : 'Not available',
        risk: devHolder?.percentage != null && devHolder.percentage > 10 ? 'high' : mintAuthority ? 'unknown' : 'unknown',
      },
      dexBoosts,
      relationships: { wallets: holders.slice(0, 5).map((h) => h.address), directCount: 0, source: 'Not available' },
      monitoring: {
        boosts: dexBoosts?.active ?? null,
        paidOrders: paid ? paid.state === 'paid' : null,
        paidOrderTypes: paid?.types ?? [],
        paidStatus: paid?.state ?? 'unknown', // 'paid' | 'pending' | 'not_paid' | 'unknown'
        warnings,
        rugCheck: rugCheckResult.value ?? null,
      },
      providers,
    };
  }

  window.DyorlyTokenClient = { analyze };
})();
