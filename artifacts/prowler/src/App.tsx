import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { useMemo, useState } from 'react';
import {
  Activity, ArrowDownRight, ArrowUpRight, BarChart3, Bell, Check, ChevronDown, CircleHelp,
  Clipboard, Copy, ExternalLink, Eye, FileSearch, Github, Globe2, Layers3, Link2,
  LockKeyhole, Menu, MessageCircle, Search, ShieldCheck, Sparkles, Star, UserRound,
  WalletCards, X, Zap
} from 'lucide-react';
import dyorlyMark from '@assets/file_0000000040a081f4851c23f8be803d8e_1786063019040.png';

const queryClient = new QueryClient();

type MetricProps = { label: string; value: string; change?: string; negative?: boolean; detail?: string };

function Metric({ label, value, change, negative, detail }: MetricProps) {
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

function Sparkline({ down = false }: { down?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 160 42" className={`h-10 w-full ${down ? 'text-red' : 'text-lime'}`}>
      <path d={down ? 'M0 10 C15 13, 20 28, 33 23 S48 14, 62 27 S82 18, 97 28 S119 27, 132 36 S150 30, 160 38' : 'M0 36 C15 32, 20 35, 33 22 S49 31, 62 17 S78 21, 91 13 S109 22, 124 10 S145 15, 160 4'} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MiniBar({ label, value, percent, color = 'lime' }: { label: string; value: string; percent: number; color?: 'lime' | 'blue' | 'red' }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs"><span className="text-slate-400">{label}</span><span className={`mono ${color === 'lime' ? 'text-lime' : color === 'red' ? 'text-red' : 'text-blue'}`}>{value}</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800"><div className={`h-full rounded-full ${color === 'lime' ? 'bg-lime-400' : color === 'red' ? 'bg-red-400' : 'bg-blue-400'}`} style={{ width: `${percent}%` }} /></div>
    </div>
  );
}

function AuthPanel({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="glass entrance w-full max-w-[420px] rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div><div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-lime-300"><LockKeyhole className="h-5 w-5 text-slate-950" /></div><h2 className="text-xl font-semibold text-white">{mode === 'signin' ? 'Welcome back' : 'Create your Dyorly account'}</h2><p className="mt-1 text-sm text-slate-400">Dyor but smarter. Keep your signals close with private watchlists.</p></div>
          <button data-testid="button-close-auth" onClick={onClose} className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-6 space-y-3">
          {mode === 'register' && <input data-testid="input-name" className="h-11 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm outline-none placeholder:text-slate-600 focus:border-blue-300" placeholder="Your name" />}
          <input data-testid="input-email" type="email" className="h-11 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm outline-none placeholder:text-slate-600 focus:border-blue-300" placeholder="Email address" />
          <input data-testid="input-password" type="password" className="h-11 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm outline-none placeholder:text-slate-600 focus:border-blue-300" placeholder="Password" />
          <button data-testid="button-auth-submit" onClick={onClose} className="flex h-11 w-full items-center justify-center rounded-lg bg-blue-300 text-sm font-bold text-slate-950 transition hover:bg-blue-200">{mode === 'signin' ? 'Sign in' : 'Create account'} <ArrowUpRight className="ml-2 h-4 w-4" /></button>
        </div>
        <p className="mt-5 text-center text-xs text-slate-500">{mode === 'signin' ? 'New to Dyorly?' : 'Already have an account?'} <button data-testid="button-toggle-auth-mode" onClick={() => setMode(mode === 'signin' ? 'register' : 'signin')} className="font-semibold text-blue-300 hover:text-blue-200">{mode === 'signin' ? 'Register' : 'Sign in'}</button></p>
      </div>
    </div>
  );
}

function ComingSoon({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="glass entrance w-full max-w-[420px] rounded-2xl p-6">
        <div className="flex justify-between"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-300"><WalletCards className="h-5 w-5 text-slate-950" /></div><button data-testid="button-close-wallet" onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button></div>
        <p className="mono mt-6 text-[10px] uppercase tracking-[.18em] text-blue-300">On the way</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Wallet intelligence is coming soon.</h2>
         <p className="mt-3 text-sm leading-6 text-slate-400">Dyorly is teaching its signals to read wallet behavior next. Save your address and we’ll let you know when the desk is open.</p>
        <input data-testid="input-wallet-notify" className="mt-5 h-11 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 font-mono text-xs outline-none placeholder:text-slate-600 focus:border-blue-300" placeholder="Paste wallet address" />
        <button data-testid="button-wallet-notify" onClick={onClose} className="mt-3 h-11 w-full rounded-lg border border-blue-300/40 bg-blue-300/10 text-sm font-bold text-blue-200 transition hover:bg-blue-300/20">Notify me when ready</button>
      </div>
    </div>
  );
}

function AppHome() {
  const [address, setAddress] = useState('');
  const [analyzedAddress, setAnalyzedAddress] = useState('9z3m...k4Qp');
  const [isAnalyzed, setIsAnalyzed] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const sampleAddress = '9z3m...k4Qp';
  const displayAddress = useMemo(() => analyzedAddress || sampleAddress, [analyzedAddress]);
  const handleAnalyze = () => {
    if (address.trim()) setAnalyzedAddress(address.trim().length > 18 ? `${address.trim().slice(0, 6)}...${address.trim().slice(-4)}` : address.trim());
    else setAnalyzedAddress(sampleAddress);
    setIsAnalyzed(true);
  };
  const copyAddress = async () => {
    await navigator.clipboard?.writeText('9z3mV4Zq8uJ8kQp8Yp4wZ8Jr2G6mYx6Pq3L7wQ4n');
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[#0b0e13] text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800/70 bg-[#0b0e13]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-10">
          <a href="/" className="flex items-center gap-3" data-testid="link-logo">
             <img src={dyorlyMark} alt="Dyorly" className="h-9 w-9 rounded-lg object-cover" /><span className="text-lg font-bold tracking-[-.04em]">dyorly<span className="text-lime-300">.</span></span>
          </a>
          <nav className={`${mobileNav ? 'absolute left-4 right-4 top-[76px] flex' : 'hidden'} glass flex-col gap-1 rounded-xl p-2 md:static md:flex md:flex-row md:items-center md:gap-7 md:border-0 md:bg-transparent md:p-0 md:shadow-none`} data-testid="nav-main">
            <a href="#analysis" className="rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white">Token desk</a>
            <button data-testid="button-wallet-nav" onClick={() => setWalletOpen(true)} className="rounded-lg px-3 py-2 text-left text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white">Analyze wallet <span className="ml-1 text-[10px] text-blue-300">SOON</span></button>
            <a href="#providers" className="rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white">Providers</a>
          </nav>
          <div className="flex items-center gap-2">
            <button data-testid="button-watchlist-header" onClick={() => setAuthOpen(true)} className="hidden items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-white sm:flex"><Star className="h-4 w-4 text-lime-300" /> Watchlist</button>
            <button data-testid="button-signin-header" onClick={() => setAuthOpen(true)} className="hidden rounded-lg bg-blue-300 px-3.5 py-2 text-sm font-bold text-slate-950 transition hover:bg-blue-200 sm:block">Sign in</button>
            <button data-testid="button-mobile-menu" onClick={() => setMobileNav(!mobileNav)} className="rounded-lg border border-slate-700 p-2 text-slate-300 md:hidden">{mobileNav ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative mx-auto max-w-[1440px] px-4 pb-12 pt-16 sm:px-6 sm:pt-20 lg:px-10 lg:pb-16">
          <div className="pointer-events-none absolute left-[10%] top-16 h-40 w-40 rounded-full bg-lime-300/5 blur-3xl" />
          <div className="relative grid items-end gap-10 lg:grid-cols-[1fr_480px]">
            <div className="entrance">
              <div className="mb-5 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-lime-300" /><span className="mono text-[10px] uppercase tracking-[.2em] text-slate-500">Solana token intelligence</span></div>
               <h1 className="max-w-3xl text-4xl font-semibold leading-[1.04] tracking-[-.06em] text-white sm:text-6xl lg:text-[76px]">Dyor but smarter.<br /><span className="text-slate-500">See the signal first.</span></h1>
               <p className="mt-6 max-w-xl text-base leading-7 text-slate-400 sm:text-lg">Dyorly reads a token’s market, liquidity, holders, developer behavior, and wallet relationships in seconds.</p>
            </div>
            <div className="glass entrance entrance-delay-1 rounded-2xl p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between"><span className="mono text-[10px] uppercase tracking-[.16em] text-slate-500">Analyze a token</span><span className="flex items-center gap-1.5 text-[11px] text-lime-300"><span className="h-1.5 w-1.5 rounded-full bg-lime-300" /> Live desk</span></div>
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" /><input data-testid="input-token-search" value={address} onChange={(e) => setAddress(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()} className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950/50 pl-10 pr-3 font-mono text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-blue-300/80" placeholder="Paste token address or symbol" /></div>
                <button data-testid="button-analyze-token" onClick={handleAnalyze} className="flex h-11 items-center gap-2 rounded-lg bg-blue-300 px-4 text-sm font-bold text-slate-950 transition hover:bg-blue-200"><Zap className="h-4 w-4" /> Analyze</button>
              </div>
              <div className="mt-3 flex items-center justify-between"><button data-testid="button-paste-token" onClick={() => setAddress('9z3mV4Zq8uJ8kQp8Yp4wZ8Jr2G6mYx6Pq3L7wQ4n')} className="flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-slate-200"><Clipboard className="h-3.5 w-3.5" /> Paste address</button><button data-testid="button-analyze-wallet" onClick={() => setWalletOpen(true)} className="flex items-center gap-1.5 text-xs text-blue-300 transition hover:text-blue-200">Analyze wallet <ArrowUpRight className="h-3.5 w-3.5" /></button></div>
            </div>
          </div>
        </section>

        {isAnalyzed && <div id="analysis" className="border-t border-slate-800/70 bg-[#0d1118]">
          <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
            <div className="entrance entrance-delay-2 mb-8 flex flex-col justify-between gap-4 border-b border-slate-800/70 pb-7 sm:flex-row sm:items-end">
              <div><div className="flex items-center gap-2"><span className="rounded-md border border-lime-300/20 bg-lime-300/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-lime-300">Analyzed</span><span className="mono text-[10px] text-slate-600">just now</span></div><div className="mt-3 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-300 text-sm font-bold text-slate-950">S</div><div><h2 data-testid="text-token-name" className="text-2xl font-semibold tracking-[-.04em] text-white">Solace <span className="text-slate-500">/ SOLC</span></h2><div className="mt-1 flex items-center gap-2"><span data-testid="text-token-address" className="mono text-[11px] text-slate-500">{displayAddress}</span><button data-testid="button-copy-address" onClick={copyAddress} className="text-slate-500 transition hover:text-blue-300">{copied ? <Check className="h-3.5 w-3.5 text-lime-300" /> : <Copy className="h-3.5 w-3.5" />}</button><a data-testid="link-token-explorer" href="https://solscan.io" target="_blank" rel="noreferrer" className="text-slate-500 transition hover:text-blue-300"><ExternalLink className="h-3.5 w-3.5" /></a></div></div></div></div>
              <div className="flex gap-2"><button data-testid="button-add-watchlist" onClick={() => setAuthOpen(true)} className="flex items-center gap-2 rounded-lg border border-slate-700 px-3.5 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-lime-300/50 hover:text-lime-300"><Star className="h-4 w-4" /> Add to watchlist</button><button data-testid="button-share-token" onClick={copyAddress} className="rounded-lg border border-slate-700 p-2.5 text-slate-400 transition hover:border-slate-500 hover:text-white"><Link2 className="h-4 w-4" /></button></div>
            </div>

            <section className="entrance entrance-delay-2"><SectionHeading eyebrow="01 / Market read" title="Token overview" action="Solana mainnet" /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="glass rounded-xl p-4 sm:col-span-2"><div className="flex items-start justify-between"><Metric label="Price" value="$0.0847" change="+12.84%" /><span className="rounded-lg bg-lime-300/10 p-2 text-lime-300"><BarChart3 className="h-4 w-4" /></span></div><div className="mt-6"><Sparkline /></div><div className="mt-2 flex justify-between text-[10px] text-slate-600"><span>24h ago</span><span>now</span></div></div>
              <div className="glass rounded-xl p-4"><Metric label="Market cap" value="$8.42M" change="+9.2%" detail="Rank #1,284" /><div className="mt-7 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full w-[62%] rounded-full bg-blue-300" /></div><p className="mt-2 text-[11px] text-slate-500">62% of liquidity threshold</p></div>
              <div className="glass rounded-xl p-4"><Metric label="24h volume" value="$1.18M" change="+34.6%" detail="Volume / MCap 14.0%" /><div className="mt-5 flex h-10 items-end gap-1">{[20,34,28,52,45,62,54,76,62,92,80,100].map((height, i) => <div key={i} className="flex-1 rounded-t-sm bg-blue-300/70" style={{ height: `${height}%` }} />)}</div></div>
            </div></section>

            <div className="mt-10 grid gap-10 lg:grid-cols-[1.18fr_.82fr]">
              <section className="entrance entrance-delay-3"><SectionHeading eyebrow="02 / Market structure" title="Liquidity & DEX status" action="4 venues tracked" /><div className="grid gap-3 sm:grid-cols-2"><div className="glass rounded-xl p-4"><Metric label="Total liquidity" value="$612.4K" change="+18.1%" detail="Depth at ±2% · $31.4K" /><div className="mt-5 space-y-3"><MiniBar label="Raydium" value="$401.2K" percent={76} /><MiniBar label="Orca" value="$129.8K" percent={42} color="blue" /><MiniBar label="Meteora" value="$81.4K" percent={27} color="blue" /></div></div><div className="glass rounded-xl p-4"><div className="flex items-center justify-between"><p className="text-[11px] uppercase tracking-[.13em] text-slate-500">DEX health</p><ShieldCheck className="h-4 w-4 text-lime-300" /></div><div className="mt-3 flex items-center gap-3"><span className="text-3xl font-semibold text-lime-300">92</span><span className="text-sm text-slate-400">/ 100<br /><span className="text-lime-300">Healthy</span></span></div><div className="mt-5 space-y-3"><MiniBar label="Pool age" value="41 days" percent={82} /><MiniBar label="LP locked" value="78.4%" percent={78} color="blue" /></div></div></div></section>
              <section className="entrance entrance-delay-3"><SectionHeading eyebrow="03 / Flow" title="Trading activity" action="last 24 hours" /><div className="glass rounded-xl p-4"><div className="grid grid-cols-2 gap-y-6"><Metric label="Buys" value="3,842" change="+18.7%" /><Metric label="Sells" value="2,116" negative change="-4.3%" /><Metric label="Buy / sell ratio" value="1.82" detail="buyers in control" /><Metric label="Unique traders" value="2,407" change="+11.2%" /></div><div className="mt-7 flex h-3 overflow-hidden rounded-full bg-red-400/50"><div className="h-full w-[64%] bg-lime-300" /><div className="h-full flex-1 bg-red-400/70" /></div><div className="mt-2 flex justify-between text-[11px]"><span className="text-lime-300">64% buy volume</span><span className="text-red">36% sell volume</span></div></div></section>
            </div>

            <div className="mt-10 grid gap-10 lg:grid-cols-[.9fr_1.1fr]">
              <section className="entrance entrance-delay-4"><SectionHeading eyebrow="04 / People behind it" title="Developer intelligence" /><div className="glass rounded-xl p-4"><div className="flex items-center justify-between border-b border-slate-800 pb-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800"><Github className="h-4 w-4 text-slate-300" /></div><div><p className="text-sm font-semibold text-slate-200">Developer wallet</p><p className="mono text-[10px] text-slate-500">7mQx...8aP2</p></div></div><span className="rounded-md bg-lime-300/10 px-2 py-1 text-[10px] font-bold text-lime-300">LOW RISK</span></div><div className="grid grid-cols-2 gap-5 py-5"><Metric label="Wallet age" value="2y 4m" /><Metric label="Tokens launched" value="8" /><Metric label="Creator balance" value="3.8%" negative detail="of supply" /><Metric label="Sell pressure" value="Low" change="-72%" /></div><div className="rounded-lg border border-lime-300/15 bg-lime-300/5 p-3 text-xs leading-5 text-slate-400"><Check className="mr-1.5 inline h-3.5 w-3.5 text-lime-300" /> No linked rugs detected across 8 previous launches. Creator has not sold since launch.</div></div></section>
              <section className="entrance entrance-delay-4"><SectionHeading eyebrow="05 / Early conviction" title="First ten buyers" action="launch window · 00:14:32" /><div className="glass overflow-hidden rounded-xl"><div className="grid grid-cols-[38px_1fr_100px_90px] border-b border-slate-800 px-4 py-3 text-[10px] uppercase tracking-[.14em] text-slate-600"><span>#</span><span>Wallet</span><span>Entry</span><span className="text-right">Status</span></div>{[['01','8yK...pQ2','$1,804','Holding'],['02','5cP...aL9','$934','Holding'],['03','Bv7...mN4','$712','Partial'],['04','3kD...rT8','$405','Holding'],['05','9xQ...vC1','$280','Exited']].map(([rank, wallet, entry, status]) => <div data-testid={`row-first-buyer-${rank}`} key={rank} className="grid grid-cols-[38px_1fr_100px_90px] items-center border-b border-slate-800/70 px-4 py-3 text-xs last:border-0"><span className="mono text-slate-600">{rank}</span><span className="mono text-slate-300">{wallet}</span><span className="mono text-slate-400">{entry}</span><span className={`text-right ${status === 'Exited' ? 'text-red' : status === 'Partial' ? 'text-blue' : 'text-lime'}`}>{status}</span></div>)}</div></section>
            </div>

            <div className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_.9fr]">
              <section className="entrance"><SectionHeading eyebrow="06 / Wallet graph" title="Relationship detection" action="signal map" /><div className="glass relative min-h-[290px] overflow-hidden rounded-xl p-5"><div className="relative flex h-[250px] items-center justify-center"><div className="absolute left-[12%] top-[20%] h-px w-[76%] rotate-[12deg] bg-blue-300/30" /><div className="absolute left-[16%] top-[61%] h-px w-[67%] rotate-[-15deg] bg-lime-300/30" /><div className="absolute left-[30%] top-[48%] h-px w-[42%] rotate-[2deg] bg-blue-300/30" /><div className="absolute left-[17%] top-[30%] h-3 w-3 rounded-full bg-lime-300 shadow-[0_0_0_5px_rgba(190,242,100,.12)]" /><div className="absolute left-[28%] top-[68%] h-2.5 w-2.5 rounded-full bg-blue-300" /><div className="absolute left-[58%] top-[26%] h-2.5 w-2.5 rounded-full bg-blue-300" /><div className="absolute right-[17%] top-[59%] h-2.5 w-2.5 rounded-full bg-red-400" /><div className="z-10 flex h-20 w-20 flex-col items-center justify-center rounded-full border border-lime-300/70 bg-lime-300/15 text-center shadow-[0_0_0_10px_rgba(190,242,100,.05)]"><span className="text-lg font-bold text-lime-300">SOLC</span><span className="mono text-[8px] text-lime-300/70">TOKEN</span></div><span className="absolute bottom-0 left-0 text-[11px] text-slate-500"><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-lime-300" />direct relation · 3 wallets</span></div></div></section>
              <section className="entrance"><SectionHeading eyebrow="07 / Concentration" title="Top holders" action="top 10 · 31.8%" /><div className="glass rounded-xl p-4"><div className="space-y-4">{[['Liquidity pool','38.6%','locked','lime'],['7xK...pQ2','7.4%','1,248,293 SOLC','blue'],['9aM...qT7','5.1%','858,044 SOLC','blue'],['Treasury / unknown','3.7%','621,008 SOLC','red']].map(([wallet, pct, bal, color], i) => <div data-testid={`row-holder-${i}`} key={wallet}><div className="mb-1.5 flex items-center justify-between text-xs"><span className="text-slate-300">{wallet}</span><span className={`mono ${color === 'lime' ? 'text-lime' : color === 'red' ? 'text-red' : 'text-blue'}`}>{pct}</span></div><div className="h-1.5 rounded-full bg-slate-800"><div className={`h-full rounded-full ${color === 'lime' ? 'bg-lime-300' : color === 'red' ? 'bg-red-400' : 'bg-blue-300'}`} style={{ width: pct }} /></div><p className="mt-1 text-[10px] text-slate-600">{bal}</p></div>)}</div></div></section>
            </div>

             <section id="providers" className="mt-12 border-t border-slate-800/70 pt-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="mono text-[10px] uppercase tracking-[.18em] text-slate-500">Signals, not guesses</p><p className="mt-2 text-sm text-slate-400">Dyorly cross-checks market data across the providers analysts already trust.</p></div><div className="flex flex-wrap gap-2">{['Birdeye','Solscan','DexScreener','Helius'].map((provider) => <span key={provider} className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs font-semibold text-slate-400"><Globe2 className="h-3.5 w-3.5 text-slate-600" />{provider}</span>)}</div></div></section>
          </div>
        </div>}
      </main>

      <footer className="border-t border-slate-800/70 bg-[#0b0e13]"><div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-10"><div className="flex items-center gap-3"><img src={dyorlyMark} alt="" className="h-7 w-7 rounded-md object-cover" /><span className="text-sm font-bold tracking-[-.03em]">dyorly<span className="text-lime-300">.</span></span><span className="ml-2 border-l border-slate-800 pl-3 text-xs text-slate-600">Dyor but smarter.</span></div><div className="flex items-center gap-5 text-xs text-slate-500"><button data-testid="button-footer-help" onClick={() => setWalletOpen(true)} className="transition hover:text-slate-200">Help center</button><a href="https://x.com" target="_blank" rel="noreferrer" data-testid="link-footer-x" className="transition hover:text-slate-200">X / Twitter</a><span className="mono text-[10px] text-slate-700">v0.9.2 beta</span></div></div></footer>
      {authOpen && <AuthPanel onClose={() => setAuthOpen(false)} />}
      {walletOpen && <ComingSoon onClose={() => setWalletOpen(false)} />}
    </div>
  );
}

function Router() {
  return <Switch><Route path="/" component={AppHome} /><Route component={NotFound} /></Switch>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;