const SAMPLE_TOKEN = 'So11111111111111111111111111111111111111112';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[character]));
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) ? url.href : '#';
  } catch {
    return '#';
  }
}

function shortAddress(address) {
  return address && address.length > 12 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address || '—';
}

function money(value, compact = true) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 2 : 4,
  }).format(Number(value));
}

function count(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(Number(value));
}

function percent(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  return `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(2)}%`;
}

function date(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function setText(selector, value) {
  const element = $(selector);
  if (element) element.textContent = value ?? '—';
}

function setHref(selector, value) {
  const element = $(selector);
  if (element) {
    const url = safeUrl(value);
    element.href = url;
    element.hidden = url === '#';
  }
}

function showError(message) {
  const wrap = $('[data-error]');
  const text = $('[data-error-text]');
  if (!wrap || !text) return;
  text.textContent = message;
  wrap.hidden = false;
  wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideError() {
  const wrap = $('[data-error]');
  if (wrap) wrap.hidden = true;
}

function setLoading(loading) {
  const button = $('.analyze-button');
  const label = $('[data-analyze-label]');
  if (!button || !label) return;
  button.disabled = loading;
  label.textContent = loading ? 'Reading…' : 'Analyze';
}

function renderBars(selector, values, color = 'blue') {
  const container = $(selector);
  if (!container) return;
  container.innerHTML = values.map((height, index) => `<i class="${index > values.length - 4 ? 'highlight' : ''} ${color}" style="height:${height}%"></i>`).join('');
}

function renderProviders(providers = []) {
  const container = $('[data-providers]');
  if (!container) return;
  container.innerHTML = providers.map((provider) => {
    const state = provider.available ? 'available' : provider.configured ? 'failed' : 'missing';
    return `<span class="provider-pill ${state}" title="${escapeHtml(provider.message || '')}"><i></i>${escapeHtml(provider.name)}</span>`;
  }).join('');
}

function renderVenues(venues = [], total = 0) {
  const container = $('[data-venues]');
  if (!container) return;
  container.innerHTML = venues.length ? venues.map((venue) => {
    const width = total > 0 ? Math.max(3, Math.min(100, (venue.liquidityUsd / total) * 100)) : 3;
    return `<div class="venue-row"><div><span>${escapeHtml(venue.name)}</span><b>${money(venue.liquidityUsd)}</b></div><div class="venue-track"><i style="width:${width}%"></i></div></div>`;
  }).join('') : '<p class="muted-copy">Liquidity detail unavailable.</p>';
}

function renderHolders(holders = []) {
  const list = $('[data-holders]');
  const bars = $('[data-holder-bars]');
  const renderEmpty = '<div class="empty-copy"><b>Holder data is not configured</b><span>Add Helius, Birdeye, or Solscan keys for concentration signals.</span></div>';
  if (list) list.innerHTML = holders.length ? holders.slice(0, 5).map((holder, index) => `<div class="holder-row"><span class="rank">${String(holder.rank || index + 1).padStart(2, '0')}</span><span class="mono address">${escapeHtml(shortAddress(holder.address))}</span><span class="mono balance">${escapeHtml(holder.balance)}</span><b>${escapeHtml(percent(holder.percentage))}</b></div>`).join('') : renderEmpty;
  if (bars) bars.innerHTML = holders.length ? holders.slice(0, 4).map((holder, index) => `<div class="holder-bar"><div><span>${escapeHtml(shortAddress(holder.address))}</span><b class="${index === 0 ? 'lime' : index === 3 ? 'red' : 'blue'}">${escapeHtml(percent(holder.percentage))}</b></div><div class="bar-track"><i class="${index === 0 ? 'lime' : index === 3 ? 'red' : 'blue'}" style="width:${Math.min(100, Math.max(2, holder.percentage || 2))}%"></i></div><small>${escapeHtml(holder.balance)}</small></div>`).join('') : renderEmpty;
}

function renderWarnings(warnings = []) {
  const container = $('[data-warnings]');
  if (!container) return;
  container.innerHTML = warnings.length
    ? warnings.slice(0, 3).map((warning) => `<p class="warning-line"><span>↘</span>${escapeHtml(warning)}</p>`).join('')
    : '<p class="success-line">✓ No provider warnings.</p>';
}

function renderEarlyWallets(wallets = []) {
  const section = $('[data-early-section]');
  const container = $('[data-early-wallets]');
  if (!section || !container) return;
  section.hidden = wallets.length === 0;
  if (!wallets.length) return;
  container.innerHTML = wallets.map((wallet, index) => `<div class="holder-row"><span class="rank">${String(index + 1).padStart(2, '0')}</span><span class="mono address">${escapeHtml(shortAddress(wallet.address))}</span><span class="mono balance">${escapeHtml(wallet.amount)}</span><b>${escapeHtml(wallet.status)}</b></div>`).join('');
}

function renderAnalysis(data) {
  const { token, liquidity, holders, developer, relationships, monitoring } = data;
  const analysis = $('[data-analysis]');
  if (!analysis) return;
  analysis.hidden = false;
  setText('[data-token-name]', `${token.name} / ${token.symbol}`);
  setText('[data-token-address]', shortAddress(data.address));
  setHref('[data-token-solscan]', `https://solscan.io/token/${data.address}`);
  setHref('[data-pair-link]', token.pairUrl);
  const avatar = $('[data-token-avatar]');
  if (avatar) {
    avatar.innerHTML = token.logo ? `<img src="${escapeHtml(safeUrl(token.logo))}" alt="">` : escapeHtml(token.symbol.slice(0, 1));
  }
  setText('[data-price]', money(token.priceUsd, false));
  const priceChange = $('[data-price-change]');
  if (priceChange) {
    priceChange.textContent = percent(token.priceChange24h);
    priceChange.className = `metric-change ${Number(token.priceChange24h) < 0 ? 'negative' : ''}`;
  }
  setText('[data-market-cap]', money(token.marketCap));
  setText('[data-fdv]', token.fdv ? `FDV ${money(token.fdv)}` : '—');
  setText('[data-volume]', money(token.volume24h));
  const swaps = (token.buys24h || 0) + (token.sells24h || 0);
  setText('[data-swaps]', swaps ? `${count(swaps)} tracked swaps` : 'Swap data unavailable');
  setText('[data-pair-date]', date(token.pairCreatedAt));
  renderBars('[data-price-bars]', [28, 36, 31, 48, 44, 57, 52, 70, 61, 78, 74, 88]);
  renderBars('[data-volume-bars]', [20, 34, 28, 52, 45, 62, 54, 76, 62, 92, 80, 100], 'blue');

  setText('[data-liquidity]', money(liquidity.totalUsd));
  setText('[data-pair-count]', `${liquidity.pairCount} venues tracked`);
  setText('[data-health]', liquidity.totalUsd !== null ? 'LIVE' : '—');
  setText('[data-health-detail]', liquidity.totalUsd !== null ? 'Indexed' : 'Unavailable');
  setText('[data-lp-depth]', money(liquidity.totalUsd));
  setText('[data-lp-locked]', liquidity.locked === null ? 'Not reported' : percent(liquidity.locked));
  renderVenues(liquidity.venues, liquidity.totalUsd);

  const buyTotal = (token.buys24h || 0) + (token.sells24h || 0);
  const buyPercent = buyTotal ? ((token.buys24h || 0) / buyTotal) * 100 : 50;
  setText('[data-buys]', count(token.buys24h));
  setText('[data-sells]', count(token.sells24h));
  setText('[data-ratio]', token.buys24h !== null && token.sells24h ? (token.buys24h / token.sells24h).toFixed(2) : '—');
  const buyBar = $('[data-buy-bar]');
  if (buyBar) buyBar.style.width = `${buyPercent}%`;
  setText('[data-buy-caption]', token.buys24h === null ? 'Buy data unavailable' : `${buyPercent.toFixed(0)}% buy count`);
  setText('[data-sell-caption]', token.sells24h === null ? 'Sell data unavailable' : `${(100 - buyPercent).toFixed(0)}% sell count`);

  setText('[data-developer-address]', developer.address ? shortAddress(developer.address) : 'Not returned by provider');
  setText('[data-developer-risk]', `${developer.risk.toUpperCase()} RISK`);
  setText('[data-authority-share]', percent(developer.balancePercentage));
  setText('[data-developer-source]', developer.source);
  setText('[data-holder-total]', holders.totalKnown ? `${count(holders.totalKnown)} total holders` : 'provider snapshot');
  setText('[data-top-ten]', holders.top10Percentage === null ? 'not calculated' : `top 10 · ${holders.top10Percentage.toFixed(1)}%`);
  setText('[data-relationship-source]', relationships.source);
  setText('[data-direct-relations]', relationships.directCount ? `${relationships.directCount} direct relations` : 'Transaction history needed');
  setText('[data-graph-symbol]', token.symbol);
  renderHolders(holders.top);
  renderWarnings(monitoring.warnings);
  renderEarlyWallets(data.earlyWallets);
  setText('[data-monitoring-coverage]', monitoring.paidOrders === null ? 'limited coverage' : 'live checks');
  setText('[data-paid-orders]', monitoring.paidOrders === null ? '—' : monitoring.paidOrders ? 'Paid order found' : 'No paid order found');
  setText('[data-boosts]', monitoring.boosts === null ? '—' : monitoring.boosts);
  renderProviders(data.providers);
  analysis.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function analyzeToken(value) {
  hideError();
  setLoading(true);
  try {
    const response = await fetch(`/api/token?${new URLSearchParams({ address: value.trim() || SAMPLE_TOKEN })}`, { headers: { Accept: 'application/json' } });
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) throw new Error(`The analysis service returned a non-JSON response (${response.status}).`);
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'The token analysis could not be loaded.');
    renderAnalysis(body);
  } catch (error) {
    showError(error instanceof Error ? error.message : 'The token analysis could not be loaded.');
  } finally {
    setLoading(false);
  }
}

function setupNavigation() {
  const toggle = $('[data-menu-toggle]');
  const nav = $('[data-mobile-nav]');
  toggle?.addEventListener('click', () => {
    const open = nav?.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(Boolean(open)));
  });
  $$('.mobile-nav a, .mobile-nav button').forEach((item) => item.addEventListener('click', () => {
    nav?.classList.remove('open');
    toggle?.setAttribute('aria-expanded', 'false');
  }));
}

function setupAuth() {
  const modal = $('[data-auth-modal]');
  if (!modal) return;
  let mode = 'signin';
  const update = () => {
    const signup = mode === 'signup';
    $('[data-auth-title]', modal).textContent = signup ? 'Create your account' : 'Welcome back';
    $('[data-auth-copy]', modal).textContent = signup ? 'Save watchlists and return to your research desk.' : 'Sign in to save watchlists and return to your research desk.';
    $('[data-name-field]', modal).hidden = !signup;
    $('[data-auth-submit]', modal).innerHTML = signup ? 'Create account <span>↗</span>' : 'Sign in <span>↗</span>';
    $('[data-auth-switch-copy]', modal).textContent = signup ? 'Already have an account?' : 'New to Dyorly?';
    $('[data-auth-switch]', modal).textContent = signup ? 'Sign in' : 'Register';
  };
  const open = (nextMode) => {
    mode = nextMode;
    update();
    modal.hidden = false;
    document.body.classList.add('modal-open');
    $('[data-auth-note]', modal).hidden = true;
  };
  $$('[data-auth]').forEach((button) => button.addEventListener('click', () => open(button.dataset.auth || 'signin')));
  $('[data-close-auth]', modal)?.addEventListener('click', () => { modal.hidden = true; document.body.classList.remove('modal-open'); });
  $('[data-auth-switch]', modal)?.addEventListener('click', () => { mode = mode === 'signin' ? 'signup' : 'signin'; update(); });
  $('[data-auth-form]', modal)?.addEventListener('submit', (event) => {
    event.preventDefault();
    $('[data-auth-note]', modal).hidden = false;
  });
  modal.addEventListener('click', (event) => { if (event.target === modal) { modal.hidden = true; document.body.classList.remove('modal-open'); } });
}

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupAuth();
  $('[data-dismiss-error]')?.addEventListener('click', hideError);
  $('[data-sample]')?.addEventListener('click', () => {
    const input = $('#asset-input');
    if (input) { input.value = SAMPLE_TOKEN; input.focus(); }
  });
  $('[data-token-form]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    analyzeToken($('#asset-input')?.value || '');
  });
  $('[data-copy]')?.addEventListener('click', async () => {
    const address = $('[data-token-address]')?.textContent;
    if (address && navigator.clipboard) await navigator.clipboard.writeText(address);
  });
  if (location.hash === '#analyze') setTimeout(() => $('#analyze')?.scrollIntoView(), 100);
});