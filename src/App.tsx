import { useMemo, useState } from 'react';
import {
  Activity, ArrowDownRight, ArrowUpRight, BarChart3, Check, CircleHelp,
  Clipboard, Copy, ExternalLink, Link2, LoaderCircle, Menu,
  Search, ShieldCheck, Star, UserRound, WalletCards, X, Zap
} from 'lucide-react';
import { analyzeToken, analyzeWallet } from './lib/api';
import type { ProviderStatus, TokenAnalysis, TokenHolder, WalletAnalysis } from './lib/types';

const dyorlyMark = '/dyorly-mark.png';
const sampleToken = 'So11111111111111111111111111111111111111112';
const sampleWallet = '11111111111111111111111111111111';

function shortAddress(address: string) {
  return address.length > 12 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
}

function currency(value: number | null, compact = true) {
  if (value === null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 2 : 4,
  }).format(value);
}

function number(value: number | null) {
  if (value === null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value);
}

function percent(value: number | null) {
  return value === null || !Number.isFinite(value) ? '—' : `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function date(value: string | null) {
  if (!value) return '—';
  const result = new Date(value);
  return Number.isNaN(result.getTime()) ? '—' : result.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function Metric({ label, value, change, negative, detail }: { label: string; value: string; change?: string; negative?: boolean; detail?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-[.13em] text-slate-500">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="mono text-lg font-bold tracking-tight text-slate-100">{value}</span>
        {change && <span className={`mono text-[11px] font-bold ${negative ? 'text-red' : 'text-lime'}`}>{change}</span>}
      </div>
      {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
    </div>
  );
}

function SectionHeading({ eyebrow, title, action }: { eyebrow: string; title: string; action?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <p className="mono text-[10px] uppercase tracking-[.18em] text-slate-500">{eyebrow}</p>
        <h2 className="mt-1 text-lg font-semibold tracking-[-.025em] text-slate-100">{title}</h2>
      </div>
      {action && <span className="mono text-[10px] uppercase tracking-[.14em] text-slate-500">{action}</span>}
    </div>
  );
}

function MiniBar({ label, value, percentValue, color = 'lime' }: { label: string; value: string; percentValue: number; color?: 'lime' | 'blue' | 'red' }) {
  const safeWidth = Math.min(100, Math.max(2, percentValue));
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs"><span className="text-slate-400">{label}</span><span className={`mono ${color === 'lime' ? 'text-lime' : color === 'red' ? 'text-red' : 'text-blue'}`}>{value}</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800"><div className={`h-full rounded-full ${color === 'lime' ? 'bg-lime-400' : color === 'red' ? 'bg-red-400' : 'bg-blue-400'}`} style={{ width: `${safeWidth}%` }} /></div>
    </div>
  );
}

function ProviderPills({ providers }: { providers: ProviderStatus[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {providers.map((item) => (
        <span key={item.name} title={item.message} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${item.available ? 'border-lime-300/20 bg-lime-300/5 text-slate-300' : item.configured ? 'border-red-400/20 bg-red-400/5 text-red-200' : 'border-slate-800 bg-slate-900/50 text-slate-500'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${item.available ? 'bg-lime-300' : 'bg-slate-600'}`} />{item.name}
        </span>
      ))}
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="glass rounded-xl p-6"><CircleHelp className="h-5 w-5 text-blue-300" /><h3 className="mt-4 font-semibold text-slate-200">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></div>;
}

function TokenDesk({ data }: { data: TokenAnalysis }) {
  const { token, liquidity, holders, developer, earlyWallets, relationships, monitoring } = data;
  const buyTotal = (token.buys24h ?? 0) + (token.sells24h ?? 0);
  const buyPercent = buyTotal ? ((token.buys24h ?? 0) / buyTotal) * 100 : 50;
  return (
    <div id="analysis" className="border-t border-slate-800/70 bg-[#0d1118]">
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <section className="entrance entrance-delay-2 mb-8 flex flex-col justify-between gap-4 border-b border-slate-800/70 pb-7 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2"><span className="rounded-md border border-lime-300/20 bg-lime-300/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-lime-300">Live analysis</span><span className="mono text-[10px] text-slate-600">DexScreener + optional providers</span></div>
            <div className="mt-3 flex items-center gap-3">
              {token.logo ? <img src={token.logo} alt="" className="h-10 w-10 rounded-xl object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-300 text-sm font-bold text-slate-950">{token.symbol.slice(0, 1)}</div>}
              <div><h2 className="text-2xl font-semibold tracking-[-.04em] text-white">{token.name} <span className="text-slate-500">/ {token.symbol}</span></h2><div className="mt-1 flex items-center gap-2"><span className="mono text-[11px] text-slate-500">{shortAddress(data.address)}</span><a href={`https://solscan.io/token/${data.address}`} target="_blank" rel="noreferrer" className="text-slate-500 transition hover:text-blue-300"><ExternalLink className="h-3.5 w-3.5" /></a></div></div>
            </div>
          </div>
          <div className="flex gap-2"><button onClick={() => navigator.clipboard?.writeText(data.address)} className="flex items-center gap-2 rounded-lg border border-slate-700 px-3.5 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-lime-300/50 hover:text-lime-300"><Copy className="h-4 w-4" /> Copy address</button>{token.pairUrl && <a href={token.pairUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-700 p-2.5 text-slate-400 transition hover:border-slate-500 hover:text-white"><Link2 className="h-4 w-4" /></a>}</div>
        </section>

        <section className="entrance entrance-delay-2"><SectionHeading eyebrow="01 / Market read" title="Token overview" action="Solana mainnet" /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="glass rounded-xl p-4 sm:col-span-2"><div className="flex items-start justify-between"><Metric label="Price" value={currency(token.priceUsd, false)} change={percent(token.priceChange24h)} negative={(token.priceChange24h ?? 0) < 0} /><span className="rounded-lg bg-lime-300/10 p-2 text-lime-300"><BarChart3 className="h-4 w-4" /></span></div><div className="mt-6 flex h-10 items-end gap-1">{[28, 36, 31, 48, 44, 57, 52, 70, 61, 78, 74, 88].map((height, i) => <div key={i} className={`flex-1 rounded-t-sm ${i > 8 ? 'bg-lime-300' : 'bg-blue-300/60'}`} style={{ height: `${height}%` }} />)}</div><div className="mt-2 flex justify-between text-[10px] text-slate-600"><span>market signal</span><span>{date(token.pairCreatedAt)}</span></div></div>
          <div className="glass rounded-xl p-4"><Metric label="Market cap" value={currency(token.marketCap)} detail={token.fdv ? `FDV ${currency(token.fdv)}` : undefined} /><div className="mt-7 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full w-[62%] rounded-full bg-blue-300" /></div><p className="mt-2 text-[11px] text-slate-500">Live DexScreener estimate</p></div>
          <div className="glass rounded-xl p-4"><Metric label="24h volume" value={currency(token.volume24h)} detail={`${number(buyTotal || null)} tracked swaps`} /><div className="mt-5 flex h-10 items-end gap-1">{[20, 34, 28, 52, 45, 62, 54, 76, 62, 92, 80, 100].map((height, i) => <div key={i} className="flex-1 rounded-t-sm bg-blue-300/70" style={{ height: `${height}%` }} />)}</div></div>
        </div></section>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.18fr_.82fr]">
          <section><SectionHeading eyebrow="02 / Market structure" title="Liquidity & DEX status" action={`${liquidity.pairCount} venues tracked`} /><div className="grid gap-3 sm:grid-cols-2"><div className="glass rounded-xl p-4"><Metric label="Total liquidity" value={currency(liquidity.totalUsd)} detail="Across indexed Solana pairs" /><div className="mt-5 space-y-3">{liquidity.venues.length ? liquidity.venues.map((venue, index) => <MiniBar key={venue.name} label={venue.name} value={currency(venue.liquidityUsd)} percentValue={liquidity.totalUsd ? (venue.liquidityUsd / liquidity.totalUsd) * 100 : 0} color={index ? 'blue' : 'lime'} />) : <p className="text-sm text-slate-500">Liquidity detail unavailable.</p>}</div></div><div className="glass rounded-xl p-4"><div className="flex items-center justify-between"><p className="text-[11px] uppercase tracking-[.13em] text-slate-500">Market health</p><ShieldCheck className="h-4 w-4 text-lime-300" /></div><div className="mt-3 flex items-center gap-3"><span className="text-3xl font-semibold text-lime-300">{liquidity.totalUsd !== null ? 'LIVE' : '—'}</span><span className="text-sm text-slate-400">DEX read<br /><span className="text-lime-300">{liquidity.totalUsd !== null ? 'Indexed' : 'Unavailable'}</span></span></div><div className="mt-5 space-y-3"><MiniBar label="LP depth" value={currency(liquidity.totalUsd)} percentValue={liquidity.totalUsd ? 70 : 0} /><MiniBar label="LP locked" value={liquidity.locked === null ? 'Not reported' : percent(liquidity.locked)} percentValue={liquidity.locked ?? 0} color="blue" /></div></div></div></section>
          <section><SectionHeading eyebrow="03 / Flow" title="Trading activity" action="last 24 hours" /><div className="glass rounded-xl p-4"><div className="grid grid-cols-2 gap-y-6"><Metric label="Buys" value={number(token.buys24h)} /><Metric label="Sells" value={number(token.sells24h)} negative /><Metric label="Buy / sell ratio" value={token.buys24h !== null && token.sells24h ? (token.buys24h / token.sells24h).toFixed(2) : '—'} detail={token.buys24h !== null && token.sells24h !== null ? (token.buys24h > token.sells24h ? 'buyers in control' : 'sellers in control') : undefined} /><Metric label="Unique traders" value="—" detail="Provider enrichment required" /></div><div className="mt-7 flex h-3 overflow-hidden rounded-full bg-red-400/50"><div className="h-full bg-lime-300" style={{ width: `${buyPercent}%` }} /><div className="h-full flex-1 bg-red-400/70" /></div><div className="mt-2 flex justify-between text-[11px]"><span className="text-lime-300">{token.buys24h === null ? 'Buy data unavailable' : `${buyPercent.toFixed(0)}% buy count`}</span><span className="text-red">{token.sells24h === null ? 'Sell data unavailable' : `${(100 - buyPercent).toFixed(0)}% sell count`}</span></div></div></section>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[.9fr_1.1fr]">
          <section><SectionHeading eyebrow="04 / People behind it" title="Developer intelligence" /><div className="glass rounded-xl p-4"><div className="flex items-center justify-between border-b border-slate-800 pb-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800"><UserRound className="h-4 w-4 text-slate-300" /></div><div><p className="text-sm font-semibold text-slate-200">Asset authority</p><p className="mono text-[10px] text-slate-500">{developer.address ? shortAddress(developer.address) : 'Not returned by provider'}</p></div></div><span className={`rounded-md px-2 py-1 text-[10px] font-bold ${developer.risk === 'high' ? 'bg-red-400/10 text-red' : 'bg-slate-800 text-slate-400'}`}>{developer.risk.toUpperCase()} RISK</span></div><div className="grid grid-cols-2 gap-5 py-5"><Metric label="Authority share" value={percent(developer.balancePercentage)} /><Metric label="Launch history" value="—" detail="Needs transaction history" /><Metric label="Source" value={developer.source} /><Metric label="Sell pressure" value="—" detail="Needs transaction history" /></div><div className="rounded-lg border border-blue-300/15 bg-blue-300/5 p-3 text-xs leading-5 text-slate-400"><CircleHelp className="mr-1.5 inline h-3.5 w-3.5 text-blue-300" /> Developer history is reported only when provider transaction data can verify it.</div></div></section>
          <section><SectionHeading eyebrow="05 / Early conviction" title="Largest indexed holders" action={holders.totalKnown ? `${number(holders.totalKnown)} total holders` : 'provider snapshot'} /><div className="glass overflow-hidden rounded-xl">{holders.top.length ? holders.top.slice(0, 5).map((holder) => <HolderRow key={holder.address} holder={holder} />) : <div className="p-5"><EmptyState title="Holder data is not configured" text="Add Helius, Birdeye, or Solscan keys in Vercel to inspect holder concentration." /></div>}</div></section>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_.9fr]">
          <section><SectionHeading eyebrow="06 / Wallet graph" title="Relationship detection" action={relationships.source} /><div className="glass relative min-h-[290px] overflow-hidden rounded-xl p-5"><div className="relative flex h-[250px] items-center justify-center"><div className="absolute left-[12%] top-[20%] h-px w-[76%] rotate-[12deg] bg-blue-300/30" /><div className="absolute left-[16%] top-[61%] h-px w-[67%] rotate-[-15deg] bg-lime-300/30" /><div className="absolute left-[30%] top-[48%] h-px w-[42%] rotate-[2deg] bg-blue-300/30" />{relationships.wallets.slice(0, 4).map((wallet, index) => <span key={wallet} title={wallet} className={`absolute h-3 w-3 rounded-full ${index === 0 ? 'bg-lime-300 shadow-[0_0_0_5px_rgba(190,242,100,.12)]' : index === 3 ? 'bg-red-400' : 'bg-blue-300'}`} style={{ left: `${17 + index * 20}%`, top: `${25 + (index % 2) * 42}%` }} />)}<div className="z-10 flex h-20 w-20 flex-col items-center justify-center rounded-full border border-lime-300/70 bg-lime-300/15 text-center shadow-[0_0_0_10px_rgba(190,242,100,.05)]"><span className="text-lg font-bold text-lime-300">{token.symbol}</span><span className="mono text-[8px] text-lime-300/70">TOKEN</span></div><span className="absolute bottom-0 left-0 text-[11px] text-slate-500"><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-lime-300" />{relationships.directCount ? `${relationships.directCount} direct relations` : 'transaction history needed'}</span></div></div></section>
          <section><SectionHeading eyebrow="07 / Concentration" title="Top holders" action={holders.top10Percentage === null ? 'not calculated' : `top 10 · ${holders.top10Percentage.toFixed(1)}%`} /><div className="glass rounded-xl p-4"><div className="space-y-4">{holders.top.length ? holders.top.slice(0, 4).map((holder, index) => <HolderBar key={holder.address} holder={holder} index={index} />) : <EmptyState title="No holder snapshot" text="Configure a holder provider to calculate concentration." />}</div></div></section>
        </div>

        <section className="mt-10"><SectionHeading eyebrow="08 / Monitoring" title="Signals to keep watching" action={monitoring.paidOrders === null ? 'limited coverage' : 'live checks'} /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><div className="glass rounded-xl p-4"><p className="text-[11px] uppercase tracking-[.13em] text-slate-500">DexScreener promotion</p><p className="mt-3 text-xl font-semibold text-slate-100">{monitoring.paidOrders === null ? '—' : monitoring.paidOrders ? 'Paid order found' : 'No paid order found'}</p><p className="mt-1 text-xs text-slate-500">A promotion is not a safety signal.</p></div><div className="glass rounded-xl p-4"><p className="text-[11px] uppercase tracking-[.13em] text-slate-500">Boosts</p><p className="mt-3 text-xl font-semibold text-slate-100">{monitoring.boosts === null ? '—' : monitoring.boosts}</p><p className="mt-1 text-xs text-slate-500">Public market metadata.</p></div><div className="glass rounded-xl p-4">{monitoring.warnings.length ? <>{monitoring.warnings.slice(0, 2).map((warning) => <p key={warning} className="mb-2 text-xs leading-5 text-slate-400"><ArrowDownRight className="mr-1 inline h-3.5 w-3.5 text-red" />{warning}</p>)}</> : <p className="text-sm text-lime-300"><Check className="mr-1 inline h-4 w-4" />No provider warnings.</p>}</div></div></section>

        {earlyWallets.length > 0 && <section className="mt-10"><SectionHeading eyebrow="09 / Holder snapshot" title="Largest wallets returned" action="not a transaction timeline" /><div className="glass overflow-hidden rounded-xl">{earlyWallets.map((wallet, index) => <div key={wallet.address} className="grid grid-cols-[38px_1fr_100px_90px] items-center border-b border-slate-800/70 px-4 py-3 text-xs last:border-0"><span className="mono text-slate-600">{String(index + 1).padStart(2, '0')}</span><span className="mono text-slate-300">{shortAddress(wallet.address)}</span><span className="mono text-slate-400">{wallet.amount}</span><span className="text-right text-slate-500">{wallet.status}</span></div>)}</div></section>}

        <section id="providers" className="mt-12 border-t border-slate-800/70 pt-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="mono text-[10px] uppercase tracking-[.18em] text-slate-500">Signals, not guesses</p><p className="mt-2 text-sm text-slate-400">Every card is labeled by source. Missing keys create partial coverage, never fake values.</p></div><ProviderPills providers={data.providers} /></div></section>
      </div>
    </div>
  );
}

function HolderRow({ holder }: { holder: TokenHolder }) {
  return <div className="grid grid-cols-[38px_1fr_110px_90px] items-center border-b border-slate-800/70 px-4 py-3 text-xs last:border-0"><span className="mono text-slate-600">{String(holder.rank ?? '—').padStart(2, '0')}</span><span className="mono text-slate-300">{shortAddress(holder.address)}</span><span className="mono text-slate-400">{holder.balance}</span><span className="text-right text-blue">{percent(holder.percentage)}</span></div>;
}

function HolderBar({ holder, index }: { holder: TokenHolder; index: number }) {
  const color = index === 0 ? 'lime' : index === 3 ? 'red' : 'blue';
  return <div><div className="mb-1.5 flex items-center justify-between text-xs"><span className="text-slate-300">{shortAddress(holder.address)}</span><span className={`mono ${color === 'lime' ? 'text-lime' : color === 'red' ? 'text-red' : 'text-blue'}`}>{percent(holder.percentage)}</span></div><div className="h-1.5 rounded-full bg-slate-800"><div className={`h-full rounded-full ${color === 'lime' ? 'bg-lime-300' : color === 'red' ? 'bg-red-400' : 'bg-blue-300'}`} style={{ width: `${Math.min(100, holder.percentage ?? 2)}%` }} /></div><p className="mt-1 text-[10px] text-slate-600">{holder.balance}</p></div>;
}

function WalletDesk({ data }: { data: WalletAnalysis }) {
  return (
    <div id="analysis" className="border-t border-slate-800/70 bg-[#0d1118]"><div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <section className="mb-8 flex flex-col justify-between gap-4 border-b border-slate-800/70 pb-7 sm:flex-row sm:items-end"><div><div className="flex items-center gap-2"><span className="rounded-md border border-blue-300/20 bg-blue-300/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-blue-300">Live wallet analysis</span><span className="mono text-[10px] text-slate-600">provider indexed</span></div><h2 className="mt-3 text-2xl font-semibold tracking-[-.04em] text-white">Wallet <span className="mono text-slate-500">{shortAddress(data.address)}</span></h2></div><a href={`https://solscan.io/account/${data.address}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-slate-700 px-3.5 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-blue-300/50 hover:text-blue-200"><ExternalLink className="h-4 w-4" /> Open in Solscan</a></section>
      <section><SectionHeading eyebrow="01 / Portfolio" title="Wallet overview" action="current indexed state" /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="glass rounded-xl p-4"><Metric label="SOL balance" value={data.portfolio.solBalance === null ? '—' : `${number(data.portfolio.solBalance)} SOL`} /></div><div className="glass rounded-xl p-4"><Metric label="Token value" value={currency(data.portfolio.totalValueUsd)} /></div><div className="glass rounded-xl p-4"><Metric label="Token holdings" value={number(data.portfolio.tokenCount)} /></div><div className="glass rounded-xl p-4"><Metric label="NFTs indexed" value={number(data.portfolio.nftCount)} /></div></div></section>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1.2fr_.8fr]"><section><SectionHeading eyebrow="02 / Allocation" title="Token holdings" action={`${data.holdings.length} shown`} /><div className="glass overflow-hidden rounded-xl">{data.holdings.length ? data.holdings.map((holding) => <div key={holding.address} className="flex items-center gap-3 border-b border-slate-800/70 px-4 py-3 last:border-0"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-blue-200">{holding.logo ? <img src={holding.logo} alt="" className="h-9 w-9 rounded-lg object-cover" /> : holding.symbol.slice(0, 1)}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-200">{holding.name}</p><p className="mono text-[10px] text-slate-500">{holding.symbol} · {shortAddress(holding.address)}</p></div><div className="text-right"><p className="mono text-sm text-slate-200">{currency(holding.valueUsd)}</p><p className="mono text-[10px] text-slate-500">{number(holding.balance)} units</p></div></div>) : <div className="p-5"><EmptyState title="No holdings returned" text="Add Helius for indexed assets or Birdeye for wallet token balances." /></div>}</div></section><section><SectionHeading eyebrow="03 / Wallet signals" title="Concentration & risk" /><div className="glass rounded-xl p-4"><div className="flex items-center justify-between"><div><p className="text-[11px] uppercase tracking-[.13em] text-slate-500">Risk read</p><p className={`mt-2 text-3xl font-semibold ${data.signals.risk === 'high' ? 'text-red' : data.signals.risk === 'medium' ? 'text-blue' : 'text-slate-200'}`}>{data.signals.risk.toUpperCase()}</p></div><Activity className="h-5 w-5 text-blue-300" /></div><div className="mt-6 space-y-4"><MiniBar label="Largest holding" value={percent(data.signals.topHoldingPercentage)} percentValue={data.signals.topHoldingPercentage ?? 0} color={data.signals.risk === 'high' ? 'red' : 'blue'} /></div>{data.signals.notes.map((note) => <p key={note} className="mt-4 text-xs leading-5 text-slate-500"><CircleHelp className="mr-1 inline h-3.5 w-3.5 text-blue-300" />{note}</p>)}</div></section></div>
      <section className="mt-10"><SectionHeading eyebrow="04 / Activity" title="Recent wallet activity" action="last 10 indexed" /><div className="glass overflow-hidden rounded-xl">{data.activity.length ? data.activity.map((item) => <div key={item.signature} className="flex flex-col gap-2 border-b border-slate-800/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between last:border-0"><div><p className="text-sm font-semibold text-slate-200">{item.type}</p><p className="text-xs text-slate-500">{item.description}</p></div><div className="flex items-center gap-3"><span className="mono text-[10px] text-slate-600">{date(item.timestamp)}</span><a href={`https://solscan.io/tx/${item.signature}`} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-blue-300"><ExternalLink className="h-3.5 w-3.5" /></a></div></div>) : <div className="p-5"><EmptyState title="Activity is not configured" text="Add SOLSCAN_API_KEY to load recent wallet transactions." /></div>}</div></section>
      <section id="providers" className="mt-12 border-t border-slate-800/70 pt-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="mono text-[10px] uppercase tracking-[.18em] text-slate-500">Wallet coverage</p><p className="mt-2 text-sm text-slate-400">Provider availability is shown directly so you know which signals are live.</p></div><ProviderPills providers={data.providers} /></div></section>
    </div></div>
  );
}

export default function App() {
  const [mode, setMode] = useState<'token' | 'wallet'>('token');
  const [input, setInput] = useState('');
  const [token, setToken] = useState<TokenAnalysis | null>(null);
  const [wallet, setWallet] = useState<WalletAnalysis | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const placeholder = mode === 'token' ? 'Paste token address or symbol' : 'Paste Solana wallet address';
  const activeData = useMemo(() => mode === 'token' ? token : wallet, [mode, token, wallet]);

  async function handleAnalyze(value = input) {
    const clean = value.trim();
    setError('');
    setLoading(true);
    try {
      if (mode === 'token') {
        setToken(await analyzeToken(clean || sampleToken));
        setWallet(null);
      } else {
        setWallet(await analyzeWallet(clean || sampleWallet));
        setToken(null);
      }
      window.setTimeout(() => document.getElementById('analysis')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The analysis could not be loaded.');
      if (!clean) {
        if (mode === 'token') setToken(null);
        else setWallet(null);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[#0b0e13] text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800/70 bg-[#0b0e13]/90 backdrop-blur-xl"><div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-10">
        <a href="/" className="flex items-center gap-3"><img src={dyorlyMark} alt="Dyorly" className="h-9 w-9 rounded-lg object-cover" /><span className="text-lg font-bold tracking-[-.04em]">dyorly<span className="text-lime-300">.</span></span></a>
        <nav className={`${mobileNav ? 'absolute left-4 right-4 top-[76px] flex' : 'hidden'} glass flex-col gap-1 rounded-xl p-2 md:static md:flex md:flex-row md:items-center md:gap-7 md:border-0 md:bg-transparent md:p-0 md:shadow-none`}>
          <button onClick={() => { setMode('token'); setMobileNav(false); }} className={`rounded-lg px-3 py-2 text-sm transition hover:bg-slate-800 hover:text-white ${mode === 'token' ? 'text-white' : 'text-slate-300'}`}>Token desk</button>
          <button onClick={() => { setMode('wallet'); setMobileNav(false); }} className={`rounded-lg px-3 py-2 text-sm transition hover:bg-slate-800 hover:text-white ${mode === 'wallet' ? 'text-white' : 'text-slate-300'}`}>Analyze wallet</button>
          <a href="#providers" className="rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white">Providers</a>
        </nav>
         <div className="flex items-center gap-2"><button onClick={() => setMobileNav(!mobileNav)} className="rounded-lg border border-slate-700 p-2 text-slate-300 md:hidden">{mobileNav ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button></div>
      </div></header>

      <main><section className="relative mx-auto max-w-[1440px] px-4 pb-12 pt-16 sm:px-6 sm:pt-20 lg:px-10 lg:pb-16"><div className="pointer-events-none absolute left-[10%] top-16 h-40 w-40 rounded-full bg-lime-300/5 blur-3xl" /><div className="relative grid items-end gap-10 lg:grid-cols-[1fr_480px]">
        <div className="entrance"><div className="mb-5 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-lime-300" /><span className="mono text-[10px] uppercase tracking-[.2em] text-slate-500">Solana onchain intelligence</span></div><h1 className="max-w-3xl text-4xl font-semibold leading-[1.04] tracking-[-.06em] text-white sm:text-6xl lg:text-[76px]">Dyor but smarter.<br /><span className="text-slate-500">See the signal first.</span></h1><p className="mt-6 max-w-xl text-base leading-7 text-slate-400 sm:text-lg">Dyorly reads markets, liquidity, holders, developer signals, and wallet behavior through the providers analysts already trust.</p></div>
        <div className="glass entrance entrance-delay-1 rounded-2xl p-4 sm:p-5"><div className="mb-3 flex items-center justify-between"><span className="mono text-[10px] uppercase tracking-[.16em] text-slate-500">{mode === 'token' ? 'Analyze a token' : 'Analyze a wallet'}</span><span className="flex items-center gap-1.5 text-[11px] text-lime-300"><span className="h-1.5 w-1.5 rounded-full bg-lime-300" /> Live desk</span></div><div className="flex gap-2"><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" /><input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && handleAnalyze()} className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950/50 pl-10 pr-3 font-mono text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-blue-300/80" placeholder={placeholder} /></div><button onClick={() => handleAnalyze()} disabled={loading} className="flex h-11 items-center gap-2 rounded-lg bg-blue-300 px-4 text-sm font-bold text-slate-950 transition hover:bg-blue-200 disabled:cursor-wait disabled:opacity-70">{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />} Analyze</button></div><div className="mt-3 flex items-center justify-between"><button onClick={() => { setInput(mode === 'token' ? sampleToken : sampleWallet); }} className="flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-slate-200"><Clipboard className="h-3.5 w-3.5" /> Use sample {mode}</button><button onClick={() => { setMode(mode === 'token' ? 'wallet' : 'token'); setInput(''); }} className="flex items-center gap-1.5 text-xs text-blue-300 transition hover:text-blue-200">{mode === 'token' ? 'Analyze wallet' : 'Analyze token'} <ArrowUpRight className="h-3.5 w-3.5" /></button></div></div>
      </div></section>
      {error && <div className="mx-auto max-w-[1440px] px-4 pb-8 sm:px-6 lg:px-10"><div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-200"><ArrowDownRight className="mr-2 inline h-4 w-4" />{error}</div></div>}
      {activeData ? mode === 'token' ? <TokenDesk data={token!} /> : <WalletDesk data={wallet!} /> : <div className="mx-auto max-w-[1440px] px-4 pb-14 sm:px-6 lg:px-10"><div className="glass rounded-2xl p-6 text-center sm:p-10"><WalletCards className="mx-auto h-7 w-7 text-blue-300" /><h2 className="mt-4 text-xl font-semibold text-white">Start with a live {mode} read</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">Paste an address above, or use the sample input to see the provider-backed analysis layout.</p></div></div>}
      </main>
      <footer className="border-t border-slate-800/70 bg-[#0b0e13]"><div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-10"><div className="flex items-center gap-3"><img src={dyorlyMark} alt="" className="h-7 w-7 rounded-md object-cover" /><span className="text-sm font-bold tracking-[-.03em]">dyorly<span className="text-lime-300">.</span></span><span className="ml-2 border-l border-slate-800 pl-3 text-xs text-slate-600">Dyor but smarter.</span></div><div className="flex items-center gap-5 text-xs text-slate-500"><a href="#providers" className="transition hover:text-slate-200">Provider status</a><a href="https://x.com" target="_blank" rel="noreferrer" className="transition hover:text-slate-200">X / Twitter</a><span className="mono text-[10px] text-slate-700">v1.0 live desk</span></div></div></footer>
    </div>
  );
}