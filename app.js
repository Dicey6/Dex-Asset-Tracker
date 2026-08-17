'use strict';

// ─── Constants ───────────────────────────────────────────────────────────────
const SAMPLE_TOKEN = 'So11111111111111111111111111111111111111112';
const REFRESH_COOLDOWN_MS = 15000;
const RECENT_SCANS_KEY = 'dyorly.recentScans';

// ─── DOM helpers ─────────────────────────────────────────────────────────────
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ─── Icons (inline SVG strings) ──────────────────────────────────────────────
const IC = {
  check:   `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  warn:    `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  copy:    `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`,
  ext:     `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>`,
  boost:   `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  paid:    `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
  shield:  `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  user:    `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  clock:   `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  // Brand icons for social links
  globe:   `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>`,
  twitter: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
  telegram:`<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>`,
  discord: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.79 19.79 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/></svg>`,
  sol:     `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h13l3-3H7zM4 17h13l3 3H7zM7 12h13l-3-3H4z"/></svg>`,
};

function socialIcon(type) {
  const t = String(type || '').toLowerCase();
  if (t.includes('twitter') || t === 'x') return IC.twitter;
  if (t.includes('telegram')) return IC.telegram;
  if (t.includes('discord')) return IC.discord;
  return IC.globe;
}

function socialLabel(type) {
  const t = String(type || '').toLowerCase();
  if (t.includes('twitter') || t === 'x') return 'X / Twitter';
  if (t.includes('telegram')) return 'Telegram';
  if (t.includes('discord')) return 'Discord';
  return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Link';
}

// ─── Formatters ───────────────────────────────────────────────────────────────
function escHtml(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
}

function safeUrl(v) {
  try {
    const u = new URL(v);
    return /^https?:$/.test(u.protocol) ? u.href : '#';
  } catch { return '#'; }
}

function shortAddr(addr) {
  return addr && addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr || '—';
}

function money(v, compact = true) {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 2 : 6,
  }).format(Number(v));
}

function moneyPrice(v) {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return '—';
  const n = Number(v);
  if (n === 0) return '$0';
  if (n < 0.000001) return `$${n.toExponential(4)}`;
  if (n < 0.001) return `$${n.toFixed(8)}`;
  if (n < 1) return `$${n.toFixed(6)}`;
  return money(n, false);
}

function count(v) {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return '—';
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(Number(v));
}

function pct(v, showSign = true) {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return '—';
  const n = Number(v);
  return `${showSign && n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function relativeTime(unixSec) {
  if (!unixSec) return '—';
  const delta = Math.floor(Date.now() / 1000) - unixSec;
  if (delta < 60) return `${delta}s ago`;
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
}

function isoDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function pnlClass(v) {
  if (v === null || v === undefined) return '';
  return Number(v) >= 0 ? 'lime' : 'red';
}

// ─── DOM setters ──────────────────────────────────────────────────────────────
function setText(sel, val) {
  const el = $(sel);
  if (el) el.textContent = val ?? '—';
}

function setHref(sel, val) {
  const el = $(sel);
  if (!el) return;
  const url = safeUrl(val);
  el.href = url;
  el.hidden = url === '#';
}

function copyToClipboard(text) {
  if (navigator.clipboard) return navigator.clipboard.writeText(text).catch(() => {});
  return Promise.resolve();
}

// ─── Error / loading ──────────────────────────────────────────────────────────
function showError(msg) {
  const wrap = $('[data-error]');
  const text = $('[data-error-text]');
  if (!wrap || !text) return;
  text.textContent = msg;
  wrap.hidden = false;
  wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideError() {
  const wrap = $('[data-error]');
  if (wrap) wrap.hidden = true;
}

function setLoading(loading) {
  const btn = $('.analyze-button');
  const lbl = $('[data-analyze-label]');
  if (btn) btn.disabled = loading;
  if (lbl) lbl.textContent = loading ? 'Reading…' : 'Analyze';
  const pageLoading = $('[data-page-loading]');
  if (pageLoading) pageLoading.hidden = !loading;
}

// ─── Market prices strip (CoinGecko public, no key needed) ──────────────────
async function loadMarketStrip() {
  const el = $('[data-market-items]');
  if (!el) return;
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana,bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true', { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('prices unavailable');
    const body = await res.json();
    const rows = [
      { label: 'SOL', data: body.solana },
      { label: 'BTC', data: body.bitcoin },
      { label: 'ETH', data: body.ethereum },
    ].filter((r) => r.data && Number.isFinite(r.data.usd));
    if (!rows.length) throw new Error('prices unavailable');
    el.innerHTML = rows.map((r) => {
      const change = r.data.usd_24h_change;
      const cls = Number(change) >= 0 ? 'lime' : 'red';
      return `<span class="market-item mono"><b>${escHtml(r.label)}</b> ${money(r.data.usd, false).replace(/\.\d+$/, (m) => m.slice(0, 3))} <i class="${cls}">${escHtml(pct(change))}</i></span>`;
    }).join('');
  } catch {
    el.innerHTML = '<span class="market-item mono muted">Live prices unavailable right now.</span>';
  }
}

// ─── Recent scans (localStorage) ─────────────────────────────────────────────
function getRecentScans() {
  try { return JSON.parse(localStorage.getItem(RECENT_SCANS_KEY) || '[]'); } catch { return []; }
}

function saveRecentScan(entry) {
  try {
    const scans = getRecentScans().filter((s) => s.address !== entry.address);
    scans.unshift(entry);
    localStorage.setItem(RECENT_SCANS_KEY, JSON.stringify(scans.slice(0, 6)));
  } catch { /* storage unavailable */ }
}

function renderRecentScans() {
  const wrap = $('[data-recent-scans]');
  const list = $('[data-recent-scan-list]');
  if (!wrap || !list) return;
  const scans = getRecentScans();
  if (!scans.length) return;
  wrap.hidden = false;
  list.innerHTML = scans.map((s) => `
    <a class="recent-scan-chip" href="/token.html?address=${encodeURIComponent(s.address)}">
      <b>${escHtml(s.symbol || '?')}</b>
      <span class="mono">${escHtml(shortAddr(s.address))}</span>
      ${IC.ext}
    </a>
  `).join('');
}

// ─── Provider pills ───────────────────────────────────────────────────────────
function renderProviders(providers = []) {
  const el = $('[data-providers]');
  if (!el) return;
  el.innerHTML = providers.map((p) => {
    const state = p.available ? 'available' : p.configured ? 'failed' : 'missing';
    return `<span class="provider-pill ${state}" title="${escHtml(p.message || '')}"><i></i>${escHtml(p.name)}</span>`;
  }).join('');
}

// ─── Bars / venues ───────────────────────────────────────────────────────────
function renderBars(sel, values, color = 'blue') {
  const el = $(sel);
  if (!el) return;
  el.innerHTML = values.map((h, i) =>
    `<i class="${i > values.length - 4 ? 'highlight' : ''} ${color}" style="height:${h}%"></i>`
  ).join('');
}

function renderVenues(venues = [], total = 0) {
  const el = $('[data-venues]');
  if (!el) return;
  el.innerHTML = venues.length ? venues.map((v) => {
    const w = total > 0 ? Math.max(3, Math.min(100, (v.liquidityUsd / total) * 100)) : 3;
    return `<div class="venue-row"><div><span>${escHtml(v.name)}</span><b>${money(v.liquidityUsd)}</b></div><div class="venue-track"><i style="width:${w}%"></i></div></div>`;
  }).join('') : '<p class="muted-copy">Liquidity detail unavailable.</p>';
}

// ─── Position badge (wallet status for holders / buyers) ────────────────────
// Accepts either a position object ({ status }) or a bare status string.
function positionBadge(position) {
  const status = typeof position === 'string' ? position : position ? position.status : null;
  if (!status) return '<span class="pos-badge position-badge unknown">No data</span>';
  const map = {
    holding: ['holding', 'Holding'],
    increased: ['holding', 'Added more'],
    partial: ['partial', 'Trimmed'],
    sold: ['sold', 'Sold out'],
    unknown: ['unknown', 'Unknown'],
  };
  const [cls, label] = map[status] || map.unknown;
  return `<span class="pos-badge position-badge ${cls}">${label}</span>`;
}

// ─── Top holders (concentration bars) ────────────────────────────────────────
function renderHolderBars(holders = []) {
  const el = $('[data-holder-bars]');
  if (!el) return;
  const empty = '<div class="empty-copy"><b>Holder data unavailable</b><span>Add Helius, Birdeye, or Solscan keys for concentration signals.</span></div>';
  el.innerHTML = holders.length ? holders.slice(0, 4).map((h, i) => {
    const cls = i === 0 ? 'lime' : i === 3 ? 'red' : 'blue';
    const w = Math.min(100, Math.max(2, h.percentage || 2));
    return `<div class="holder-bar">
      <div>
        <span class="mono">${escHtml(shortAddr(h.address))}</span>
        <b class="${cls}">${escHtml(pct(h.percentage))}</b>
      </div>
      <div class="bar-track"><i class="${cls}" style="width:${w}%"></i></div>
      <small>${escHtml(h.balance)}${h.valueUsd !== null && h.valueUsd !== undefined ? ` · ${money(h.valueUsd)}` : ''}</small>
    </div>`;
  }).join('') : empty;
}

// ─── Holders table (with live wallet value + status) ─────────────────────────
function renderHoldersTable(holders = []) {
  const el = $('[data-holders]');
  if (!el) return;
  if (!holders.length) {
    el.innerHTML = '<div class="empty-copy"><b>Holder data is not configured</b><span>Add Helius, Birdeye, or Solscan keys for concentration signals.</span></div>';
    return;
  }
  el.innerHTML = `
    <div class="holder-table-head wide">
      <span>#</span><span>Wallet</span><span>Balance</span><span>Share</span><span>Value (USD)</span><span>Status</span><span></span>
    </div>
    ${holders.slice(0, 10).map((h, i) => `
      <div class="holder-row wide">
        <span class="rank">${String(h.rank || i + 1).padStart(2, '0')}</span>
        <span class="mono address">${escHtml(shortAddr(h.address))}</span>
        <span class="mono balance">${escHtml(h.balance)}</span>
        <b>${escHtml(pct(h.percentage))}</b>
        <span class="mono">${escHtml(money(h.valueUsd))}</span>
        ${positionBadge(h.position)}
        <span class="row-actions">
          <button class="icon-action" data-copy-addr="${escHtml(h.address)}" title="Copy wallet address">${IC.copy}</button>
          <a class="icon-action" href="https://solscan.io/account/${escHtml(h.address)}" target="_blank" rel="noreferrer" title="View on Solscan">${IC.ext}</a>
          <a class="icon-action" href="/wallet.html?address=${escHtml(h.address)}" title="Analyze this wallet">${IC.user}</a>
        </span>
      </div>
    `).join('')}
  `;
  bindCopyButtons(el);
}

// ─── Top traders table ────────────────────────────────────────────────────────
function renderTraders(traders = []) {
  const section = $('[data-traders-section]');
  const el = $('[data-traders]');
  if (!el) return;
  if (!traders.length) {
    if (section) section.hidden = true;
    return;
  }
  if (section) section.hidden = false;
  el.innerHTML = `
    <div class="trader-table-head">
      <span>Wallet</span>
      <span>Avg buy</span>
      <span>Buy vol</span>
      <span>Sell vol</span>
      <span>Realized PnL</span>
      <span>Unrealized PnL</span>
      <span></span>
    </div>
    ${traders.map((t) => {
      const rPnl = t.realizedPnl;
      const uPnl = t.unrealizedPnl;
      return `<div class="trader-row">
        <span class="mono address">${escHtml(shortAddr(t.address))}</span>
        <span class="mono">${escHtml(moneyPrice(t.avgBuyPrice))}</span>
        <span>${escHtml(money(t.buyVolume))}</span>
        <span>${escHtml(money(t.sellVolume))}</span>
        <b class="${pnlClass(rPnl)}">${escHtml(money(rPnl))}</b>
        <b class="${pnlClass(uPnl)}">${escHtml(money(uPnl))}</b>
        <span class="row-actions">
          <button class="icon-action" data-copy-addr="${escHtml(t.address)}" title="Copy wallet">${IC.copy}</button>
          <a class="icon-action" href="${escHtml(t.solscanUrl)}" target="_blank" rel="noreferrer" title="Solscan">${IC.ext}</a>
          <a class="icon-action" href="/wallet.html?address=${escHtml(t.address)}" title="Analyze this wallet">${IC.user}</a>
        </span>
      </div>`;
    }).join('')}
  `;
  bindCopyButtons(el);
}

// ─── Early buyers table (with live wallet position + PnL) ────────────────────
function renderEarlyBuyers(buyers = []) {
  const section = $('[data-early-section]');
  const el = $('[data-early-buyers]');
  if (!el) return;
  if (!buyers.length) {
    if (section) section.hidden = true;
    return;
  }
  if (section) section.hidden = false;
  el.innerHTML = `
    <div class="early-table-head">
      <span>#</span>
      <span>Wallet</span>
      <span>First bought</span>
      <span>Initial amount</span>
      <span>Status</span>
      <span>Holds now</span>
      <span>Value (USD)</span>
      <span>Realized PnL</span>
      <span>Unrealized PnL</span>
      <span></span>
    </div>
    ${buyers.map((b, i) => `
      <div class="early-row">
        <span class="rank">${String(i + 1).padStart(2, '0')}</span>
        <span class="mono address">${escHtml(shortAddr(b.address))}</span>
        <span class="mono time-cell">
          ${IC.clock}
          ${escHtml(b.firstBuyTimestamp ? relativeTime(b.firstBuyTimestamp) : '—')}
        </span>
        <span class="mono">${escHtml(b.initialAmountFormatted || '—')}</span>
        <span>${positionBadge(b.positionStatus ?? b.position)}</span>
        <span class="mono">${escHtml(b.currentBalanceFormatted || (b.position ? b.position.currentBalanceFormatted : '—') || '—')}${b.percentOfInitial !== null && b.percentOfInitial !== undefined ? ` <small class="muted-copy">(${escHtml(pct(Math.min(b.percentOfInitial, 999), false))} of buy)</small>` : ''}</span>
        <span class="mono">${escHtml(b.position ? money(b.position.currentValueUsd) : '—')}</span>
        <b class="${pnlClass(b.realizedPnl)}">${escHtml(money(b.realizedPnl))}</b>
        <b class="${pnlClass(b.unrealizedPnl)}">${escHtml(money(b.unrealizedPnl))}</b>
        <span class="row-actions">
          <button class="icon-action" data-copy-addr="${escHtml(b.address)}" title="Copy wallet">${IC.copy}</button>
          <a class="icon-action" href="${escHtml(b.solscanUrl)}" target="_blank" rel="noreferrer" title="Solscan wallet">${IC.ext}</a>
          ${b.solscanTxUrl ? `<a class="icon-action" href="${escHtml(b.solscanTxUrl)}" target="_blank" rel="noreferrer" title="View transaction">${IC.clock}</a>` : ''}
          <a class="icon-action" href="/wallet.html?address=${escHtml(b.address)}" title="Analyze this wallet">${IC.user}</a>
        </span>
      </div>
    `).join('')}
  `;
  bindCopyButtons(el);
}

// ─── Social links with brand logos ───────────────────────────────────────────
function renderSocials(token) {
  const el = $('[data-token-socials]');
  if (!el) return;
  const links = [
    ...(token.websites || []).map((u) => ({ type: 'website', url: u })),
    ...(token.socials || []),
  ].filter((l) => l.url && safeUrl(l.url) !== '#');
  el.innerHTML = links.length
    ? links.slice(0, 6).map((l) => `
        <a class="social-chip" href="${escHtml(safeUrl(l.url))}" target="_blank" rel="noreferrer">
          ${socialIcon(l.type)}
          <span>${escHtml(socialLabel(l.type))}</span>
        </a>
      `).join('')
    : '<span class="social-chip muted">No official links published</span>';
}

// ─── DEX intelligence block ───────────────────────────────────────────────────
function renderDexIntel(data) {
  const el = $('[data-dex-intel]');
  if (!el) return;
  const { monitoring, dexBoosts, token } = data;

  const paidStatus = monitoring.paidStatus || (monitoring.paidOrders === null ? 'unknown' : monitoring.paidOrders ? 'paid' : 'not_paid');
  const hasPaid = paidStatus === 'paid';
  const hasBoost = dexBoosts && dexBoosts.active > 0;
  const orderTypes = (monitoring.paidOrderTypes || []).filter(Boolean);
  const paidLabel = { paid: 'Paid profile', pending: 'Paid order pending', not_paid: 'No paid order found', unknown: 'Status unavailable' }[paidStatus];

  el.innerHTML = `
    <article class="dex-intel-card ${hasPaid ? 'active' : ''}">
      <div class="dex-intel-icon ${hasPaid ? 'lime-bg' : ''}">${IC.paid}</div>
      <div>
        <span class="metric-label">DEX Paid</span>
        <strong>${paidLabel}</strong>
        ${orderTypes.length ? `<span class="metric-detail">${escHtml(orderTypes.join(', '))}</span>` : `<span class="metric-detail">${paidStatus === 'unknown' ? 'Could not reach DexScreener orders' : 'Checked against DexScreener orders'}</span>`}
      </div>
      ${hasPaid ? `<span class="dex-badge lime-badge">PAID</span>` : paidStatus === 'pending' ? `<span class="dex-badge orange-badge">PENDING</span>` : ''}
    </article>

    <article class="dex-intel-card ${hasBoost ? 'boost-active' : ''}">
      <div class="dex-intel-icon ${hasBoost ? 'lime-bg' : ''}">${IC.boost}</div>
      <div>
        <span class="metric-label">Active boosts</span>
        <strong>${hasBoost ? `${dexBoosts.active} active` : 'No boosts'}</strong>
        ${hasBoost && dexBoosts.totalAmount ? `<span class="metric-detail">${money(dexBoosts.totalAmount)} total spend</span>` : '<span class="metric-detail">Checked across every indexed pair</span>'}
      </div>
      ${hasBoost ? `<span class="dex-badge orange-badge">BOOSTED</span>` : ''}
    </article>

    <article class="dex-intel-card">
      <div class="dex-intel-icon">${IC.shield}</div>
      <div>
        <span class="metric-label">Official links</span>
        <strong>${(token.websites?.length || token.socials?.length) ? 'Profile published' : 'No links found'}</strong>
        <div class="social-links-inline">
          ${(token.websites || []).slice(0, 2).map((u) => `<a class="social-chip small" href="${escHtml(safeUrl(u))}" target="_blank" rel="noreferrer">${IC.globe}<span>Website</span></a>`).join('')}
          ${(token.socials || []).slice(0, 4).map((s) => `<a class="social-chip small" href="${escHtml(safeUrl(s.url))}" target="_blank" rel="noreferrer">${socialIcon(s.type)}<span>${escHtml(socialLabel(s.type))}</span></a>`).join('')}
        </div>
      </div>
    </article>
  `;
}

// ─── Warnings ─────────────────────────────────────────────────────────────────
function renderWarnings(warnings = []) {
  const el = $('[data-warnings]');
  if (!el) return;
  el.innerHTML = warnings.length
    ? warnings.slice(0, 4).map((w) => `<p class="warning-line">${IC.warn}${escHtml(w)}</p>`).join('')
    : `<p class="success-line">${IC.check} No provider warnings.</p>`;
}

// ─── Chart ────────────────────────────────────────────────────────────────────
let _chart = null;
let _currentChartType = '15m';

function destroyChart() {
  if (_chart) { try { _chart.remove(); } catch (_) {} _chart = null; }
}

async function loadChart(address, type = '15m') {
  const container = $('[data-chart-container]');
  const loading = $('[data-chart-loading]');
  if (!container || typeof LightweightCharts === 'undefined') return;

  if (loading) loading.hidden = false;
  _currentChartType = type;

  $$('[data-chart-tabs] .chart-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.type === type);
  });

  try {
    const res = await fetch(`/api/chart?${new URLSearchParams({ address, type })}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Chart unavailable (${res.status})`);
    const body = await res.json();
    const items = body.items ?? [];
    if (!items.length) throw new Error('No chart data returned for this interval.');

    destroyChart();
    const prevErr = container.querySelector('.chart-error');
    if (prevErr) prevErr.remove();

    const chart = LightweightCharts.createChart(container, {
      width: container.clientWidth,
      height: 340,
      layout: { background: { color: 'transparent' }, textColor: '#9aa6b5' },
      grid: { vertLines: { color: 'rgba(149,170,194,0.07)' }, horzLines: { color: 'rgba(149,170,194,0.07)' } },
      timeScale: { borderColor: 'rgba(149,170,194,0.18)', timeVisible: true, secondsVisible: false },
      rightPriceScale: { borderColor: 'rgba(149,170,194,0.18)', scaleMarginTop: 0.08, scaleMarginBottom: 0.25 },
      crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { mouseWheel: true, pinch: true },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#c1f56e', downColor: '#ff7777',
      borderUpColor: '#c1f56e', borderDownColor: '#ff7777',
      wickUpColor: '#c1f56e', wickDownColor: '#ff7777',
      priceFormat: { type: 'price', precision: 8, minMove: 0.000000001 },
    });
    const volSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      scaleMarginTop: 0.85,
      scaleMarginBottom: 0,
    });

    candleSeries.setData(items.map((d) => ({ time: d.unixTime, open: d.o, high: d.h, low: d.l, close: d.c })));
    volSeries.setData(items.map((d) => ({
      time: d.unixTime,
      value: d.v,
      color: d.c >= d.o ? 'rgba(193,245,110,0.25)' : 'rgba(255,119,119,0.25)',
    })));
    chart.timeScale().fitContent();
    _chart = chart;

    const ro = new ResizeObserver(() => {
      if (_chart) _chart.applyOptions({ width: container.clientWidth });
    });
    ro.observe(container);

    if (loading) loading.hidden = true;
  } catch (err) {
    if (loading) loading.hidden = true;
    const prev = container.querySelector('.chart-error');
    if (prev) prev.remove();
    const errDiv = document.createElement('div');
    errDiv.className = 'chart-error';
    errDiv.innerHTML = `${IC.warn}<span>${escHtml(err.message || 'Chart unavailable')}</span>`;
    container.appendChild(errDiv);
  }
}

function setupChartTabs(address) {
  $$('[data-chart-tabs] .chart-tab').forEach((tab) => {
    tab.onclick = () => loadChart(address, tab.dataset.type);
  });
}

// ─── Bubble map (self-rendered SVG — no blocked iframes) ─────────────────────
function renderBubbleMap(address, holders = []) {
  const section = $('[data-bubble-section]');
  const canvas = $('[data-bubble-canvas]');
  const bmmLink = $('[data-bubblemaps-link]');
  const beLink = $('[data-birdeye-bubble]');
  if (!section || !canvas) return;

  const bmUrl = `https://app.bubblemaps.io/sol/token/${encodeURIComponent(address)}`;
  const beUrl = `https://birdeye.so/token/${encodeURIComponent(address)}?chain=solana#holders`;
  if (bmmLink) { bmmLink.href = bmUrl; bmmLink.hidden = false; }
  if (beLink) { beLink.href = beUrl; beLink.hidden = false; }
  section.hidden = false;

  const items = holders.filter((h) => h.percentage !== null && h.percentage > 0).slice(0, 10);
  if (!items.length) {
    canvas.innerHTML = '<div class="empty-copy"><b>No holder share data</b><span>Bubble view needs holder percentages from a configured provider.</span></div>';
    return;
  }

  const W = 720, H = 360;
  const maxPct = Math.max(...items.map((h) => h.percentage));
  const maxR = 78, minR = 18;
  const placed = [];

  items.forEach((h, i) => {
    const r = minR + (maxR - minR) * Math.sqrt(h.percentage / maxPct);
    // spiral placement avoiding overlap
    let x = W / 2, y = H / 2, angle = i * 2.39996, dist = 0;
    for (let attempt = 0; attempt < 400; attempt++) {
      x = W / 2 + Math.cos(angle) * dist;
      y = H / 2 + Math.sin(angle) * dist * 0.55;
      const clear = placed.every((p) => Math.hypot(p.x - x, p.y - y) >= p.r + r + 6);
      const inside = x - r > 4 && x + r < W - 4 && y - r > 4 && y + r < H - 4;
      if (clear && inside) break;
      angle += 0.35;
      dist += 2.2;
    }
    placed.push({ x, y, r, holder: h, index: i });
  });

  const colors = ['#c1f56e', '#7fb2ff', '#7fb2ff', '#ff7777', '#7fb2ff', '#a68cff', '#7fb2ff', '#5fd4c4', '#7fb2ff', '#f0b45a'];
  canvas.innerHTML = `
    <svg class="bubble-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Top holder bubble map">
      ${placed.map((p, i) => {
        const c = colors[i % colors.length];
        const showText = p.r > 26;
        return `
          <a href="https://solscan.io/account/${escHtml(p.holder.address)}" target="_blank" rel="noreferrer">
            <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${p.r.toFixed(1)}" fill="${c}18" stroke="${c}" stroke-width="1.5">
              <title>${escHtml(shortAddr(p.holder.address))} — ${escHtml(pct(p.holder.percentage, false))} of supply</title>
            </circle>
            ${showText ? `
              <text x="${p.x.toFixed(1)}" y="${(p.y - 3).toFixed(1)}" text-anchor="middle" class="bubble-pct" fill="${c}">${escHtml(pct(p.holder.percentage, false))}</text>
              <text x="${p.x.toFixed(1)}" y="${(p.y + 13).toFixed(1)}" text-anchor="middle" class="bubble-addr">${escHtml(shortAddr(p.holder.address))}</text>
            ` : ''}
          </a>`;
      }).join('')}
    </svg>`;
}

// ─── Copy row buttons ─────────────────────────────────────────────────────────
function bindCopyButtons(root = document) {
  root.querySelectorAll('[data-copy-addr]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const addr = btn.dataset.copyAddr;
      await copyToClipboard(addr);
      const orig = btn.innerHTML;
      btn.innerHTML = IC.check;
      btn.classList.add('copied');
      setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 1500);
    });
  });
}

// ─── Refresh ──────────────────────────────────────────────────────────────────
let _lastAnalyzedValue = '';
let _refreshCooldownEnd = 0;
let _refreshTimer = null;
let _supabase = null;
let _authSession = null;
let _currentTokenData = null;

function setupRefreshButton() {
  const btn = $('[data-refresh]');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (!_lastAnalyzedValue) return;
    if (Date.now() < _refreshCooldownEnd) return;
    analyzeToken(_lastAnalyzedValue);
  });
}

function startRefreshCooldown() {
  const btn = $('[data-refresh]');
  const lbl = $('[data-refresh-label]');
  if (!btn || !lbl) return;

  _refreshCooldownEnd = Date.now() + REFRESH_COOLDOWN_MS;
  btn.disabled = true;

  clearInterval(_refreshTimer);
  _refreshTimer = setInterval(() => {
    const remaining = Math.ceil((_refreshCooldownEnd - Date.now()) / 1000);
    if (remaining <= 0) {
      clearInterval(_refreshTimer);
      btn.disabled = false;
      lbl.textContent = 'Refresh';
      btn.classList.remove('cooling');
    } else {
      lbl.textContent = `${remaining}s`;
      btn.classList.add('cooling');
    }
  }, 250);
}

// ─── Token analysis render ────────────────────────────────────────────────────
function renderAnalysis(data) {
  const { token, liquidity, holders, topTraders, earlyBuyers, monitoring } = data;
  const analysis = $('[data-analysis]');
  if (!analysis) return;
  analysis.hidden = false;
  _currentTokenData = data;
  const watchButton = $('[data-watch-token]');
  if (watchButton) {
    watchButton.hidden = false;
    watchButton.textContent = 'Watch token';
  }

  // Heading
  setText('[data-token-name]', `${token.name} / ${token.symbol}`);
  setText('[data-token-address]', shortAddr(data.address));
  setHref('[data-token-solscan]', `https://solscan.io/token/${data.address}`);
  setHref('[data-pair-link]', token.pairUrl);
  renderSocials(token);

  const avatar = $('[data-token-avatar]');
  if (avatar) {
    avatar.textContent = token.symbol.slice(0, 1);
    const logoUrl = token.logo ? safeUrl(token.logo) : '#';
    if (logoUrl !== '#') {
      const img = document.createElement('img');
      img.alt = '';
      img.addEventListener('error', () => { avatar.textContent = token.symbol.slice(0, 1); });
      img.addEventListener('load', () => { avatar.textContent = ''; avatar.appendChild(img); });
      img.src = logoUrl;
    }
  }

  // Price & market
  setText('[data-price]', moneyPrice(token.priceUsd));
  const priceChange = $('[data-price-change]');
  if (priceChange) {
    priceChange.textContent = pct(token.priceChange24h);
    priceChange.className = `metric-change ${Number(token.priceChange24h) < 0 ? 'negative' : ''}`;
  }
  setText('[data-market-cap]', money(token.marketCap));
  setText('[data-fdv]', token.fdv ? `FDV ${money(token.fdv)}` : '—');
  setText('[data-volume]', money(token.volume24h));
  const swaps = (token.buys24h || 0) + (token.sells24h || 0);
  setText('[data-swaps]', swaps ? `${count(swaps)} tracked swaps` : 'Swap data unavailable');
  setText('[data-pair-date]', isoDate(token.pairCreatedAt));
  renderBars('[data-price-bars]', [28, 36, 31, 48, 44, 57, 52, 70, 61, 78, 74, 88]);
  renderBars('[data-volume-bars]', [20, 34, 28, 52, 45, 62, 54, 76, 62, 92, 80, 100], 'blue');

  const birdeyeChartLink = $('[data-birdeye-chart]');
  if (birdeyeChartLink) {
    birdeyeChartLink.href = `https://birdeye.so/token/${data.address}?chain=solana`;
    birdeyeChartLink.hidden = false;
  }

  // Liquidity
  setText('[data-liquidity]', money(liquidity.totalUsd));
  setText('[data-pair-count]', `${liquidity.pairCount} venue${liquidity.pairCount !== 1 ? 's' : ''} tracked`);
  setText('[data-health]', liquidity.totalUsd !== null ? 'LIVE' : '—');
  setText('[data-health-detail]', liquidity.totalUsd !== null ? 'Indexed' : 'Unavailable');
  setText('[data-lp-depth]', money(liquidity.totalUsd));
  setText('[data-lp-locked]', liquidity.locked === null ? 'Not reported' : pct(liquidity.locked, false));
  renderVenues(liquidity.venues, liquidity.totalUsd);

  // Flow
  const buyTotal = (token.buys24h || 0) + (token.sells24h || 0);
  const buyPercent = buyTotal ? ((token.buys24h || 0) / buyTotal) * 100 : 50;
  setText('[data-buys]', count(token.buys24h));
  setText('[data-sells]', count(token.sells24h));
  setText('[data-ratio]', token.buys24h !== null && token.sells24h ? (token.buys24h / token.sells24h).toFixed(2) : '—');
  const buyBar = $('[data-buy-bar]');
  if (buyBar) buyBar.style.width = `${buyPercent}%`;
  setText('[data-buy-caption]', token.buys24h === null ? 'Buy data unavailable' : `${buyPercent.toFixed(0)}% buy count`);
  setText('[data-sell-caption]', token.sells24h === null ? 'Sell data unavailable' : `${(100 - buyPercent).toFixed(0)}% sell count`);

  // DEX intel
  renderDexIntel(data);

  // Developer section removed per request — no longer rendered.

  // Holders
  setText('[data-holder-total]', holders.totalKnown ? `${count(holders.totalKnown)} total holders` : 'provider snapshot');
  setText('[data-top-ten]', holders.top10Percentage === null ? 'not calculated' : `top ${Math.min(holders.top.length, 10)} · ${holders.top10Percentage.toFixed(1)}%`);
  renderHolderBars(holders.top);
  renderHoldersTable(holders.top);

  // Traders + early buyers
  renderTraders(topTraders || []);
  renderEarlyBuyers(earlyBuyers || []);

  // Monitoring
  setText('[data-monitoring-coverage]', monitoring.paidOrders === null ? 'limited coverage' : 'live checks');
  setText('[data-paid-orders]', monitoring.paidOrders === null ? '—' : monitoring.paidOrders ? 'Paid order active' : 'No paid order found');
  setText('[data-boosts]', monitoring.boosts === null ? '—' : monitoring.boosts > 0 ? `${monitoring.boosts} active` : 'None');
  renderWarnings(monitoring.warnings);

  const paidTypesEl = $('[data-paid-order-types]');
  if (paidTypesEl) {
    const types = (monitoring.paidOrderTypes || []).filter(Boolean);
    paidTypesEl.innerHTML = types.length
      ? types.map((t) => `<span class="order-type-tag">${escHtml(t)}</span>`).join('')
      : '';
  }

  renderProviders(data.providers);

  // Chart + bubble map
  setupChartTabs(data.address);
  loadChart(data.address, _currentChartType);
  renderBubbleMap(data.address, holders.top);

  // Remember this scan for the homepage
  saveRecentScan({ address: data.address, name: token.name, symbol: token.symbol });

  startRefreshCooldown();
}

// ─── Token API call ───────────────────────────────────────────────────────────
async function analyzeToken(value) {
  hideError();
  setLoading(true);
  _lastAnalyzedValue = value;
  try {
    const target = value.trim() || SAMPLE_TOKEN;
    let body;
    if (window.DyorlyTokenClient) {
      body = await window.DyorlyTokenClient.analyze(target);
    } else {
      const res = await fetch(`/api/token?${new URLSearchParams({ address: target })}`, {
        headers: { Accept: 'application/json' },
      });
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) throw new Error(`The analysis service returned a non-JSON response (${res.status}).`);
      body = await res.json();
      if (!res.ok) throw new Error(body.error || 'The token analysis could not be loaded.');
    }
    renderAnalysis(body);
  } catch (err) {
    showError(err instanceof Error ? err.message : 'The token analysis could not be loaded.');
  } finally {
    setLoading(false);
  }
}

// ─── Wallet analysis ─────────────────────────────────────────────────────────
function renderWalletAnalysis(data) {
  const section = $('[data-wallet-analysis]');
  if (!section) return;
  section.hidden = false;

  setText('[data-wallet-title]', 'Wallet overview');
  setText('[data-wallet-address]', shortAddr(data.address));
  setHref('[data-wallet-solscan]', `https://solscan.io/account/${data.address}`);

  const { portfolio, holdings, activity, transfers = [], swaps = [], pnl, signals } = data;

  setText('[data-wallet-total]', money(portfolio.totalValueUsd));
  setText('[data-wallet-token-count]', `${portfolio.tokenCount} token${portfolio.tokenCount !== 1 ? 's' : ''} held${portfolio.nftCount ? ` · ${portfolio.nftCount} NFTs` : ''}`);
  setText('[data-wallet-sol]', portfolio.solBalance !== null ? `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(portfolio.solBalance)} SOL` : '—');
  setText('[data-wallet-sol-usd]', 'Native balance');
  setText('[data-wallet-risk]', signals.risk === 'unknown' ? '—' : signals.risk.toUpperCase());
  setText('[data-wallet-top-share]', signals.topHoldingPercentage !== null ? `Top holding is ${signals.topHoldingPercentage.toFixed(1)}% of portfolio` : 'Concentration not calculated');

  // Holdings table
  const holdingsEl = $('[data-wallet-holdings]');
  if (holdingsEl) {
    holdingsEl.innerHTML = holdings.length ? `
      <div class="holder-table-head wallet-holdings-head">
        <span>#</span><span>Token</span><span>Balance</span><span>Value (USD)</span><span>Share</span><span></span>
      </div>
      ${holdings.map((h, i) => {
        const share = portfolio.totalValueUsd && h.valueUsd !== null ? (h.valueUsd / portfolio.totalValueUsd) * 100 : null;
        return `<div class="holder-row wallet-holdings-row">
          <span class="rank">${String(i + 1).padStart(2, '0')}</span>
          <span class="token-cell">
            ${h.logo && safeUrl(h.logo) !== '#' ? `<img class="token-mini-logo" src="${escHtml(safeUrl(h.logo))}" alt="">` : ''}
            <b>${escHtml(h.symbol)}</b>
            <small>${escHtml(h.name)}</small>
          </span>
          <span class="mono">${h.balance !== null ? escHtml(count(h.balance)) : '—'}</span>
          <span class="mono">${escHtml(money(h.valueUsd))}</span>
          <b>${share !== null ? escHtml(pct(share, false)) : '—'}</b>
          <span class="row-actions">
            ${h.address ? `<button class="icon-action" data-copy-addr="${escHtml(h.address)}" title="Copy token address">${IC.copy}</button>
            <a class="icon-action" href="/token.html?address=${escHtml(h.address)}" title="Analyze this token">${IC.boost}</a>
            <a class="icon-action" href="https://solscan.io/token/${escHtml(h.address)}" target="_blank" rel="noreferrer" title="Solscan">${IC.ext}</a>` : ''}
          </span>
        </div>`;
      }).join('')}
    ` : '<div class="empty-copy"><b>No indexed holdings</b><span>No fungible token holdings were returned for this wallet.</span></div>';
    bindCopyButtons(holdingsEl);
  }

  // Activity
  const activityEl = $('[data-wallet-activity]');
  if (activityEl) {
    activityEl.innerHTML = activity.length ? activity.map((a) => `
      <div class="activity-row">
        <span class="activity-type">${escHtml(a.type)}</span>
        <span class="mono activity-desc">${escHtml(a.description.length > 60 ? `${a.description.slice(0, 60)}…` : a.description)}</span>
        <span class="mono time-cell">${IC.clock} ${escHtml(a.timestamp ? isoDate(a.timestamp) : '—')}</span>
        <span class="row-actions">
          <a class="icon-action" href="https://solscan.io/tx/${escHtml(a.signature)}" target="_blank" rel="noreferrer" title="View transaction">${IC.ext}</a>
        </span>
      </div>
    `).join('') : '<div class="empty-copy"><b>No recent activity</b><span>Transaction history needs a Solscan key or the wallet has no indexed activity.</span></div>';
  }

  const transfersEl = $('[data-wallet-transfers]');
  if (transfersEl) {
    transfersEl.innerHTML = transfers.length ? `
      <div class="holder-table-head wallet-flow-head"><span>Flow</span><span>Token</span><span>Amount</span><span>Counterparty</span><span>Time</span></div>
      ${transfers.slice(0, 12).map((transfer) => `
        <div class="holder-row wallet-flow-row">
          <b class="${transfer.direction === 'in' ? 'lime' : 'red'}">${transfer.direction === 'in' ? 'In' : 'Out'}</b>
          <span class="mono">${escHtml(shortAddr(transfer.tokenMint))}</span>
          <span class="mono">${transfer.amount !== null ? escHtml(count(transfer.amount)) : '—'}</span>
          <span class="mono">${escHtml(shortAddr(transfer.counterparty))}</span>
          <span class="mono time-cell">${escHtml(transfer.timestamp ? isoDate(transfer.timestamp) : '—')}</span>
        </div>
      `).join('')}
    ` : '<div class="empty-copy"><b>No indexed transfers</b><span>Transfers require enhanced transaction data from Helius.</span></div>';
  }

  const swapsEl = $('[data-wallet-swaps]');
  if (swapsEl) {
    swapsEl.innerHTML = swaps.length ? `
      <div class="holder-table-head wallet-swap-head"><span>Side</span><span>Token</span><span>Volume</span><span>Time</span><span></span></div>
      ${swaps.slice(0, 12).map((swap) => `
        <div class="holder-row wallet-swap-row">
          <b>${escHtml(swap.side || 'Swap')}</b>
          <span class="mono">${escHtml(swap.tokenSymbol || shortAddr(swap.tokenMint))}</span>
          <span class="mono">${escHtml(money(swap.volumeUsd))}</span>
          <span class="mono time-cell">${escHtml(swap.timestamp ? isoDate(swap.timestamp) : '—')}</span>
          <a class="icon-action" href="https://solscan.io/tx/${encodeURIComponent(swap.signature)}" target="_blank" rel="noreferrer" title="View swap">${IC.ext}</a>
        </div>
      `).join('')}
    ` : '<div class="empty-copy"><b>No indexed swaps</b><span>Swap history requires Birdeye trade data.</span></div>';
  }

  const pnlEl = $('[data-wallet-pnl]');
  if (pnlEl) {
    pnlEl.innerHTML = pnl ? `
      <div class="flow-grid wallet-pnl-grid">
        <div><span class="metric-label">Realized</span><strong class="${pnlClass(pnl.realizedUsd)}">${escHtml(money(pnl.realizedUsd))}</strong></div>
        <div><span class="metric-label">Unrealized</span><strong class="${pnlClass(pnl.unrealizedUsd)}">${escHtml(money(pnl.unrealizedUsd))}</strong></div>
        <div><span class="metric-label">Total</span><strong class="${pnlClass(pnl.totalUsd)}">${escHtml(money(pnl.totalUsd))}</strong></div>
      </div>
      <span class="metric-foot">${escHtml(pnl.source)} · no estimate when cost basis is unavailable</span>
    ` : '<div class="empty-copy"><b>PnL unavailable</b><span>No reliable cost basis was returned, so Dyorly does not invent a number.</span></div>';
  }

  // Notes
  const notesEl = $('[data-wallet-notes]');
  if (notesEl) {
    notesEl.innerHTML = signals.notes.length
      ? signals.notes.slice(0, 5).map((n) => `<p class="warning-line">${IC.warn}${escHtml(n)}</p>`).join('')
      : `<p class="success-line">${IC.check} Full provider coverage for this wallet.</p>`;
  }

  renderProviders(data.providers);
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function analyzeWallet(address) {
  hideError();
  setLoading(true);
  try {
    const res = await fetch(`/api/wallet?${new URLSearchParams({ address: address.trim() })}`, { headers: { Accept: 'application/json' } });
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) throw new Error(`The wallet service returned a non-JSON response (${res.status}).`);
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'The wallet analysis could not be loaded.');
    renderWalletAnalysis(body);
    persistWalletAnalysis(address);
  } catch (err) {
    showError(err instanceof Error ? err.message : 'The wallet analysis could not be loaded.');
  } finally {
    setLoading(false);
  }
}

// ─── Supabase session, auth, and watchlist (shared) ──────────────────────────
async function getSupabase() {
  if (_supabase) return _supabase;
  if (!window.supabase?.createClient) return null;
  const response = await fetch('/api/config', { headers: { Accept: 'application/json' } });
  const config = await response.json().catch(() => ({}));
  if (!config.url || !config.anonKey) return null;
  _supabase = window.supabase.createClient(config.url, config.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return _supabase;
}

function showAuthNote(message, isError = false) {
  const note = $('[data-auth-note]');
  if (!note) return;
  note.textContent = message;
  note.hidden = false;
  note.classList.toggle('error', isError);
}

function updateHeaderAuth() {
  $$('.signin-button').forEach((button) => {
    button.textContent = _authSession ? 'Sign out' : 'Sign in';
    button.dataset.auth = _authSession ? 'signout' : 'signin';
  });
}

async function initSupabase() {
  try {
    const client = await getSupabase();
    if (!client) return;
    const current = await client.auth.getSession();
    _authSession = current.data.session;
    updateHeaderAuth();
    client.auth.onAuthStateChange((_event, session) => {
      _authSession = session;
      updateHeaderAuth();
      if (session && location.hash.includes('type=recovery')) {
        window.__dyorlyOpenAuth?.('set-password');
      }
    });
    if (location.hash.includes('type=recovery')) {
      window.__dyorlyOpenAuth?.('set-password');
    }
  } catch {
    // The public site remains usable when Supabase has not been configured.
  }
}

function setupNavigation() {
  const toggle = $('[data-menu-toggle]');
  const nav = $('[data-mobile-nav]');
  toggle?.addEventListener('click', () => {
    const open = nav?.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(Boolean(open)));
  });
  $$('.mobile-nav a, .mobile-nav button').forEach((item) =>
    item.addEventListener('click', () => {
      nav?.classList.remove('open');
      toggle?.setAttribute('aria-expanded', 'false');
    })
  );
}

function setupAuth() {
  const modal = $('[data-auth-modal]');
  if (!modal) return;
  let mode = 'signin';
  const update = () => {
    const su = mode === 'signup';
    const reset = mode === 'reset';
    const recovery = mode === 'set-password';
    $('[data-auth-title]', modal).textContent = su ? 'Create your account' : recovery ? 'Choose a new password' : reset ? 'Reset your password' : 'Welcome back';
    $('[data-auth-copy]', modal).textContent = su
      ? 'Save watchlists and return to your research desk.'
      : recovery
        ? 'Choose a new password for your Dyorly account.'
        : reset
          ? 'Enter your email and we will send a secure reset link.'
          : 'Sign in to save watchlists and return to your research desk.';
    $('[data-name-field]', modal).hidden = !su;
    $('[data-email-field]', modal).hidden = recovery;
    $('[data-password-field]', modal).hidden = reset;
    $('[data-confirm-password-field]', modal).hidden = !recovery;
    $('input[type="email"]', modal).required = !recovery;
    $('input[type="password"]', $('[data-password-field]', modal))?.toggleAttribute('required', !reset);
    $('input[type="password"]', $('[data-confirm-password-field]', modal))?.toggleAttribute('required', recovery);
    $('[data-auth-submit]', modal).textContent = su ? 'Create account' : recovery ? 'Save password' : reset ? 'Send reset link' : 'Sign in';
    $('[data-auth-switch-copy]', modal).textContent = reset || recovery ? 'Remembered your password?' : su ? 'Already have an account?' : 'New to Dyorly?';
    $('[data-auth-switch]', modal).textContent = reset || recovery ? 'Sign in' : su ? 'Sign in' : 'Register';
    $('[data-forgot-password]', modal).hidden = su || reset || recovery;
  };
  const open = (nextMode = 'signin') => {
    mode = nextMode;
    update();
    modal.hidden = false;
    document.body.classList.add('modal-open');
    const note = $('[data-auth-note]', modal);
    note.hidden = true;
    note.textContent = '';
    $('[data-auth-form]', modal)?.reset();
  };
  window.__dyorlyOpenAuth = open;
  $$('[data-auth]').forEach((btn) => btn.addEventListener('click', async () => {
    if (btn.dataset.auth === 'signout') {
      const client = await getSupabase();
      if (client) await client.auth.signOut();
      return;
    }
    open(btn.dataset.auth || 'signin');
  }));
  $('[data-close-auth]', modal)?.addEventListener('click', () => { modal.hidden = true; document.body.classList.remove('modal-open'); });
  $('[data-auth-switch]', modal)?.addEventListener('click', () => {
    mode = mode === 'signin' ? 'signup' : 'signin';
    update();
  });
  $('[data-forgot-password]', modal)?.addEventListener('click', () => {
    mode = 'reset';
    update();
  });
  $('[data-auth-form]', modal)?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const client = await getSupabase();
    if (!client) {
      showAuthNote('Authentication is not configured. Add the Supabase public environment variables before using accounts.', true);
      return;
    }
    const form = event.currentTarget;
    const email = $('input[type="email"]', form)?.value.trim();
    const password = $('input[type="password"]', form)?.value || '';
    const confirm = $('[data-confirm-password-field] input', form)?.value || '';
    const username = $('[data-name-field] input', form)?.value.trim() || null;
    try {
      $('[data-auth-submit]', modal).disabled = true;
      if (mode === 'signup') {
        const result = await client.auth.signUp({
          email,
          password,
          options: { data: { username }, emailRedirectTo: window.location.origin + window.location.pathname },
        });
        if (result.error) throw result.error;
        showAuthNote(result.data.session ? 'Account created. Your watchlist is ready.' : 'Check your email to verify your account, then sign in.');
      } else if (mode === 'reset') {
        const result = await client.auth.resetPasswordForEmail(email, { redirectTo: window.location.href.split('#')[0] });
        if (result.error) throw result.error;
        showAuthNote('Reset link sent. Check your email to continue.');
      } else if (mode === 'set-password') {
        if (password.length < 6 || password !== confirm) throw new Error('Passwords must match and be at least 6 characters.');
        const result = await client.auth.updateUser({ password });
        if (result.error) throw result.error;
        showAuthNote('Password updated. You can keep using Dyorly.');
        history.replaceState({}, '', window.location.pathname + window.location.search);
      } else {
        const result = await client.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        modal.hidden = true;
        document.body.classList.remove('modal-open');
      }
    } catch (error) {
      showAuthNote(error instanceof Error ? error.message : 'Authentication failed. Try again.', true);
    } finally {
      $('[data-auth-submit]', modal).disabled = false;
    }
  });
  modal.addEventListener('click', (e) => { if (e.target === modal) { modal.hidden = true; document.body.classList.remove('modal-open'); } });
}

async function persistWalletAnalysis(address) {
  const client = await getSupabase();
  if (!_authSession || !client) return;
  client.functions.invoke('analyze-wallet', { body: { wallet_address: address } }).catch(() => {});
}

function showWatchlistNote(message, isError = false) {
  const note = $('[data-bot-link-note]');
  if (!note) return;
  note.textContent = message;
  note.hidden = false;
  note.classList.toggle('error', isError);
}

function renderWatchlist(items = [], profile = null) {
  const target = $('[data-watchlist-items]');
  if (!target) return;
  const codeNote = $('[data-bot-link-note]');
  if (codeNote) {
    codeNote.textContent = profile?.bot_link_code ? `Future bot link code: ${profile.bot_link_code}` : '';
    codeNote.hidden = !profile?.bot_link_code;
  }
  target.innerHTML = items.length ? items.map((item) => `
    <article class="watchlist-row" data-watch-id="${escHtml(item.id)}">
      <div class="watchlist-row-heading">
        <div><b>${escHtml(item.token_symbol || 'Token')}</b><small>${escHtml(item.token_name || shortAddr(item.token_mint))}</small></div>
        <button class="text-button red" type="button" data-remove-watch>Remove</button>
      </div>
      <span class="mono watchlist-mint">${escHtml(shortAddr(item.token_mint))} · watched at ${escHtml(money(item.market_cap_at_watch))}</span>
      <div class="watchlist-settings">
        <label><span>Alert up %</span><input type="number" min="0" step="1" value="${Number(item.alert_up_percent ?? 50)}" data-alert-up></label>
        <label><span>Alert down %</span><input type="number" min="0" step="1" value="${Number(item.alert_down_percent ?? 20)}" data-alert-down></label>
        <label class="watchlist-toggle"><input type="checkbox" ${item.alert_enabled ? 'checked' : ''} data-alert-enabled><span>Alerts enabled</span></label>
        <button class="button button-ghost button-sm" type="button" data-save-watch>Save</button>
      </div>
    </article>
  `).join('') : '<div class="empty-copy"><b>No watched tokens yet</b><span>Analyze a token and choose Watch token to save it here.</span></div>';
  target.querySelectorAll('[data-remove-watch]').forEach((button) => button.addEventListener('click', async () => {
    const row = button.closest('[data-watch-id]');
    const client = await getSupabase();
    if (!row || !client) return;
    const result = await client.from('watchlists').delete().eq('id', row.dataset.watchId);
    if (result.error) showWatchlistNote(result.error.message, true);
    else row.remove();
  }));
  target.querySelectorAll('[data-save-watch]').forEach((button) => button.addEventListener('click', async () => {
    const row = button.closest('[data-watch-id]');
    const client = await getSupabase();
    if (!row || !client) return;
    const payload = {
      alert_up_percent: Math.max(0, Number($('[data-alert-up]', row).value || 0)),
      alert_down_percent: Math.max(0, Number($('[data-alert-down]', row).value || 0)),
      alert_enabled: $('[data-alert-enabled]', row).checked,
    };
    const result = await client.from('watchlists').update(payload).eq('id', row.dataset.watchId);
    if (result.error) showWatchlistNote(result.error.message, true);
    else showWatchlistNote('Alert settings saved.');
  }));
}

async function loadWatchlist() {
  const client = await getSupabase();
  if (!client || !_authSession) return;
  const [watchlists, profile] = await Promise.all([
    client.from('watchlists').select('*').eq('is_active', true).order('created_at', { ascending: false }),
    client.from('profiles').select('bot_link_code').eq('id', _authSession.user.id).maybeSingle(),
  ]);
  if (watchlists.error) return showWatchlistNote(watchlists.error.message, true);
  renderWatchlist(watchlists.data || [], profile.data);
}

async function openWatchlist() {
  const client = await getSupabase();
  if (!_authSession && client) {
    const current = await client.auth.getSession();
    _authSession = current.data.session;
    updateHeaderAuth();
  }
  if (!_authSession) {
    window.__dyorlyOpenAuth?.('signin');
    return;
  }
  const modal = $('[data-watchlist-modal]');
  if (!modal) return;
  modal.hidden = false;
  document.body.classList.add('modal-open');
  await loadWatchlist();
}

async function watchCurrentToken() {
  if (!_currentTokenData) return;
  const client = await getSupabase();
  if (!_authSession && client) {
    const current = await client.auth.getSession();
    _authSession = current.data.session;
    updateHeaderAuth();
  }
  if (!_authSession) {
    window.__dyorlyOpenAuth?.('signin');
    return;
  }
  const button = $('[data-watch-token]');
  if (!client || !button) return;
  try {
    button.disabled = true;
    const result = await client.functions.invoke('watchlist-token', {
      body: {
        token_mint: _currentTokenData.address,
        alert_enabled: true,
        alert_up_percent: 50,
        alert_down_percent: 20,
      },
    });
    if (result.error) throw result.error;
    button.textContent = 'Watching ✓';
    await loadWatchlist();
  } catch (error) {
    showError(error instanceof Error ? error.message : 'The token could not be added to your watchlist.');
  } finally {
    button.disabled = false;
  }
}

function setupWatchlist() {
  $('[data-watch-token]')?.addEventListener('click', watchCurrentToken);
  $$('[data-watchlist-trigger]').forEach((button) => button.addEventListener('click', openWatchlist));
  const modal = $('[data-watchlist-modal]');
  if (!modal) return;
  $('[data-close-watchlist]', modal)?.addEventListener('click', () => {
    modal.hidden = true;
    document.body.classList.remove('modal-open');
  });
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.hidden = true;
      document.body.classList.remove('modal-open');
    }
  });
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupAuth();
  setupWatchlist();
  initSupabase();
  loadMarketStrip();

  $('[data-dismiss-error]')?.addEventListener('click', hideError);

  const isTokenPage = document.body.classList.contains('token-page');
  const isWalletPage = document.body.classList.contains('wallet-page');

  // ── Homepage: form redirects to the token page ──
  if (!isTokenPage && !isWalletPage) {
    renderRecentScans();
    $('[data-sample]')?.addEventListener('click', () => {
      const input = $('#asset-input');
      if (input) { input.value = SAMPLE_TOKEN; input.focus(); }
    });
    $('[data-token-form]')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = ($('#asset-input')?.value || '').trim() || SAMPLE_TOKEN;
      window.location.href = `/token.html?address=${encodeURIComponent(value)}`;
    });
  }

  // ── Token page: auto-analyze from ?address= ──
  if (isTokenPage) {
    setupRefreshButton();
    $('[data-token-form]')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = ($('#asset-input')?.value || '').trim();
      if (!value) return;
      const url = new URL(window.location.href);
      url.searchParams.set('address', value);
      window.history.replaceState({}, '', url);
      analyzeToken(value);
    });
    $('[data-copy]')?.addEventListener('click', async () => {
      if (_lastAnalyzedValue) await copyToClipboard(_lastAnalyzedValue);
    });

    const params = new URLSearchParams(window.location.search);
    const address = (params.get('address') || '').trim();
    if (address) {
      const input = $('#asset-input');
      if (input) input.value = address;
      analyzeToken(address);
    } else {
      showError('Paste a token address above to start the analysis.');
    }
  }

  // ── Wallet page ──
  if (isWalletPage) {
    $('[data-wallet-form]')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = ($('#wallet-input')?.value || '').trim();
      if (!value) return;
      const url = new URL(window.location.href);
      url.searchParams.set('address', value);
      window.history.replaceState({}, '', url);
      analyzeWallet(value);
    });
    $('[data-wallet-copy]')?.addEventListener('click', async () => {
      const params = new URLSearchParams(window.location.search);
      const addr = params.get('address');
      if (addr) await copyToClipboard(addr);
    });

    const params = new URLSearchParams(window.location.search);
    const address = (params.get('address') || '').trim();
    if (address) {
      const input = $('#wallet-input');
      if (input) input.value = address;
      analyzeWallet(address);
    }
  }
});
