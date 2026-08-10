'use strict';

// ─── Constants ───────────────────────────────────────────────────────────────
const SAMPLE_TOKEN = 'So11111111111111111111111111111111111111112';
const REFRESH_COOLDOWN_MS = 15000;

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
};

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
  if (!btn || !lbl) return;
  btn.disabled = loading;
  lbl.textContent = loading ? 'Reading…' : 'Analyze';
}

// ─── Bar renderers ────────────────────────────────────────────────────────────
function renderBars(sel, values, color = 'blue') {
  const el = $(sel);
  if (!el) return;
  el.innerHTML = values.map((h, i) =>
    `<i class="${i > values.length - 4 ? 'highlight' : ''} ${color}" style="height:${h}%"></i>`
  ).join('');
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

// ─── Venue list ───────────────────────────────────────────────────────────────
function renderVenues(venues = [], total = 0) {
  const el = $('[data-venues]');
  if (!el) return;
  el.innerHTML = venues.length ? venues.map((v) => {
    const w = total > 0 ? Math.max(3, Math.min(100, (v.liquidityUsd / total) * 100)) : 3;
    return `<div class="venue-row"><div><span>${escHtml(v.name)}</span><b>${money(v.liquidityUsd)}</b></div><div class="venue-track"><i style="width:${w}%"></i></div></div>`;
  }).join('') : '<p class="muted-copy">Liquidity detail unavailable.</p>';
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
      <small>${escHtml(h.balance)}</small>
    </div>`;
  }).join('') : empty;
}

// ─── Holders table ────────────────────────────────────────────────────────────
function renderHoldersTable(holders = []) {
  const el = $('[data-holders]');
  if (!el) return;
  if (!holders.length) {
    el.innerHTML = '<div class="empty-copy"><b>Holder data is not configured</b><span>Add Helius, Birdeye, or Solscan keys for concentration signals.</span></div>';
    return;
  }
  el.innerHTML = `
    <div class="holder-table-head">
      <span>#</span><span>Wallet</span><span>Balance</span><span>Share</span><span></span>
    </div>
    ${holders.slice(0, 10).map((h, i) => `
      <div class="holder-row">
        <span class="rank">${String(h.rank || i + 1).padStart(2, '0')}</span>
        <span class="mono address">${escHtml(shortAddr(h.address))}</span>
        <span class="mono balance">${escHtml(h.balance)}</span>
        <b>${escHtml(pct(h.percentage))}</b>
        <span class="row-actions">
          <button class="icon-action" data-copy-addr="${escHtml(h.address)}" title="Copy wallet address">${IC.copy}</button>
          <a class="icon-action" href="https://solscan.io/account/${escHtml(h.address)}" target="_blank" rel="noreferrer" title="View on Solscan">${IC.ext}</a>
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
        </span>
      </div>`;
    }).join('')}
  `;
  bindCopyButtons(el);
}

// ─── Early buyers table ───────────────────────────────────────────────────────
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
        <span class="row-actions">
          <button class="icon-action" data-copy-addr="${escHtml(b.address)}" title="Copy wallet">${IC.copy}</button>
          <a class="icon-action" href="${escHtml(b.solscanUrl)}" target="_blank" rel="noreferrer" title="Solscan wallet">${IC.ext}</a>
          ${b.solscanTxUrl ? `<a class="icon-action" href="${escHtml(b.solscanTxUrl)}" target="_blank" rel="noreferrer" title="View transaction">${IC.clock}</a>` : ''}
        </span>
      </div>
    `).join('')}
  `;
  bindCopyButtons(el);
}

// ─── DEX intelligence block ───────────────────────────────────────────────────
function renderDexIntel(data) {
  const el = $('[data-dex-intel]');
  if (!el) return;
  const { monitoring, dexBoosts, token } = data;

  const hasPaid = monitoring.paidOrders;
  const hasBoost = dexBoosts && dexBoosts.active > 0;
  const orderTypes = (monitoring.paidOrderTypes || []).filter(Boolean);

  el.innerHTML = `
    <article class="dex-intel-card ${hasPaid ? 'active' : ''}">
      <div class="dex-intel-icon ${hasPaid ? 'lime-bg' : ''}">${IC.paid}</div>
      <div>
        <span class="metric-label">DEX Paid</span>
        <strong>${hasPaid ? 'Active order' : 'No order found'}</strong>
        ${orderTypes.length ? `<span class="metric-detail">${escHtml(orderTypes.join(', '))}</span>` : ''}
      </div>
      ${hasPaid ? `<span class="dex-badge lime-badge">LIVE</span>` : ''}
    </article>

    <article class="dex-intel-card ${hasBoost ? 'boost-active' : ''}">
      <div class="dex-intel-icon ${hasBoost ? 'lime-bg' : ''}">${IC.boost}</div>
      <div>
        <span class="metric-label">Active boosts</span>
        <strong>${hasBoost ? `${dexBoosts.active} active` : 'No boosts'}</strong>
        ${hasBoost && dexBoosts.totalAmount ? `<span class="metric-detail">${money(dexBoosts.totalAmount)} total spend</span>` : ''}
      </div>
      ${hasBoost ? `<span class="dex-badge orange-badge">BOOSTED</span>` : ''}
    </article>

    <article class="dex-intel-card">
      <div class="dex-intel-icon">${IC.shield}</div>
      <div>
        <span class="metric-label">DexScreener profile</span>
        <strong>${token.websites?.length ? 'Has website' : 'No profile link'}</strong>
        ${token.socials?.length ? `<span class="metric-detail">${token.socials.length} social link${token.socials.length !== 1 ? 's' : ''}</span>` : '<span class="metric-detail">No socials linked</span>'}
      </div>
      <div class="social-links" style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap;">
        ${(token.websites || []).slice(0, 1).map(u => `<a class="icon-action" href="${escHtml(safeUrl(u))}" target="_blank" rel="noreferrer" title="Website">${IC.ext}</a>`).join('')}
        ${(token.socials || []).slice(0, 3).map(s => `<a class="icon-action" href="${escHtml(safeUrl(s.url))}" target="_blank" rel="noreferrer" title="${escHtml(s.type)}">${IC.ext}</a>`).join('')}
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
let _candleSeries = null;
let _volSeries = null;
let _currentAddress = null;
let _currentChartType = '15m';

function destroyChart() {
  if (_chart) { try { _chart.remove(); } catch (_) {} _chart = null; _candleSeries = null; _volSeries = null; }
}

async function loadChart(address, type = '15m') {
  const container = $('[data-chart-container]');
  const loading = $('[data-chart-loading]');
  if (!container) return;

  if (loading) loading.hidden = false;
  _currentChartType = type;

  // Update tab state
  $$('[data-chart-tabs] .chart-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.type === type);
  });

  try {
    const res = await fetch(`/api/chart?${new URLSearchParams({ address, type })}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Chart unavailable (${res.status})`);
    const body = await res.json();
    const items = body.items ?? [];

    if (!items.length) throw new Error('No chart data returned for this interval.');

    // Build/rebuild chart
    destroyChart();

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
      upColor: '#c1f56e',
      downColor: '#ff7777',
      borderUpColor: '#c1f56e',
      borderDownColor: '#ff7777',
      wickUpColor: '#c1f56e',
      wickDownColor: '#ff7777',
      priceFormat: { type: 'price', precision: 8, minMove: 0.000000001 },
    });

    const volSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      scaleMarginTop: 0.85,
      scaleMarginBottom: 0,
    });

    const candleData = items.map((d) => ({ time: d.unixTime, open: d.o, high: d.h, low: d.l, close: d.c }));
    const volData = items.map((d) => ({
      time: d.unixTime,
      value: d.v,
      color: d.c >= d.o ? 'rgba(193,245,110,0.25)' : 'rgba(255,119,119,0.25)',
    }));

    candleSeries.setData(candleData);
    volSeries.setData(volData);
    chart.timeScale().fitContent();

    _chart = chart;
    _candleSeries = candleSeries;
    _volSeries = volSeries;

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (_chart) _chart.applyOptions({ width: container.clientWidth });
    });
    ro.observe(container);

    if (loading) loading.hidden = true;
  } catch (err) {
    if (loading) loading.hidden = true;
    const errDiv = document.createElement('div');
    errDiv.className = 'chart-error';
    errDiv.innerHTML = `${IC.warn}<span>${escHtml(err.message || 'Chart unavailable')}</span>`;
    // Remove previous error if any
    const prev = container.querySelector('.chart-error');
    if (prev) prev.remove();
    container.appendChild(errDiv);
  }
}

function setupChartTabs(address) {
  $$('[data-chart-tabs] .chart-tab').forEach((tab) => {
    tab.addEventListener('click', () => loadChart(address, tab.dataset.type));
  });
}

// ─── Bubble map ───────────────────────────────────────────────────────────────
function renderBubbleMap(address) {
  const section = $('[data-bubble-section]');
  const iframe = $('[data-bubble-iframe]');
  const bmmLink = $('[data-bubblemaps-link]');
  const beLink = $('[data-birdeye-bubble]');
  if (!section || !iframe) return;

  const bmUrl = `https://app.bubblemaps.io/sol/token/${encodeURIComponent(address)}`;
  const beUrl = `https://birdeye.so/token/${encodeURIComponent(address)}?chain=solana#holders`;

  if (bmmLink) { bmmLink.href = bmUrl; bmmLink.hidden = false; }
  if (beLink) { beLink.href = beUrl; beLink.hidden = false; }

  // Lazy-load iframe on intersect
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      iframe.src = `${bmUrl}?theme=dark`;
      observer.disconnect();
    }
  }, { rootMargin: '200px' });
  observer.observe(section);
  section.hidden = false;
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

function setupRefreshButton() {
  const btn = $('[data-refresh]');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (!_lastAnalyzedValue) return;
    const now = Date.now();
    if (now < _refreshCooldownEnd) return;
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

// ─── Main render ──────────────────────────────────────────────────────────────
function renderAnalysis(data) {
  const { token, liquidity, holders, topTraders, earlyBuyers, developer, monitoring, dexBoosts } = data;
  const analysis = $('[data-analysis]');
  if (!analysis) return;
  analysis.hidden = false;

  // Heading
  setText('[data-token-name]', `${token.name} / ${token.symbol}`);
  setText('[data-token-address]', shortAddr(data.address));
  setHref('[data-token-solscan]', `https://solscan.io/token/${data.address}`);
  setHref('[data-pair-link]', token.pairUrl);

  const avatar = $('[data-token-avatar]');
  if (avatar) {
    avatar.innerHTML = token.logo
      ? `<img src="${escHtml(safeUrl(token.logo))}" alt="" onerror="this.parentElement.textContent='${escHtml(token.symbol.slice(0, 1))}';">`
      : escHtml(token.symbol.slice(0, 1));
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

  // Birdeye chart link
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

  // Developer
  setText('[data-developer-address]', developer.address ? shortAddr(developer.address) : 'Not returned by provider');
  setText('[data-developer-risk]', `${developer.risk.toUpperCase()} RISK`);
  setText('[data-authority-share]', pct(developer.balancePercentage));
  setText('[data-developer-source]', developer.source);

  // Holder concentration
  setText('[data-holder-total]', holders.totalKnown ? `${count(holders.totalKnown)} total holders` : 'provider snapshot');
  setText('[data-top-ten]', holders.top10Percentage === null ? 'not calculated' : `top ${Math.min(holders.top.length, 10)} · ${holders.top10Percentage.toFixed(1)}%`);
  renderHolderBars(holders.top);

  // Holders table
  renderHoldersTable(holders.top);

  // Top traders
  renderTraders(topTraders || []);

  // Early buyers
  renderEarlyBuyers(earlyBuyers || []);

  // Warnings & monitoring
  setText('[data-monitoring-coverage]', monitoring.paidOrders === null ? 'limited coverage' : 'live checks');
  setText('[data-paid-orders]', monitoring.paidOrders === null ? '—' : monitoring.paidOrders ? 'Paid order active' : 'No paid order found');
  setText('[data-boosts]', monitoring.boosts === null ? '—' : monitoring.boosts > 0 ? `${monitoring.boosts} active` : 'None');
  renderWarnings(monitoring.warnings);

  // Paid order type tags
  const paidTypesEl = $('[data-paid-order-types]');
  if (paidTypesEl) {
    const types = (monitoring.paidOrderTypes || []).filter(Boolean);
    paidTypesEl.innerHTML = types.length
      ? types.map((t) => `<span class="order-type-tag">${escHtml(t)}</span>`).join('')
      : '';
  }

  // Provider pills
  renderProviders(data.providers);

  // Chart
  _currentAddress = data.address;
  setupChartTabs(data.address);
  loadChart(data.address, _currentChartType);

  // Bubble map
  renderBubbleMap(data.address);

  // Scroll into view
  analysis.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Start cooldown
  startRefreshCooldown();
}

// ─── API call ─────────────────────────────────────────────────────────────────
async function analyzeToken(value) {
  hideError();
  setLoading(true);
  _lastAnalyzedValue = value;
  try {
    const res = await fetch(`/api/token?${new URLSearchParams({ address: value.trim() || SAMPLE_TOKEN })}`, {
      headers: { Accept: 'application/json' },
    });
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) throw new Error(`The analysis service returned a non-JSON response (${res.status}).`);
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'The token analysis could not be loaded.');
    renderAnalysis(body);
  } catch (err) {
    showError(err instanceof Error ? err.message : 'The token analysis could not be loaded.');
  } finally {
    setLoading(false);
  }
}

// ─── Navigation ───────────────────────────────────────────────────────────────
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

// ─── Auth modal ───────────────────────────────────────────────────────────────
function setupAuth() {
  const modal = $('[data-auth-modal]');
  if (!modal) return;
  let mode = 'signin';
  const update = () => {
    const su = mode === 'signup';
    $('[data-auth-title]', modal).textContent = su ? 'Create your account' : 'Welcome back';
    $('[data-auth-copy]', modal).textContent = su ? 'Save watchlists and return to your research desk.' : 'Sign in to save watchlists and return to your research desk.';
    $('[data-name-field]', modal).hidden = !su;
    $('[data-auth-submit]', modal).innerHTML = su ? `Create account ${IC.ext}` : `Sign in ${IC.ext}`;
    $('[data-auth-switch-copy]', modal).textContent = su ? 'Already have an account?' : 'New to Dyorly?';
    $('[data-auth-switch]', modal).textContent = su ? 'Sign in' : 'Register';
  };
  const open = (nextMode) => {
    mode = nextMode;
    update();
    modal.hidden = false;
    document.body.classList.add('modal-open');
    $('[data-auth-note]', modal).hidden = true;
  };
  $$('[data-auth]').forEach((btn) => btn.addEventListener('click', () => open(btn.dataset.auth || 'signin')));
  $('[data-close-auth]', modal)?.addEventListener('click', () => { modal.hidden = true; document.body.classList.remove('modal-open'); });
  $('[data-auth-switch]', modal)?.addEventListener('click', () => { mode = mode === 'signin' ? 'signup' : 'signin'; update(); });
  $('[data-auth-form]', modal)?.addEventListener('submit', (e) => { e.preventDefault(); $('[data-auth-note]', modal).hidden = false; });
  modal.addEventListener('click', (e) => { if (e.target === modal) { modal.hidden = true; document.body.classList.remove('modal-open'); } });
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupAuth();
  setupRefreshButton();

  $('[data-dismiss-error]')?.addEventListener('click', hideError);

  $('[data-sample]')?.addEventListener('click', () => {
    const input = $('#asset-input');
    if (input) { input.value = SAMPLE_TOKEN; input.focus(); }
  });

  $('[data-token-form]')?.addEventListener('submit', (e) => {
    e.preventDefault();
    analyzeToken($('#asset-input')?.value || '');
  });

  $('[data-copy]')?.addEventListener('click', async () => {
    const addrEl = $('[data-token-address]');
    if (addrEl?.textContent) await copyToClipboard(addrEl.textContent.replace('…', ''));
  });

  // Scroll to #analyze if hash is set
  if (location.hash === '#analyze') setTimeout(() => $('#analyze')?.scrollIntoView(), 100);
});
