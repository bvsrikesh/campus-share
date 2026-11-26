/* CampusShare — single-page demo app (vanilla JS, hash routing, localStorage) */
'use strict';

/* =========================================================
   Utilities
   ========================================================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = (p) => p + Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 7);
const DAY = 864e5;
const pad = (n) => String(n).padStart(2, '0');

function isoDay(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
const parseDay = (iso) => new Date(iso + 'T00:00:00');
const daysBetween = (a, b) => Math.round((parseDay(b) - parseDay(a)) / DAY) + 1; // inclusive
function fmtDay(iso) {
  if (!iso) return '';
  const diff = Math.round((parseDay(iso) - parseDay(isoDay(0))) / DAY);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return parseDay(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}
function timeAgo(ts) {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return 'just now';
  const m = s / 60; if (m < 60) return Math.floor(m) + 'm ago';
  const h = m / 60; if (h < 24) return Math.floor(h) + 'h ago';
  const d = h / 24; if (d < 7) return Math.floor(d) + 'd ago';
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
const rupee = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

/* =========================================================
   Store
   ========================================================= */
const DB_KEY = 'campusshare.db.v1';
let DB;
function loadDB() {
  try { DB = JSON.parse(localStorage.getItem(DB_KEY)); } catch (e) { DB = null; }
  if (!DB || DB.version !== 4) { DB = seed(); saveDB(); }
}
function saveDB() {
  try { localStorage.setItem(DB_KEY, JSON.stringify(DB)); }
  catch (e) { toast('Browser storage is full — try a smaller photo.', 'error'); }
}
function resetDB() { localStorage.removeItem(DB_KEY); loadDB(); }

const me = () => DB.users.find((u) => u.id === DB.session) || null;
const getUser = (id) => DB.users.find((u) => u.id === id);
const getItem = (id) => DB.items.find((i) => i.id === id);
const getHostel = (id) => DB.hostels.find((h) => h.id === id) || DB.hostels[0];
const getReq = (id) => DB.requests.find((r) => r.id === id);
const getWanted = (id) => DB.wanted.find((w) => w.id === id);
const cat = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

function userRating(id) {
  const rs = DB.reviews.filter((r) => r.toId === id);
  if (!rs.length) return { avg: 0, count: 0 };
  return { avg: rs.reduce((a, r) => a + r.stars, 0) / rs.length, count: rs.length };
}
function userStats(id) {
  const lent = DB.requests.filter((r) => r.ownerId === id && r.status === 'completed').length;
  const borrowed = DB.requests.filter((r) => r.requesterId === id && r.status === 'completed').length;
  const listings = DB.items.filter((i) => i.ownerId === id && i.status !== 'removed').length;
  return { lent, borrowed, listings };
}
function notify(userId, html, link) {
  DB.notifications.unshift({ id: uid('n'), userId, text: html, link, at: Date.now(), read: false });
}
const isVisibleItem = (it) => it.status !== 'removed' && (it.status !== 'paused' || (me() && it.ownerId === me().id));

/* =========================================================
   Display helpers
   ========================================================= */
const ICONS = {
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
  megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  msg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16M8 16H3v5"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  back: '<path d="m12 19-7-7 7-7M19 12H5"/>',
  filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  play: '<path d="M6 3l14 9-14 9V3z"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  swap: '<path d="M16 3l4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16"/>',
  tag: '<path d="M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.42l8.82 8.82a2 2 0 0 0 2.83 0l7.17-7.17a2 2 0 0 0 0-2.83z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  sparkle: '<path d="M12 3l1.9 5.8L20 10.7l-5.8 1.9L12 18.5l-1.9-5.9L4 10.7l6.1-1.9z"/>',
};
const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

function initials(name) { return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase(); }
function avatar(u, size = 'md') {
  if (!u) return '';
  return `<span class="avatar avatar-${size}" style="--c:${u.color}" title="${esc(u.name)}">${esc(initials(u.name))}</span>`;
}
function stars(avg, count, compact = false) {
  if (!count) return `<span class="stars muted">New member</span>`;
  const full = Math.round(avg);
  return `<span class="stars" title="${avg.toFixed(1)} from ${count} reviews"><span class="star-row">${'★'.repeat(full)}<span class="dim">${'★'.repeat(5 - full)}</span></span> <b>${avg.toFixed(1)}</b>${compact ? '' : ` <span class="muted">(${count})</span>`}</span>`;
}
function thumb(it, cls = '') {
  const c = cat(it.category);
  if (it.image) return `<div class="thumb ${cls}"><img src="${it.image}" alt="${esc(it.title)}" loading="lazy"></div>`;
  return `<div class="thumb ${cls}" style="--hue:${c.hue}"><span class="thumb-emoji">${it.emoji || c.emoji}</span></div>`;
}
const typeBadge = (t) => `<span class="badge badge-${t}">${TYPES[t].label}</span>`;
function priceLabel(it, long = false) {
  if (it.type === 'lend') return long ? 'Free to borrow' : 'Free';
  if (it.type === 'free') return long ? 'Free giveaway' : 'Free';
  if (it.type === 'rent') return `${rupee(it.price)}<small>/day</small>`;
  return rupee(it.price);
}
const priceValue = (it) => (it.type === 'rent' || it.type === 'sell' ? it.price : 0);
const ITEM_STATUS = { available: 'Available', onloan: 'On loan', sold: 'Sold', given: 'Claimed', paused: 'Paused' };
const REQ_STATUS = {
  pending: { label: 'Pending', cls: 'amber' },
  accepted: { label: 'Accepted', cls: 'blue' },
  active: { label: 'On loan', cls: 'violet' },
  completed: { label: 'Completed', cls: 'green' },
  declined: { label: 'Declined', cls: 'red' },
  cancelled: { label: 'Cancelled', cls: 'gray' },
};
const statusPill = (s) => `<span class="pill pill-${REQ_STATUS[s].cls}">${REQ_STATUS[s].label}</span>`;
function urgency(neededBy) {
  const d = Math.round((parseDay(neededBy) - parseDay(isoDay(0))) / DAY);
  if (d < 0) return { label: 'Past due', cls: 'gray' };
  if (d === 0) return { label: 'Needed today', cls: 'red' };
  if (d === 1) return { label: 'Tomorrow', cls: 'amber' };
  return { label: `In ${d} days`, cls: 'blue' };
}
const WANT_MODES = { borrow: 'Borrow', rent: 'Rent', buy: 'Buy', any: 'Anything works' };

function itemCard(it) {
  const u = getUser(it.ownerId), h = getHostel(it.hostelId), m = me();
  const saved = m && m.saved.includes(it.id);
  const near = m && m.hostelId === it.hostelId && m.id !== it.ownerId;
  const mine = m && m.id === it.ownerId;
  return `<a class="item-card" href="#/item/${it.id}">
    <div class="item-media">${thumb(it)}
      ${typeBadge(it.type)}
      ${mine ? '' : `<button class="fav ${saved ? 'on' : ''}" data-action="fav" data-id="${it.id}" aria-label="${saved ? 'Unsave' : 'Save'}">${icon('heart')}</button>`}
      ${it.status !== 'available' ? `<span class="media-overlay">${ITEM_STATUS[it.status]}</span>` : qty(it) > 1 ? `<span class="media-overlay qty">×${qty(it)} · ${unitsNote(it)}</span>` : ''}
    </div>
    <div class="item-body">
      <div class="item-price">${priceLabel(it)}</div>
      <div class="item-title">${esc(it.title)}</div>
      <div class="item-meta">${mine ? '<span class="mine">Your listing</span>' : near ? '<span class="near">● Your hostel</span>' : `${icon('pin')}${esc(h.short)}`}<span>·</span><span>${timeAgo(it.createdAt)}</span></div>
      <div class="item-owner">${avatar(u, 'xs')}<span>${esc(u.name.split(' ')[0])}</span></div>
    </div>
  </a>`;
}
const itemGrid = (list, empty) => list.length ? `<div class="grid">${list.map(itemCard).join('')}</div>` : empty;

function wantedCard(w) {
  const u = getUser(w.userId), h = getHostel(w.hostelId), urg = urgency(w.neededBy), c = cat(w.category);
  const m = me();
  return `<a class="wanted-card ${w.status !== 'open' ? 'is-closed' : ''}" href="#/wanted/${w.id}">
    <div class="wanted-top">
      <span class="wanted-emoji" style="--hue:${c.hue}">${c.emoji}</span>
      ${w.status === 'open' ? `<span class="pill pill-${urg.cls}">${icon('clock')}${urg.label}</span>` : '<span class="pill pill-green">✓ Fulfilled</span>'}
    </div>
    <div class="wanted-title">${esc(w.title)}</div>
    <p class="wanted-desc">${esc(w.desc)}</p>
    <div class="wanted-tags"><span class="tag">${WANT_MODES[w.mode]}</span>${w.budget ? `<span class="tag">Budget ${rupee(w.budget)}</span>` : ''}</div>
    <div class="wanted-foot">
      <span class="who">${avatar(u, 'xs')} ${esc(u.name.split(' ')[0])} · ${esc(h.short)}</span>
      <span class="muted">${w.offers.length ? `${icon('msg')} ${w.offers.length}` : timeAgo(w.createdAt)}</span>
    </div>
    ${w.status === 'open' && (!m || m.id !== w.userId) ? '<span class="btn btn-soft btn-sm btn-block">I can help</span>' : ''}
  </a>`;
}

function emptyState(emoji, title, text, cta = '') {
  return `<div class="empty"><div class="empty-emoji">${emoji}</div><h3>${title}</h3><p>${text}</p>${cta}</div>`;
}
function loginPrompt(what) {
  return `<div class="container narrow">${emptyState('🔐', 'Log in to continue', `You need an account ${what}.`,
    `<div class="row center gap"><a class="btn btn-primary" href="#/login?next=${encodeURIComponent(location.hash.slice(1))}">Log in</a><a class="btn btn-ghost" href="#/signup">Create account</a></div>`)}</div>`;
}

/* =========================================================
   Toasts & modals
   ========================================================= */
function toast(text, kind = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.innerHTML = `${icon(kind === 'error' ? 'x' : 'check')}<span>${text}</span>`;
  $('#toasts').appendChild(el);
  // keep the stack short so it never covers the page
  const all = $$('#toasts .toast');
  all.slice(0, Math.max(0, all.length - 3)).forEach((t) => t.remove());
  setTimeout(() => el.classList.add('out'), 2800);
  setTimeout(() => el.remove(), 3200);
}
function openModal(title, body, wide = false) {
  $('#modal-root').innerHTML = `<div class="modal-backdrop" data-action="close-modal">
    <div class="modal ${wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal-head"><h2>${title}</h2><button class="icon-btn" data-action="close-modal" aria-label="Close">${icon('x')}</button></div>
      <div class="modal-body">${body}</div>
    </div></div>`;
  document.body.classList.add('no-scroll');
  setTimeout(() => $('#modal-root input:not([type=hidden]), #modal-root textarea')?.focus(), 30);
}
function closeModal() { $('#modal-root').innerHTML = ''; document.body.classList.remove('no-scroll'); }
function confirmModal(title, text, actionAttrs, btnLabel = 'Confirm', danger = false) {
  openModal(title, `<p class="lead">${text}</p><div class="row end gap mt"><button class="btn btn-ghost" data-action="close-modal">Keep it</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" ${actionAttrs}>${btnLabel}</button></div>`);
}

/* =========================================================
   Router
   ========================================================= */
function parseHash() {
  const raw = location.hash.slice(1) || '/';
  const [path, qs] = raw.split('?');
  return { path: path || '/', query: Object.fromEntries(new URLSearchParams(qs || '')) };
}
function go(path) { if (location.hash.slice(1) === path) render(); else location.hash = path; }
const qs = (obj) => { const p = new URLSearchParams(); Object.entries(obj).forEach(([k, v]) => { if (v !== '' && v != null) p.set(k, v); }); const s = p.toString(); return s ? '?' + s : ''; };

const ROUTES = [
  [/^\/$/, pageHome],
  [/^\/browse$/, pageBrowse],
  [/^\/item\/(\w+)$/, pageItem],
  [/^\/post$/, pagePost],
  [/^\/edit\/(\w+)$/, pagePost],
  [/^\/wanted$/, pageWanted],
  [/^\/wanted\/(\w+)$/, pageWantedDetail],
  [/^\/hostels$/, pageHostels],
  [/^\/hostel\/(\w+)$/, pageHostel],
  [/^\/requests$/, pageRequests],
  [/^\/request\/(\w+)$/, pageRequest],
  [/^\/profile\/(\w+)$/, pageProfile],
  [/^\/saved$/, pageSaved],
  [/^\/login$/, pageLogin],
  [/^\/signup$/, pageSignup],
];

let lastPath = null;
let afterRender = [];
let openMenu = null;

function render() {
  const { path, query } = parseHash();
  afterRender = [];
  let html = null;
  for (const [re, fn] of ROUTES) {
    const m = path.match(re);
    if (m) { html = fn(query, ...m.slice(1)); break; }
  }
  if (html == null) html = `<div class="container narrow">${emptyState('🧭', 'Page not found', 'That link doesn’t go anywhere.', '<a class="btn btn-primary" href="#/">Go home</a>')}</div>`;
  if (path !== lastPath) openMenu = null;
  renderHeader(path);
  const view = $('#view');
  view.innerHTML = html;
  if (path !== lastPath) { window.scrollTo(0, 0); lastPath = path; }
  afterRender.forEach((fn) => fn());
}

/* =========================================================
   Header + bottom nav
   ========================================================= */
function renderHeader(path) {
  const m = me();
  const pending = m ? DB.requests.filter((r) => r.ownerId === m.id && r.status === 'pending').length : 0;
  const unread = m ? DB.notifications.filter((n) => n.userId === m.id && !n.read).length : 0;
  const active = (href) => (href === '/' ? path === '/' : path.startsWith(href) || (href === '/wanted' && path.startsWith('/wanted')) || (href === '/hostels' && path.startsWith('/hostel')) || (href === '/requests' && path.startsWith('/request')));
  const link = (href, label, ic, badge) => `<a href="#${href}" class="nav-link ${active(href) ? 'active' : ''}">${icon(ic)}<span>${label}</span>${badge ? `<span class="count">${badge}</span>` : ''}</a>`;
  const q = path === '/browse' ? parseHash().query.q || '' : '';
  const theme = document.documentElement.dataset.theme;

  const notifs = m ? DB.notifications.filter((n) => n.userId === m.id).slice(0, 12) : [];
  const notifPanel = `<div class="dropdown dropdown-notif ${openMenu === 'notif' ? 'open' : ''}">
      <div class="dropdown-head"><b>Notifications</b>${unread ? '<button class="link-btn" data-action="notif-read-all">Mark all read</button>' : ''}</div>
      ${notifs.length ? notifs.map((n) => `<a class="notif ${n.read ? '' : 'unread'}" href="#${n.link}" data-action="notif-open" data-id="${n.id}"><span class="dot"></span><span class="notif-text">${n.text}<small>${timeAgo(n.at)}</small></span></a>`).join('') : '<p class="muted pad">You’re all caught up ✨</p>'}
    </div>`;
  const userPanel = m ? `<div class="dropdown dropdown-user ${openMenu === 'user' ? 'open' : ''}">
      <div class="dropdown-profile">${avatar(m, 'md')}<div><b>${esc(m.name)}</b><small>${esc(getHostel(m.hostelId).name)} · ${esc(m.room)}</small></div></div>
      <a href="#/profile/${m.id}" class="menu-item">${icon('user')}My profile & listings</a>
      <a href="#/requests" class="menu-item">${icon('inbox')}My requests${pending ? `<span class="count">${pending}</span>` : ''}</a>
      <a href="#/saved" class="menu-item">${icon('heart')}Saved items</a>
      <button class="menu-item" data-action="theme">${icon(theme === 'dark' ? 'sun' : 'moon')}${theme === 'dark' ? 'Light' : 'Dark'} mode</button>
      <div class="menu-sep"></div>
      <button class="menu-item" data-action="switch-account">${icon('swap')}Switch demo account</button>
      <button class="menu-item" data-action="reset-demo">${icon('refresh')}Reset demo data</button>
      <button class="menu-item danger" data-action="logout">${icon('logout')}Log out</button>
    </div>` : '';

  $('#header').innerHTML = `<div class="container header-inner">
    <a href="#/" class="logo" aria-label="CampusShare home"><span class="logo-mark">${icon('swap')}</span><span class="logo-text">Campus<b>Share</b></span></a>
    <form class="header-search" data-form="search" role="search">${icon('search')}<input name="q" type="search" placeholder="Search calculators, cycles, notes…" value="${esc(q)}" aria-label="Search items"></form>
    <nav class="nav">${link('/browse', 'Browse', 'grid')}${link('/wanted', 'Wanted', 'megaphone')}${link('/hostels', 'Hostels', 'building')}${m ? link('/requests', 'Requests', 'inbox', pending) : ''}</nav>
    <div class="header-actions">
      <a href="#/post" class="btn btn-primary btn-sm hide-sm">${icon('plus')}List an item</a>
      ${m ? `<div class="menu-wrap">
          <button class="icon-btn" data-action="menu" data-menu="notif" aria-label="Notifications">${icon('bell')}${unread ? `<span class="dot-count">${unread}</span>` : ''}</button>${notifPanel}
        </div>
        <div class="menu-wrap">
          <button class="avatar-btn" data-action="menu" data-menu="user" aria-label="Account menu">${avatar(m, 'sm')}</button>${userPanel}
        </div>`
      : `<button class="icon-btn hide-sm" data-action="theme" aria-label="Toggle theme">${icon(theme === 'dark' ? 'sun' : 'moon')}</button>
         <a href="#/login" class="btn btn-ghost btn-sm">Log in</a><a href="#/signup" class="btn btn-dark btn-sm hide-sm">Sign up</a>`}
    </div>
  </div>`;

  $('#demo-banner').innerHTML = `<span class="hide-sm">Demo prototype · data stays in this browser ·</span>
    <label class="as">Viewing as
      <select data-change="as" aria-label="Switch demo account">
        <option value="" ${m ? '' : 'selected'}>Logged out (guest)</option>
        ${DB.users.map((u) => `<option value="${u.id}" ${m && m.id === u.id ? 'selected' : ''}>${esc(u.name)} · ${esc(getHostel(u.hostelId).short)}</option>`).join('')}
      </select></label>
    <button class="banner-btn" data-action="reset-demo" aria-label="Reset demo data" title="Reset demo data">${icon('refresh')}<span class="hide-sm">Reset</span></button>`;

  const bl = (href, label, ic, badge, extra = '') => `<a href="#${href}" class="tab ${active(href) ? 'active' : ''} ${extra}">${icon(ic)}<span>${label}</span>${badge ? `<span class="count">${badge}</span>` : ''}</a>`;
  $('#bottom-nav').innerHTML = `${bl('/', 'Home', 'home')}${bl('/browse', 'Browse', 'grid')}<a href="#/post" class="tab tab-post" aria-label="List an item"><span>${icon('plus')}</span></a>${bl('/wanted', 'Wanted', 'megaphone')}${m ? bl('/requests', 'Requests', 'inbox', pending) : bl('/login', 'Log in', 'user')}`;
}

/* =========================================================
   Pages
   ========================================================= */
function pageHome() {
  const m = me();
  const items = DB.items.filter(isVisibleItem);
  const available = items.filter((i) => i.status === 'available');
  const completed = DB.requests.filter((r) => r.status === 'completed').length + 214;
  const fresh = [...available].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8);
  const openWanted = DB.wanted.filter((w) => w.status === 'open').sort((a, b) => a.neededBy.localeCompare(b.neededBy)).slice(0, 4);

  let attention = '';
  if (m) {
    const inc = DB.requests.filter((r) => r.ownerId === m.id && r.status === 'pending');
    const upcoming = DB.requests.filter((r) => r.requesterId === m.id && r.status === 'accepted');
    const dueBack = DB.requests.filter((r) => r.requesterId === m.id && r.status === 'active');
    const lentOut = DB.requests.filter((r) => r.ownerId === m.id && r.status === 'active');
    const cards = [];
    if (inc.length) cards.push(`<a class="att-card amber" href="#/requests?tab=received&status=pending"><b>${inc.length}</b><span>${inc.length === 1 ? 'request needs' : 'requests need'} your reply</span>${icon('chevron')}</a>`);
    upcoming.forEach((r) => cards.push(`<a class="att-card blue" href="#/request/${r.id}"><b>${icon('calendar')}</b><span>Pick up <em>${esc(getItem(r.itemId).title)}</em>${r.from ? ` · ${fmtDay(r.from)}` : ''}</span>${icon('chevron')}</a>`));
    dueBack.forEach((r) => cards.push(`<a class="att-card violet" href="#/request/${r.id}"><b>${icon('clock')}</b><span>Return <em>${esc(getItem(r.itemId).title)}</em> by ${fmtDay(r.to)}</span>${icon('chevron')}</a>`));
    lentOut.forEach((r) => cards.push(`<a class="att-card green" href="#/request/${r.id}"><b>${icon('swap')}</b><span><em>${esc(getItem(r.itemId).title)}</em> is with ${esc(getUser(r.requesterId).name.split(' ')[0])} until ${fmtDay(r.to)}</span>${icon('chevron')}</a>`));
    attention = `<section class="section">
      <div class="greet"><div><h2>Hey ${esc(m.name.split(' ')[0])} 👋</h2><p class="muted">${cards.length ? 'Here’s what needs you today.' : 'Nothing pending — explore what your campus is sharing.'}</p></div></div>
      ${cards.length ? `<div class="att-grid">${cards.join('')}</div>` : ''}
    </section>`;
  }

  const near = m ? available.filter((i) => i.hostelId === m.hostelId && i.ownerId !== m.id).slice(0, 4) : [];
  const popular = ['calculator', 'cycle', 'notes', 'blazer', 'projector', 'kettle'];

  return `
  <section class="hero">
    <div class="container hero-inner">
      <div class="hero-copy">
        <span class="eyebrow">${icon('sparkle')} Your campus, one shared shelf</span>
        <h1>Borrow it. Lend it. <span class="grad">Share it</span> — right from your hostel.</h1>
        <p class="hero-sub">Why buy a ₹1,200 calculator for one exam? Find what you need from students a few rooms away, or post a request and let campus come to you.</p>
        <form class="hero-search" data-form="search">${icon('search')}<input name="q" type="search" placeholder="What do you need today?" aria-label="Search"><button class="btn btn-primary">Search</button></form>
        <div class="popular"><span class="muted">Popular:</span>${popular.map((p) => `<a href="#/browse?q=${p}" class="chip chip-sm">${p}</a>`).join('')}</div>
      </div>
      <div class="hero-stats">
        <div class="stat"><b>${available.length}</b><span>items available now</span></div>
        <div class="stat"><b>${DB.users.length * 41}</b><span>students sharing</span></div>
        <div class="stat"><b>${completed}</b><span>successful shares</span></div>
        <div class="stat"><b>${DB.hostels.length}</b><span>hostels connected</span></div>
      </div>
    </div>
  </section>
  <div class="container">
    ${attention}
    <section class="section">
      <div class="section-head"><h2>Browse by category</h2><a href="#/browse" class="link">See all ${icon('chevron')}</a></div>
      <div class="cat-grid">${CATEGORIES.map((c) => {
        const n = available.filter((i) => i.category === c.id).length;
        return `<a class="cat-tile" href="#/browse?cat=${c.id}" style="--hue:${c.hue}"><span class="cat-emoji">${c.emoji}</span><span class="cat-name">${c.name}</span><span class="cat-count">${n} available</span></a>`;
      }).join('')}</div>
    </section>
    ${near.length ? `<section class="section">
      <div class="section-head"><h2>${icon('pin')} In ${esc(getHostel(m.hostelId).name)}</h2><a href="#/browse?hostel=${m.hostelId}" class="link">See all ${icon('chevron')}</a></div>
      ${itemGrid(near)}
    </section>` : ''}
    <section class="section">
      <div class="section-head"><h2>Fresh on campus</h2><a href="#/browse?sort=new" class="link">Browse all ${icon('chevron')}</a></div>
      ${itemGrid(fresh)}
    </section>
    <section class="section">
      <div class="section-head"><div><h2>Can you help?</h2><p class="muted">Students are looking for these right now.</p></div><a href="#/wanted" class="link">Wanted board ${icon('chevron')}</a></div>
      <div class="wanted-grid">${openWanted.map(wantedCard).join('')}</div>
    </section>
    <section class="section">
      <div class="section-head"><h2>Hostels</h2><a href="#/hostels" class="link">All hostels ${icon('chevron')}</a></div>
      <div class="hostel-strip">${DB.hostels.map(hostelMini).join('')}</div>
    </section>
    ${m ? '' : `<section class="section how">
      <h2>How CampusShare works</h2>
      <div class="how-grid">
        <div class="how-step"><span>1</span><h3>List or search</h3><p>Post things you rarely use, or search for what you need across every hostel.</p></div>
        <div class="how-step"><span>2</span><h3>Request & chat</h3><p>Pick dates, a pickup spot and send a request. Chat with the owner to sort details.</p></div>
        <div class="how-step"><span>3</span><h3>Meet & return</h3><p>Hand over in person on campus. Rate each other to build trust.</p></div>
      </div>
      <a href="#/signup" class="btn btn-primary btn-lg">Join with your campus email</a>
    </section>`}
  </div>`;
}

function hostelMini(h) {
  const n = DB.items.filter((i) => i.hostelId === h.id && i.status === 'available').length;
  return `<a class="hostel-mini" href="#/hostel/${h.id}" style="--c:${h.color}"><span class="hm-emoji">${h.emoji}</span><span><b>${esc(h.short)}</b><small>${n} items · ${h.kind}</small></span></a>`;
}

/* ---------- Browse ---------- */
function filterItems(q) {
  const m = me();
  let list = DB.items.filter(isVisibleItem);
  if (q.q) {
    const terms = q.q.toLowerCase().split(/\s+/).filter(Boolean);
    list = list.filter((i) => {
      const hay = `${i.title} ${i.desc} ${cat(i.category).name} ${getHostel(i.hostelId).name} ${getUser(i.ownerId).name}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }
  if (q.cat) list = list.filter((i) => i.category === q.cat);
  if (q.type) list = list.filter((i) => i.type === q.type);
  if (q.hostel) list = list.filter((i) => i.hostelId === q.hostel);
  if (q.avail !== '0') list = list.filter((i) => i.status === 'available' || (m && i.ownerId === m.id));
  if (q.max) list = list.filter((i) => priceValue(i) <= +q.max);
  const sort = q.sort || (m ? 'near' : 'new');
  const byNew = (a, b) => b.createdAt - a.createdAt;
  if (sort === 'new') list.sort(byNew);
  if (sort === 'price-asc') list.sort((a, b) => priceValue(a) - priceValue(b) || byNew(a, b));
  if (sort === 'price-desc') list.sort((a, b) => priceValue(b) - priceValue(a) || byNew(a, b));
  if (sort === 'near') list.sort((a, b) => ((m && b.hostelId === m.hostelId) - (m && a.hostelId === m.hostelId)) || byNew(a, b));
  return list;
}
function browseResults(q) {
  const list = filterItems(q);
  const hasFilters = ['q', 'cat', 'type', 'hostel', 'max'].some((k) => q[k]);
  const empty = emptyState('🔍', 'Nothing matches yet', q.q ? `Nobody has listed “${esc(q.q)}” yet. Post it on the Wanted board and get notified when someone can help.` : 'Try removing a filter or two.',
    `<div class="row center gap">${q.q ? `<button class="btn btn-primary" data-action="new-wanted" data-title="${esc(q.q)}">${icon('megaphone')}Post “${esc(q.q)}” as wanted</button>` : ''}${hasFilters ? '<a class="btn btn-ghost" href="#/browse">Clear filters</a>' : ''}</div>`);
  return { count: list.length, html: itemGrid(list, empty) };
}
function pageBrowse(q) {
  const m = me();
  const res = browseResults(q);
  const sort = q.sort || (m ? 'near' : 'new');
  const chip = (key, val, label, extra = '') => `<button class="chip ${(q[key] || '') === val ? 'on' : ''}" data-action="filter" data-key="${key}" data-val="${val}">${extra}${label}</button>`;
  const activeChips = [];
  if (q.q) activeChips.push(['q', `“${esc(q.q)}”`]);
  if (q.cat) activeChips.push(['cat', cat(q.cat).name]);
  if (q.type) activeChips.push(['type', TYPES[q.type].label]);
  if (q.hostel) activeChips.push(['hostel', getHostel(q.hostel).short]);
  if (q.max) activeChips.push(['max', `≤ ${rupee(q.max)}`]);
  afterRender.push(() => { if (q.focus) $('#browse-q')?.focus(); });

  return `<div class="container">
    <div class="page-head">
      <div><h1>Browse items</h1><p class="muted" id="result-count">${plural(res.count, 'item')} ${q.avail === '0' ? 'listed' : 'available'}${q.hostel ? ` in ${esc(getHostel(q.hostel).name)}` : ' across campus'}</p></div>
      <div class="row gap">
        <button class="btn btn-ghost btn-sm show-md" data-action="toggle-filters">${icon('filter')}Filters</button>
        <label class="sort">Sort
          <select data-change="filter" data-key="sort">
            ${m ? `<option value="near" ${sort === 'near' ? 'selected' : ''}>Nearest first</option>` : ''}
            <option value="new" ${sort === 'new' ? 'selected' : ''}>Newest</option>
            <option value="price-asc" ${sort === 'price-asc' ? 'selected' : ''}>Price: low to high</option>
            <option value="price-desc" ${sort === 'price-desc' ? 'selected' : ''}>Price: high to low</option>
          </select></label>
      </div>
    </div>
    <div class="browse">
      <aside class="filters card">
        <div class="filter-block">
          <label class="search-field">${icon('search')}<input id="browse-q" type="search" placeholder="Search items" value="${esc(q.q || '')}" data-live="browse-q"></label>
        </div>
        <div class="filter-block"><h4>Type</h4><div class="chips">
          ${chip('type', '', 'All')}${Object.entries(TYPES).map(([k, t]) => chip('type', k, t.label, `<i class="dot-${k}"></i>`)).join('')}
        </div></div>
        <div class="filter-block"><h4>Category</h4><div class="chips">
          ${chip('cat', '', 'All')}${CATEGORIES.map((c) => chip('cat', c.id, c.name, c.emoji + ' ')).join('')}
        </div></div>
        <div class="filter-block"><h4>Hostel</h4>
          <select data-change="filter" data-key="hostel"><option value="">All hostels</option>${DB.hostels.map((h) => `<option value="${h.id}" ${q.hostel === h.id ? 'selected' : ''}>${esc(h.name)}${m && m.hostelId === h.id ? ' (yours)' : ''}</option>`).join('')}</select>
        </div>
        <div class="filter-block"><h4>Max price</h4>
          <select data-change="filter" data-key="max"><option value="">Any price</option>${[0, 50, 100, 500, 1000, 5000].map((v) => `<option value="${v}" ${q.max === String(v) ? 'selected' : ''}>${v === 0 ? 'Free only' : '≤ ' + rupee(v)}</option>`).join('')}</select>
        </div>
        <label class="switch"><input type="checkbox" data-change="avail" ${q.avail === '0' ? '' : 'checked'}><span class="track"></span>Available now only</label>
      </aside>
      <section>
        ${activeChips.length ? `<div class="active-filters">${activeChips.map(([k, l]) => `<button class="chip on" data-action="filter" data-key="${k}" data-val="">${l} ${icon('x')}</button>`).join('')}<a href="#/browse" class="link">Clear all</a></div>` : ''}
        <div id="results">${res.html}</div>
      </section>
    </div>
  </div>`;
}

/* ---------- Item detail ---------- */
function pageItem(q, id) {
  const it = getItem(id);
  if (!it || it.status === 'removed') return `<div class="container narrow">${emptyState('📦', 'Item not found', 'It may have been removed by the owner.', '<a class="btn btn-primary" href="#/browse">Browse items</a>')}</div>`;
  const m = me(), owner = getUser(it.ownerId), h = getHostel(it.hostelId), c = cat(it.category);
  const mine = m && m.id === it.ownerId;
  const rating = userRating(owner.id), st = userStats(owner.id);
  const saved = m && m.saved.includes(it.id);
  const similar = DB.items.filter((i) => i.id !== it.id && i.category === it.category && i.status === 'available').slice(0, 4);
  const activeLoan = DB.requests.find((r) => r.itemId === it.id && r.status === 'active');

  const facts = [
    ['Condition', esc(it.condition)],
    qty(it) > 1 ? ['Quantity', `${qty(it)} <span class="muted">(${unitsNote(it)})</span>`] : null,
    (it.type === 'lend' || it.type === 'rent') && it.maxDays ? ['Max period', plural(it.maxDays, 'day')] : null,
    it.deposit ? ['Refundable deposit', rupee(it.deposit)] : null,
    ['Pickup from', `${esc(h.name)}`],
    ['Category', `${c.emoji} ${c.name}`],
    ['Listed', timeAgo(it.createdAt)],
  ].filter(Boolean);

  return `<div class="container">
    <button class="back" data-action="back">${icon('back')}Back</button>
    <div class="item-layout">
      <div class="item-main">
        <div class="item-hero">${thumb(it, 'thumb-xl')}${it.status !== 'available' ? `<span class="media-overlay lg">${ITEM_STATUS[it.status]}${activeLoan ? ` · back ${fmtDay(activeLoan.to)}` : ''}</span>` : ''}</div>
        <div class="card pad">
          <div class="row gap wrap">${typeBadge(it.type)}<a class="tag" href="#/browse?cat=${c.id}">${c.emoji} ${c.name}</a>${m && m.hostelId === it.hostelId && !mine ? '<span class="tag tag-green">● In your hostel</span>' : ''}</div>
          <div class="item-titlebar">
            <h1>${esc(it.title)}</h1>
            ${mine ? '' : `<button class="icon-btn lg ${saved ? 'fav-on' : ''}" data-action="fav" data-id="${it.id}" aria-label="Save">${icon('heart')}</button>`}
          </div>
          <div class="price-lg">${priceLabel(it, true)}${it.deposit ? `<span class="muted"> + ${rupee(it.deposit)} deposit</span>` : ''}</div>
          <p class="desc">${esc(it.desc).replace(/\n/g, '<br>')}</p>
          <dl class="facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
        </div>
        <a class="card pad owner-card" href="#/profile/${owner.id}">
          ${avatar(owner, 'lg')}
          <div class="grow"><div class="owner-name">${esc(owner.name)}${mine ? ' <span class="muted">(you)</span>' : ''}</div>
          <div class="muted">${esc(owner.dept)} · ${esc(owner.year)} · ${esc(getHostel(owner.hostelId).short)}</div>
          <div class="owner-stats">${stars(rating.avg, rating.count)}<span class="muted">· ${st.lent} shares completed</span></div></div>
          ${icon('chevron')}
        </a>
      </div>
      <aside class="item-side">${mine ? ownerPanel(it) : requestPanel(it)}</aside>
    </div>
    ${similar.length ? `<section class="section"><div class="section-head"><h2>More in ${c.name}</h2><a class="link" href="#/browse?cat=${c.id}">See all ${icon('chevron')}</a></div>${itemGrid(similar)}</section>` : ''}
  </div>`;
}

function ownerPanel(it) {
  const reqs = DB.requests.filter((r) => r.itemId === it.id).sort((a, b) => b.createdAt - a.createdAt);
  const open = reqs.filter((r) => ['pending', 'accepted', 'active'].includes(r.status));
  return `<div class="card pad sticky">
    <h3>Manage your listing</h3>
    <p class="muted small">Status: <b>${ITEM_STATUS[it.status]}</b>${qty(it) > 1 ? ` · ${unitsNote(it)}` : ''}${(() => { const n = sumUnits(DB.requests.filter((r) => r.itemId === it.id && r.status === 'accepted')); return n ? ` · <b>${n} reserved</b> for upcoming pickups` : ''; })()} · ${it.views} views</p>
    <div class="owner-actions">
      <a class="btn btn-ghost" href="#/edit/${it.id}">${icon('edit')}Edit</a>
      ${it.status === 'available' ? `<button class="btn btn-ghost" data-action="item-pause" data-id="${it.id}">${icon('pause')}Pause</button>` : ''}
      ${it.status === 'paused' ? `<button class="btn btn-ghost" data-action="item-resume" data-id="${it.id}">${icon('play')}Resume</button>` : ''}
      ${['sold', 'given'].includes(it.status) ? `<button class="btn btn-ghost" data-action="item-resume" data-id="${it.id}">${icon('refresh')}Relist</button>` : ''}
      <button class="btn btn-ghost danger" data-action="item-delete" data-id="${it.id}">${icon('trash')}Delete</button>
    </div>
    <h4 class="mt">Requests ${open.length ? `<span class="count">${open.length}</span>` : ''}</h4>
    ${reqs.length ? `<div class="mini-reqs">${reqs.map((r) => {
      const u = getUser(r.requesterId);
      return `<a class="mini-req" href="#/request/${r.id}">${avatar(u, 'sm')}<div class="grow"><b>${esc(u.name)}</b><small>${reqSummary(r)}</small></div>${statusPill(r.status)}</a>
        ${r.status === 'pending' ? `<div class="mini-actions">${acceptControls(r)}</div>` : ''}`;
    }).join('')}</div>` : '<p class="muted small">No requests yet. Share the link with your wing group to get it moving!</p>'}
    <button class="btn btn-soft btn-block mt" data-action="copy-link">${icon('send')}Copy link to share</button>
  </div>`;
}

/* Booking conflicts: dated items can't have overlapping accepted/active loans;
   sell/giveaway items can only be reserved for one person at a time. */
const isDated = (r) => r.type === 'lend' || r.type === 'rent';
const overlaps = (a, b) => a.from <= b.to && b.from <= a.to;
const qty = (it) => Math.max(1, Math.floor(+it.quantity || 1));
const units = (r) => Math.max(1, Math.floor(+r.units || 1)); // units one request asks for
const sumUnits = (list) => list.reduce((a, r) => a + units(r), 0);
function bookings(itemId, exceptId) {
  return DB.requests.filter((x) => x.itemId === itemId && x.id !== exceptId && ['accepted', 'active'].includes(x.status));
}
function addDays(iso, n) { const d = parseDay(iso); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
/* Highest number of units booked on any single day of [from, to] (sum of each booking's units). */
function peakLoad(itemId, from, to, exceptId) {
  const bs = bookings(itemId, exceptId).filter((b) => b.from && overlaps({ from, to }, b));
  let peak = 0, sample = null;
  for (let d = from, i = 0; d <= to && i < 400; d = addDays(d, 1), i++) {
    const cover = bs.filter((b) => b.from <= d && d <= b.to);
    const load = sumUnits(cover);
    if (load > peak) { peak = load; sample = cover[0]; }
  }
  return { peak, sample };
}
/* sell / giveaway: units not yet sold and not reserved by an accepted request */
const unitsLeft = (it, exceptId) => qty(it) - (it.sold || 0) - sumUnits(bookings(it.id, exceptId));
/* What blocks accepting / making this request? null when it's fine. */
function conflictFor(r) {
  const it = getItem(r.itemId), need = units(r);
  if (isDated(r)) {
    const { peak, sample } = peakLoad(it.id, r.from, r.to, r.id);
    const free = qty(it) - peak;
    return free >= need ? null : { ...(sample || {}), itemId: it.id, free, need, dated: true };
  }
  const free = unitsLeft(it, r.id);
  if (free >= need) return null;
  const b = bookings(it.id, r.id)[0];
  return { ...(b || {}), itemId: it.id, free: Math.max(0, free), need, soldOut: !b };
}
function conflictText(c) {
  const it = getItem(c.itemId), n = qty(it);
  if (n > 1 && c.free > 0) return c.dated ? `Only ${c.free} of ${n} free on these dates (needs ${c.need})` : `Only ${c.free} of ${n} left (needs ${c.need})`;
  if (c.soldOut || !c.requesterId) return n > 1 ? 'No units left' : 'Not available';
  const who = esc(getUser(c.requesterId).name.split(' ')[0]);
  if (c.dated) return n > 1 ? `All ${n} units booked on some of these dates` : `Clashes with ${who}’s booking (${fmtDay(c.from)} → ${fmtDay(c.to)})`;
  return n > 1 ? `All ${n} units are reserved` : `Already reserved for ${who}`;
}
/* Units committed to people right now — a listing's quantity can't go below this. */
function committedUnits(it) {
  if (isDated(it)) return Math.max(0, ...bookings(it.id).filter((b) => b.from).map((b) => peakLoad(it.id, b.from, b.to).peak));
  return (it.sold || 0) + sumUnits(bookings(it.id));
}
/* Derive available / on loan / sold from the requests, so the status can never drift. */
function syncItemStatus(it) {
  if (['removed', 'paused'].includes(it.status)) return;
  if (isDated(it)) {
    const out = sumUnits(DB.requests.filter((r) => r.itemId === it.id && r.status === 'active'));
    it.status = out >= qty(it) ? 'onloan' : 'available';
  } else {
    it.status = (it.sold || 0) >= qty(it) ? (it.type === 'sell' ? 'sold' : 'given') : 'available';
  }
}
function unitsNote(it) {
  const n = qty(it);
  if (n === 1) return '';
  if (isDated(it)) { const out = sumUnits(DB.requests.filter((r) => r.itemId === it.id && r.status === 'active')); return `${Math.max(0, n - out)} of ${n} free now`; }
  return `${Math.max(0, n - (it.sold || 0))} of ${n} left`;
}
function ownItem(id) {
  const it = getItem(id), m = me();
  if (!it || !m || it.ownerId !== m.id || it.status === 'removed') { toast('You can only manage your own listings', 'error'); render(); return null; }
  return it;
}
function ownWanted(id, status) {
  const w = getWanted(id), m = me();
  if (!w || !m || w.userId !== m.id || w.status !== status) { toast('That post has already changed — showing the latest.', 'error'); render(); return null; }
  return w;
}
const normTitle = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
let pendingPost = null; // a new listing waiting on the "duplicate?" question
function createItem(data) {
  const m = me();
  const it = { id: uid('i'), ownerId: m.id, hostelId: m.hostelId, createdAt: Date.now(), status: 'available', views: 0, sold: 0, ...data };
  DB.items.push(it);
  DB.wanted.filter((w) => w.status === 'open' && w.category === it.category && w.userId !== m.id).slice(0, 3).forEach((w) =>
    notify(w.userId, `New listing that might match your request “${esc(w.title)}”: <b>${esc(it.title)}</b>`, '/item/' + it.id));
  saveDB(); toast('Your item is live! 🎉', 'success'); go('/item/' + it.id);
}

/* Re-check a request before changing it: right person, right state (stale tab / double click safe). */
function guardReq(id, role, statuses) {
  const r = getReq(id), m = me();
  const okRole = r && m && (role === 'owner' ? r.ownerId === m.id : role === 'requester' ? r.requesterId === m.id : (r.ownerId === m.id || r.requesterId === m.id));
  if (!okRole || !statuses.includes(r.status)) { toast('That request has already changed — showing the latest.', 'error'); render(); return null; }
  return r;
}
function acceptControls(r, size = 'btn-sm') {
  const c = conflictFor(r);
  return `<div class="row gap wrap ${size === 'btn-sm' ? '' : 'mt'}">
    ${c ? `<span class="pill pill-red" title="${conflictText(c)}">${icon('calendar')}${conflictText(c)}</span>`
        : `<button class="btn btn-primary ${size}" data-action="req-accept" data-id="${r.id}">${icon('check')}Accept${size === 'btn-sm' ? '' : ' request'}</button>`}
    <button class="btn btn-ghost ${size}" data-action="req-decline" data-id="${r.id}">Decline</button></div>`;
}

function reqSummary(r) {
  const u = units(r) > 1 ? `${units(r)} units · ` : '';
  if (u && r.from) return u + `${fmtDay(r.from)} → ${fmtDay(r.to)}${r.total ? ` · ${rupee(r.total)}` : ''}`;
  if (u && r.offer != null) return u + `offered ${rupee(r.offer)} each`;
  if (u) return u + `requested ${timeAgo(r.createdAt)}`;
  if (r.from) return `${fmtDay(r.from)} → ${fmtDay(r.to)}${r.total ? ` · ${rupee(r.total)}` : ''}`;
  if (r.offer != null) return `Offered ${rupee(r.offer)}`;
  return `Requested ${timeAgo(r.createdAt)}`;
}

function requestPanel(it) {
  const m = me();
  const verb = TYPES[it.type].verb;
  if (!m) {
    return `<div class="card pad sticky">
      <div class="side-price">${priceLabel(it, true)}</div>
      <p class="muted">Log in with your campus account to ${TYPES[it.type].ing} this item and chat with the owner.</p>
      <a class="btn btn-primary btn-block btn-lg" href="#/login?next=${encodeURIComponent('/item/' + it.id)}">Log in to ${verb.toLowerCase()}</a>
      <a class="btn btn-ghost btn-block mt-sm" href="#/signup">Create account</a>
    </div>`;
  }
  const existing = DB.requests.find((r) => r.itemId === it.id && r.requesterId === m.id && ['pending', 'accepted', 'active'].includes(r.status));
  if (existing) {
    return `<div class="card pad sticky">
      <h3>Your request</h3>
      <div class="row between mt-sm">${statusPill(existing.status)}<span class="muted small">${timeAgo(existing.createdAt)}</span></div>
      <p class="mt-sm">${reqSummary(existing)}</p>
      <p class="muted small">${existing.status === 'pending' ? `Waiting for ${esc(getUser(it.ownerId).name.split(' ')[0])} to respond. You’ll get a notification.` : existing.status === 'accepted' ? 'Accepted! Open the request to coordinate pickup.' : 'You have this item right now.'}</p>
      <a class="btn btn-primary btn-block" href="#/request/${existing.id}">${icon('msg')}Open request & chat</a>
    </div>`;
  }
  if (['sold', 'given', 'paused'].includes(it.status)) {
    return `<div class="card pad sticky"><h3>Not available</h3><p class="muted">This item has been ${ITEM_STATUS[it.status].toLowerCase()}. Post a wanted request and others with something similar can reach you.</p>
      <button class="btn btn-primary btn-block" data-action="new-wanted" data-title="${esc(it.title)}" data-cat="${it.category}">${icon('megaphone')}Post a wanted request</button></div>`;
  }
  const dated = it.type === 'lend' || it.type === 'rent';
  if (!dated && unitsLeft(it) <= 0) {
    return `<div class="card pad sticky"><div class="side-price">${priceLabel(it, true)}</div>
      <div class="notice">${icon('clock')}Reserved for someone else right now. If they back out it’ll open up again.</div>
      <button class="btn ${me() && m.saved.includes(it.id) ? 'btn-soft' : 'btn-primary'} btn-block" data-action="fav" data-id="${it.id}">${icon('heart')}${m.saved.includes(it.id) ? 'Saved — check back later' : 'Save to check back later'}</button></div>`;
  }
  const loan = it.status === 'onloan' ? DB.requests.filter((r) => r.itemId === it.id && r.status === 'active').sort((a, b) => a.to.localeCompare(b.to))[0] : null;
  const booked = bookings(it.id).filter((b) => b.from && b.to >= isoDay(0)).sort((a, b) => a.from.localeCompare(b.from));
  const span = Math.min(3, it.maxDays || 3);
  // earliest window of `span` days (starting today) with at least one free unit every day
  let off = 0, start, end;
  for (; off < 60; off++) {
    start = isoDay(off); end = isoDay(off + span - 1);
    if (peakLoad(it.id, start, end).peak < qty(it)) break;
  }
  const quick = {
    lend: ['Need it for an exam 📝', 'Just for a day!', 'I’ll take good care of it 🙏'],
    rent: ['Need it for an event', 'Can pick up today', 'Flexible on dates'],
    sell: ['Is the price negotiable?', 'Can pick up today', 'Still available?'],
    free: ['Would really use this 🙏', 'Can pick up today', 'Thank you so much!'],
  }[it.type];
  afterRender.push(() => updateEstimate($('form[data-form=request]')));
  return `<div class="card pad sticky">
    <div class="side-price">${priceLabel(it, true)}</div>
    ${qty(it) > 1 ? `<div class="units">${icon('tag')}${qty(it)} units · ${unitsNote(it)}</div>` : ''}
    ${loan ? `<div class="notice">${icon('clock')}${qty(it) > 1 ? 'All units are' : 'It’s'} on loan until ${fmtDay(loan.to)} — you can still book later dates.</div>` : ''}
    ${dated && booked.length ? `<div class="booked"><span class="muted small">${qty(it) > 1 ? `Booked (${qty(it)} units — dates are full only when all are taken):` : 'Already booked:'}</span>${booked.map((b) => `<span class="pill pill-gray">${fmtDay(b.from)} → ${fmtDay(b.to)}</span>`).join('')}</div>` : ''}
    <form data-form="request" data-id="${it.id}" data-live="estimate" class="form">
      ${dated ? `<div class="two">
        <label>From<input type="date" name="from" min="${isoDay(0)}" value="${start}" required></label>
        <label>Until<input type="date" name="to" min="${isoDay(0)}" value="${end}" required></label>
      </div>
      <div class="estimate" id="estimate"></div>` : ''}
      ${qty(it) > 1 ? `<label>How many?<input type="number" name="units" min="1" max="${dated ? qty(it) : Math.max(1, unitsLeft(it))}" step="1" value="1" required><small class="muted">${dated ? `Up to ${qty(it)} units, if they’re free on your dates.` : `${unitsLeft(it)} of ${qty(it)} still available.`}</small></label>` : ''}
      ${it.type === 'sell' ? `<label>Your offer<div class="input-prefix"><span>₹</span><input type="number" name="offer" min="1" max="${it.price * 2}" step="1" value="${it.price}" required></div><small class="muted">Listed at ${rupee(it.price)} — you can offer less.</small></label>` : ''}
      <label>Pickup spot<select name="pickup">${PICKUPS.map((p) => `<option>${esc(p)}</option>`).join('')}</select></label>
      <label>Message to ${esc(getUser(it.ownerId).name.split(' ')[0])}<textarea name="message" rows="3" maxlength="400" placeholder="Say hi and why you need it…">Hi ${esc(getUser(it.ownerId).name.split(' ')[0])}! </textarea></label>
      <div class="chips quick">${quick.map((t) => `<button type="button" class="chip chip-sm" data-action="quick-msg" data-text="${esc(t)}">${esc(t)}</button>`).join('')}</div>
      <button class="btn btn-primary btn-block btn-lg">${verb} — send request</button>
      <p class="fine">${icon('shield')}No online payments. Settle in person at pickup. Only campus-verified students can request.</p>
    </form>
  </div>`;
}
function updateEstimate(f) {
  if (!f) return;
  const it = getItem(f.dataset.id);
  const box = $('#estimate', f);
  if (!box) return;
  const from = f.elements.from.value, to = f.elements.to.value;
  if (!from || !to || to < from) { box.innerHTML = '<span class="err">Pick an end date after the start date.</span>'; return; }
  const days = daysBetween(from, to);
  const over = it.maxDays && days > it.maxDays;
  const n = Math.max(1, Math.floor(+(f.elements.units ? f.elements.units.value : 1) || 1));
  let html = `${icon('calendar')}<span><b>${plural(days, 'day')}</b>${n > 1 ? ` × <b>${n} units</b>` : ''}`;
  if (it.type === 'rent') html += ` × ${rupee(it.price)} = <b>${rupee(days * it.price * n)}</b>`;
  else html += ' · free';
  if (it.deposit) html += ` <span class="muted">+ ${rupee(it.deposit * n)} refundable deposit</span>`;
  html += '</span>';
  if (over) html += `<span class="err">Owner lends for max ${plural(it.maxDays, 'day')}.</span>`;
  const { peak, sample: clash } = peakLoad(it.id, from, to);
  const free = qty(it) - peak;
  if (free <= 0) html += `<span class="err">${qty(it) > 1 ? `All ${qty(it)} units are booked on some of these days` : `These dates overlap a booking (${fmtDay(clash.from)} → ${fmtDay(clash.to)})`}.</span>`;
  else if (n > free) html += `<span class="err">Only ${free} of ${qty(it)} units are free on these dates.</span>`;
  else if (qty(it) > 1) html += `<span class="muted small">${free} of ${qty(it)} units free on these dates.</span>`;
  if (from < isoDay(0)) html += '<span class="err">Start date can’t be in the past.</span>';
  box.innerHTML = html;
  box.classList.toggle('bad', !!(over || n > free || from < isoDay(0)));
}

/* ---------- Post / edit listing ---------- */
function pagePost(q, editId) {
  const m = me();
  if (!m) return loginPrompt('to list an item');
  const it = editId ? getItem(editId) : null;
  if (editId && (!it || it.ownerId !== m.id)) return `<div class="container narrow">${emptyState('🚫', 'Can’t edit this', 'You can only edit your own listings.', '<a class="btn btn-primary" href="#/">Go home</a>')}</div>`;
  const v = it || { title: '', category: 'electronics', type: 'lend', price: '', deposit: 0, maxDays: 7, condition: 'Good', desc: '', emoji: null, image: null };
  const emoji = v.emoji || cat(v.category).emoji;
  afterRender.push(() => { const f = $('form[data-form=post]'); if (f) { if (it) f.dataset.emojiTouched = '1'; updatePostForm(f); } });

  return `<div class="container">
    <div class="page-head"><div><h1>${it ? 'Edit listing' : 'List an item'}</h1><p class="muted">${it ? 'Changes go live immediately.' : 'Takes under a minute. Lending a thing you rarely use makes someone’s week.'}</p></div></div>
    <div class="post-layout">
      <form class="card pad form" data-form="post" data-live="post" ${it ? `data-id="${it.id}"` : ''} data-type="${v.type}">
        <fieldset>
          <legend>How do you want to share it?</legend>
          <div class="seg">${Object.entries(TYPES).map(([k, t]) => `<label class="seg-opt"><input type="radio" name="type" value="${k}" ${v.type === k ? 'checked' : ''}><span><i class="dot-${k}"></i><b>${t.label}</b><small>${t.desc}</small></span></label>`).join('')}</div>
        </fieldset>
        <label>Title<input name="title" required maxlength="80" placeholder="e.g. Casio fx-991EX calculator" value="${esc(v.title)}"></label>
        <div class="three">
          <label>Category<select name="category">${CATEGORIES.map((c) => `<option value="${c.id}" ${v.category === c.id ? 'selected' : ''}>${c.emoji} ${c.name}</option>`).join('')}</select></label>
          <label>Condition<select name="condition">${CONDITIONS.map((c) => `<option ${v.condition === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
          <label>Quantity<input type="number" name="quantity" min="1" max="50" step="1" value="${v.quantity || 1}" required><small class="muted">Own more than one? List them together.</small></label>
        </div>
        <div class="two">
          <label class="f-price">Price<div class="input-prefix"><span>₹</span><input type="number" name="price" min="0" step="1" value="${v.price || ''}" placeholder="0"><span class="suffix f-perday">/day</span></div></label>
          <label class="f-deposit">Refundable deposit <span class="muted">(optional)</span><div class="input-prefix"><span>₹</span><input type="number" name="deposit" min="0" step="1" value="${v.deposit || ''}" placeholder="0"></div></label>
          <label class="f-days">Max lending period<select name="maxDays">${[1, 2, 3, 5, 7, 10, 14, 30].map((d) => `<option value="${d}" ${+v.maxDays === d ? 'selected' : ''}>${plural(d, 'day')}</option>`).join('')}</select></label>
        </div>
        <label>Description<textarea name="desc" rows="4" maxlength="600" placeholder="Brand, what’s included, any quirks, when you’re usually free for pickup…">${esc(v.desc)}</textarea></label>
        <fieldset>
          <legend>Photo</legend>
          <div class="photo-row">
            <label class="photo-drop">${icon('camera')}<span>${v.image ? 'Change photo' : 'Upload a photo'}</span><input type="file" name="photo" accept="image/*" hidden></label>
            <input type="hidden" name="image" value="${v.image ? esc(v.image) : ''}">
            <span class="muted small">or pick an icon:</span>
          </div>
          <div class="emoji-pick">${EMOJI_PALETTE.map((e) => `<label><input type="radio" name="emoji" value="${e}" ${e === emoji ? 'checked' : ''}><span>${e}</span></label>`).join('')}</div>
          <button type="button" class="link-btn small ${v.image ? '' : 'hidden'}" data-action="remove-photo">Remove photo</button>
        </fieldset>
        <div class="row end gap">
          <a class="btn btn-ghost" href="${it ? `#/item/${it.id}` : '#/'}">Cancel</a>
          <button class="btn btn-primary btn-lg">${it ? 'Save changes' : 'Publish listing'}</button>
        </div>
      </form>
      <aside class="post-preview">
        <h4 class="muted">Live preview</h4>
        <div id="post-preview" class="preview-card"></div>
        <div class="tips card pad">
          <h4>${icon('sparkle')}Tips for a quick yes</h4>
          <ul><li>Use the exact model name — people search for it.</li><li>Mention what’s included (case, charger, cables).</li><li>A small deposit protects costly items.</li></ul>
        </div>
      </aside>
    </div>
  </div>`;
}
function updatePostForm(f) {
  const type = f.querySelector('input[name=type]:checked')?.value || 'lend';
  f.dataset.type = type;
  const data = {
    id: 'preview', ownerId: me().id, hostelId: me().hostelId, title: f.elements.title.value.trim() || 'Your item title',
    category: f.elements.category.value, type, price: +f.elements.price.value || 0, quantity: +f.elements.quantity.value || 1, sold: 0, condition: f.elements.condition.value, desc: '',
    createdAt: Date.now(), status: 'available', emoji: f.querySelector('input[name=emoji]:checked')?.value, image: f.elements.image.value || null,
  };
  $('#post-preview').innerHTML = itemCard(data).replace('href="#/item/preview"', 'href="javascript:void 0" tabindex="-1"');
  $('[data-action=remove-photo]', f)?.classList.toggle('hidden', !f.elements.image.value);
}
function resizeImage(file, max = 640) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => { img.src = reader.result; };
    reader.onerror = reject;
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', 0.78));
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ---------- Wanted ---------- */
function pageWanted(q) {
  const m = me();
  const showClosed = q.closed === '1';
  let list = DB.wanted.filter((w) => showClosed || w.status === 'open');
  if (q.cat) list = list.filter((w) => w.category === q.cat);
  if (q.hostel) list = list.filter((w) => w.hostelId === q.hostel);
  if (q.mine === '1' && m) list = list.filter((w) => w.userId === m.id);
  list.sort((a, b) => (a.status === 'open') === (b.status === 'open') ? a.neededBy.localeCompare(b.neededBy) : a.status === 'open' ? -1 : 1);
  const chipW = (key, val, label) => `<button class="chip ${(q[key] || '') === val ? 'on' : ''}" data-action="filter" data-route="/wanted" data-key="${key}" data-val="${val}">${label}</button>`;
  return `<div class="container">
    <div class="wanted-hero card">
      <div><span class="eyebrow">${icon('megaphone')} Wanted board</span><h1>Can’t find it? Ask your campus.</h1>
      <p class="muted">Post what you need. Students who have it get to offer — usually within the hour.</p></div>
      <button class="btn btn-primary btn-lg" data-action="new-wanted">${icon('plus')}Post a request</button>
    </div>
    <div class="toolbar">
      <div class="chips">${chipW('cat', '', 'All')}${CATEGORIES.slice(0, 10).map((c) => chipW('cat', c.id, `${c.emoji} ${c.name}`)).join('')}</div>
      <div class="row gap">
        ${m ? `<button class="chip ${q.mine === '1' ? 'on' : ''}" data-action="filter" data-route="/wanted" data-key="mine" data-val="${q.mine === '1' ? '' : '1'}">My posts</button>` : ''}
        <button class="chip ${showClosed ? 'on' : ''}" data-action="filter" data-route="/wanted" data-key="closed" data-val="${showClosed ? '' : '1'}">Show fulfilled</button>
      </div>
    </div>
    ${list.length ? `<div class="wanted-grid">${list.map(wantedCard).join('')}</div>` : emptyState('🙌', 'No open requests here', 'Everyone has what they need. Be the first to ask!', `<button class="btn btn-primary" data-action="new-wanted">Post a request</button>`)}
  </div>`;
}
function wantedForm(prefill = {}) {
  return `<form data-form="wanted" class="form">
    <label>What do you need?<input name="title" required maxlength="80" value="${esc(prefill.title || '')}" placeholder="e.g. Lab coat for tomorrow"></label>
    <div class="two">
      <label>Category<select name="category">${CATEGORIES.map((c) => `<option value="${c.id}" ${prefill.cat === c.id ? 'selected' : ''}>${c.emoji} ${c.name}</option>`).join('')}</select></label>
      <label>Needed by<input type="date" name="neededBy" min="${isoDay(0)}" value="${isoDay(1)}" required></label>
    </div>
    <div class="two">
      <label>I want to<select name="mode">${Object.entries(WANT_MODES).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
      <label>Budget <span class="muted">(optional)</span><div class="input-prefix"><span>₹</span><input type="number" name="budget" min="0" placeholder="0"></div></label>
    </div>
    <label>Details<textarea name="desc" rows="3" maxlength="400" placeholder="Size, model, how long you need it, when you can pick up…"></textarea></label>
    <p class="fine">${icon('bell')}We’ll notify you the moment someone offers.</p>
    <div class="row end gap"><button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button><button class="btn btn-primary">Post request</button></div>
  </form>`;
}
function pageWantedDetail(q, id) {
  const w = getWanted(id);
  if (!w) return `<div class="container narrow">${emptyState('🧐', 'Request not found', 'It may have been removed.', '<a class="btn btn-primary" href="#/wanted">Wanted board</a>')}</div>`;
  const m = me(), u = getUser(w.userId), urg = urgency(w.neededBy), c = cat(w.category);
  const mine = m && m.id === w.userId;
  const myItems = m ? DB.items.filter((i) => i.ownerId === m.id && i.status === 'available') : [];
  const suggestions = DB.items.filter((i) => i.category === w.category && i.status === 'available' && i.ownerId !== w.userId).slice(0, 4);
  const alreadyOffered = m && w.offers.some((o) => o.userId === m.id);

  const offerHtml = w.offers.map((o) => {
    const ou = getUser(o.userId), oi = o.itemId ? getItem(o.itemId) : null;
    const accepted = w.acceptedOffer === o.id;
    return `<div class="offer ${accepted ? 'accepted' : ''}">
      ${avatar(ou, 'md')}
      <div class="grow">
        <div class="row between"><a href="#/profile/${ou.id}"><b>${esc(ou.name)}</b></a><span class="muted small">${timeAgo(o.at)}</span></div>
        <div class="muted small">${esc(getHostel(ou.hostelId).name)} · ${stars(userRating(ou.id).avg, userRating(ou.id).count, true)}</div>
        <p>${esc(o.text)}</p>
        ${oi ? `<a class="offer-item" href="#/item/${oi.id}">${thumb(oi, 'thumb-sm')}<span><b>${esc(oi.title)}</b><small>${priceLabel(oi)}</small></span>${icon('chevron')}</a>` : ''}
        ${accepted ? '<span class="pill pill-green">✓ Accepted</span>' : ''}
        ${mine && w.status === 'open' ? `<div class="row gap mt-sm"><button class="btn btn-primary btn-sm" data-action="offer-accept" data-id="${w.id}" data-offer="${o.id}">${icon('check')}Accept offer</button>${oi ? `<a class="btn btn-ghost btn-sm" href="#/item/${oi.id}">View & request item</a>` : ''}</div>` : ''}
      </div>
    </div>`;
  }).join('');

  return `<div class="container narrow-lg">
    <button class="back" data-action="back">${icon('back')}Back</button>
    <div class="card pad wanted-detail">
      <div class="row between wrap gap">
        <div class="row gap"><span class="wanted-emoji lg" style="--hue:${c.hue}">${c.emoji}</span>
          <div><div class="row gap wrap">${w.status === 'open' ? `<span class="pill pill-${urg.cls}">${icon('clock')}${urg.label}</span>` : '<span class="pill pill-green">✓ Fulfilled</span>'}<span class="tag">${WANT_MODES[w.mode]}</span>${w.budget ? `<span class="tag">Budget ${rupee(w.budget)}</span>` : ''}</div>
          <h1>${esc(w.title)}</h1></div></div>
        ${mine && w.status === 'open' ? `<button class="btn btn-ghost" data-action="wanted-close" data-id="${w.id}">${icon('check')}Mark as fulfilled</button>` : ''}
        ${mine && w.status !== 'open' ? `<button class="btn btn-ghost" data-action="wanted-reopen" data-id="${w.id}">${icon('refresh')}Reopen</button>` : ''}
      </div>
      <p class="desc">${esc(w.desc) || '<span class="muted">No extra details.</span>'}</p>
      <div class="row gap wrap muted small"><span>${icon('calendar')}Needed by ${fmtDay(w.neededBy)}</span><span>${icon('pin')}${esc(getHostel(w.hostelId).name)}</span><span>${icon('clock')}Posted ${timeAgo(w.createdAt)}</span></div>
      <a class="poster" href="#/profile/${u.id}">${avatar(u, 'sm')}<span>Posted by <b>${esc(u.name)}</b>${mine ? ' (you)' : ''}</span></a>
    </div>

    <h2 class="mt-lg">${plural(w.offers.length, 'offer')}</h2>
    ${w.offers.length ? `<div class="offers">${offerHtml}</div>` : `<p class="muted">No offers yet${mine ? ' — we’ll notify you when someone responds.' : '. Be the first to help!'}</p>`}

    ${!mine && w.status === 'open' ? (m ? (alreadyOffered ? '<div class="notice mt">You’ve already offered to help. The poster will get back to you.</div>' : `<form class="card pad form mt" data-form="offer" data-id="${w.id}">
        <h3>I can help</h3>
        <label>Message<textarea name="text" rows="3" required maxlength="400" placeholder="I have one you can borrow — when do you need it?"></textarea></label>
        ${myItems.length ? `<label>Attach one of your listings <span class="muted">(optional)</span><select name="itemId"><option value="">— None —</option>${myItems.map((i) => `<option value="${i.id}" ${i.category === w.category ? 'selected' : ''}>${esc(i.title)}</option>`).join('')}</select></label>` : ''}
        <div class="row end"><button class="btn btn-primary">${icon('send')}Send offer</button></div>
      </form>`) : `<div class="card pad mt row between wrap gap"><span>Have this? Log in to offer help.</span><a class="btn btn-primary" href="#/login?next=${encodeURIComponent('/wanted/' + w.id)}">Log in</a></div>`) : ''}

    ${mine && suggestions.length && w.status === 'open' ? `<section class="section"><div class="section-head"><h2>${icon('sparkle')}Already listed on campus</h2></div>${itemGrid(suggestions)}</section>` : ''}
  </div>`;
}

/* ---------- Hostels ---------- */
function pageHostels() {
  const m = me();
  return `<div class="container">
    <div class="page-head"><div><h1>Hostels</h1><p class="muted">Every hall on campus, and what they’re sharing.</p></div></div>
    <div class="hostel-grid">${DB.hostels.map((h) => {
      const items = DB.items.filter((i) => i.hostelId === h.id && i.status === 'available').length;
      const members = DB.users.filter((u) => u.hostelId === h.id);
      const wants = DB.wanted.filter((w) => w.hostelId === h.id && w.status === 'open').length;
      return `<a class="hostel-card card" href="#/hostel/${h.id}" style="--c:${h.color}">
        <div class="hostel-banner"><span>${h.emoji}</span>${m && m.hostelId === h.id ? '<span class="pill pill-white">Your hostel</span>' : ''}</div>
        <div class="pad">
          <div class="row between"><h3>${esc(h.name)}</h3><span class="tag">${h.kind}</span></div>
          <p class="muted small">${esc(h.about)}</p>
          <div class="hostel-stats"><div><b>${items}</b><span>items</span></div><div><b>${wants}</b><span>wanted</span></div><div><b>${members.length}</b><span>members</span></div></div>
          <div class="avatars">${members.slice(0, 5).map((u) => avatar(u, 'sm')).join('')}</div>
        </div></a>`;
    }).join('')}</div>
  </div>`;
}
function pageHostel(q, id) {
  const h = DB.hostels.find((x) => x.id === id);
  if (!h) return `<div class="container narrow">${emptyState('🏚️', 'Hostel not found', '', '<a class="btn btn-primary" href="#/hostels">All hostels</a>')}</div>`;
  const m = me();
  const items = DB.items.filter((i) => i.hostelId === h.id && isVisibleItem(i)).sort((a, b) => (a.status === 'available' ? 0 : 1) - (b.status === 'available' ? 0 : 1) || b.createdAt - a.createdAt);
  const members = DB.users.filter((u) => u.hostelId === h.id);
  const wants = DB.wanted.filter((w) => w.hostelId === h.id && w.status === 'open');
  return `<div class="hostel-hero" style="--c:${h.color}">
      <div class="container"><a class="back light" href="#/hostels">${icon('back')}All hostels</a>
      <div class="row gap"><span class="hh-emoji">${h.emoji}</span><div><h1>${esc(h.name)}</h1><p>${h.kind} · ${h.blocks} · ${h.capacity} residents</p></div></div>
      <p class="hh-about">${esc(h.about)}</p></div>
    </div>
    <div class="container">
      <div class="stat-row">
        <div class="stat-box"><b>${items.filter((i) => i.status === 'available').length}</b><span>Available items</span></div>
        <div class="stat-box"><b>${wants.length}</b><span>Open wanted</span></div>
        <div class="stat-box"><b>${members.length}</b><span>Active sharers</span></div>
        <div class="stat-box"><b>${DB.requests.filter((r) => getItem(r.itemId)?.hostelId === h.id && r.status === 'completed').length + 30}</b><span>Shares completed</span></div>
      </div>
      ${wants.length ? `<section class="section"><div class="section-head"><h2>Wanted in ${esc(h.short)}</h2><a class="link" href="#/wanted?hostel=${h.id}">See all ${icon('chevron')}</a></div><div class="wanted-grid">${wants.map(wantedCard).join('')}</div></section>` : ''}
      <section class="section"><div class="section-head"><h2>Listings</h2><a class="link" href="#/browse?hostel=${h.id}">Filter in browse ${icon('chevron')}</a></div>
        ${itemGrid(items, emptyState('📦', 'No listings yet', 'Be the first in this hostel to share something.', '<a class="btn btn-primary" href="#/post">List an item</a>'))}</section>
      <section class="section"><div class="section-head"><h2>Members</h2></div>
        <div class="member-grid">${members.map((u) => { const r = userRating(u.id); return `<a class="member card" href="#/profile/${u.id}">${avatar(u, 'md')}<div><b>${esc(u.name)}${m && m.id === u.id ? ' (you)' : ''}</b><small>${esc(u.dept)} · ${esc(u.year)}</small>${stars(r.avg, r.count, true)}</div></a>`; }).join('')}</div>
      </section>
    </div>`;
}

/* ---------- Requests ---------- */
function pageRequests(q) {
  const m = me();
  if (!m) return loginPrompt('to see your requests');
  const tab = q.tab || (DB.requests.some((r) => r.ownerId === m.id && r.status === 'pending') ? 'received' : 'sent');
  const status = q.status || 'all';
  const groups = { all: null, pending: ['pending'], ongoing: ['accepted', 'active'], completed: ['completed'], closed: ['declined', 'cancelled'] };
  const base = DB.requests.filter((r) => (tab === 'received' ? r.ownerId : r.requesterId) === m.id);
  const list = base.filter((r) => !groups[status] || groups[status].includes(r.status)).sort((a, b) => {
    const rank = (r) => ({ pending: 0, accepted: 1, active: 2, completed: 3, declined: 4, cancelled: 5 }[r.status]);
    return rank(a) - rank(b) || b.updatedAt - a.updatedAt;
  });
  const recvPending = DB.requests.filter((r) => r.ownerId === m.id && r.status === 'pending').length;
  const sentOpen = DB.requests.filter((r) => r.requesterId === m.id && ['pending', 'accepted', 'active'].includes(r.status)).length;
  const count = (g) => base.filter((r) => !groups[g] || groups[g].includes(r.status)).length;

  const rows = list.map((r) => {
    const it = getItem(r.itemId), other = getUser(tab === 'received' ? r.requesterId : r.ownerId);
    const overdue = r.status === 'active' && r.to < isoDay(0);
    return `<a class="req-row card" href="#/request/${r.id}">
      ${thumb(it, 'thumb-sm')}
      <div class="grow">
        <div class="req-title">${esc(it.title)}</div>
        <div class="req-sub">${avatar(other, 'xs')}<span>${tab === 'received' ? `<b>${esc(other.name)}</b> wants to ${TYPES[r.type].ing}` : `from <b>${esc(other.name)}</b>`}</span></div>
        <div class="req-meta">${reqSummary(r)} · ${timeAgo(r.updatedAt)}${overdue ? ' · <span class="err">Overdue</span>' : ''}</div>
      </div>
      <div class="req-right">${statusPill(r.status)}
        ${tab === 'received' && r.status === 'pending' ? acceptControls(r) : ''}
        ${r.messages.length ? `<span class="muted small">${icon('msg')}${r.messages.length}</span>` : ''}
      </div>
    </a>`;
  }).join('');

  return `<div class="container narrow-lg">
    <div class="page-head"><div><h1>Requests</h1><p class="muted">Everything you’re lending and borrowing, in one place.</p></div></div>
    <div class="tabs">
      <a class="tab-btn ${tab === 'received' ? 'on' : ''}" href="#/requests?tab=received">Received${recvPending ? `<span class="count">${recvPending}</span>` : ''}</a>
      <a class="tab-btn ${tab === 'sent' ? 'on' : ''}" href="#/requests?tab=sent">Sent${sentOpen ? `<span class="count muted-count">${sentOpen}</span>` : ''}</a>
    </div>
    <div class="chips mb">${Object.keys(groups).map((g) => `<a class="chip ${status === g ? 'on' : ''}" href="#/requests${qs({ tab, status: g === 'all' ? '' : g })}">${g[0].toUpperCase() + g.slice(1)} <span class="muted">${count(g)}</span></a>`).join('')}</div>
    ${rows ? `<div class="req-list">${rows}</div>` : emptyState(tab === 'received' ? '📭' : '📤', tab === 'received' ? 'No requests here' : 'You haven’t requested anything here', tab === 'received' ? 'List more items to get requests from your campus.' : 'Find something you need and send your first request.',
      `<a class="btn btn-primary" href="#/${tab === 'received' ? 'post' : 'browse'}">${tab === 'received' ? 'List an item' : 'Browse items'}</a>`)}
  </div>`;
}

function pageRequest(q, id) {
  const m = me();
  if (!m) return loginPrompt('to view this request');
  const r = getReq(id);
  if (!r || (r.ownerId !== m.id && r.requesterId !== m.id)) return `<div class="container narrow">${emptyState('🔒', 'Request not found', 'Only the people involved can see a request.', '<a class="btn btn-primary" href="#/requests">My requests</a>')}</div>`;
  const it = getItem(r.itemId), isOwner = r.ownerId === m.id;
  const other = getUser(isOwner ? r.requesterId : r.ownerId);
  const dated = r.type === 'lend' || r.type === 'rent';
  const steps = dated ? ['Requested', 'Accepted', 'Handed over', 'Returned'] : ['Requested', 'Accepted', 'Handed over'];
  const idx = { pending: 0, accepted: 1, active: 2, completed: dated ? 3 : 2 }[r.status];
  const closed = r.status === 'declined' || r.status === 'cancelled';
  const revealed = ['accepted', 'active', 'completed'].includes(r.status);
  const overdue = r.status === 'active' && r.to < isoDay(0);
  const daysLeft = r.status === 'active' ? Math.round((parseDay(r.to) - parseDay(isoDay(0))) / DAY) : null;
  const reviewed = isOwner ? r.reviewedByOwner : r.reviewedByRequester;
  afterRender.push(() => { const c = $('#chat-log'); if (c) c.scrollTop = c.scrollHeight; });

  let actions = '';
  if (isOwner && r.status === 'pending') actions = acceptControls(r, '');
  if (!isOwner && r.status === 'pending') actions = `<button class="btn btn-ghost danger" data-action="req-cancel" data-id="${r.id}">Cancel request</button>`;
  if (isOwner && r.status === 'accepted') actions = `<button class="btn btn-primary" data-action="req-handover" data-id="${r.id}">${icon('swap')}${dated ? 'Mark as handed over' : 'Mark as handed over & complete'}</button><button class="btn btn-ghost" data-action="req-cancel" data-id="${r.id}">Cancel</button>`;
  if (!isOwner && r.status === 'accepted') actions = `<button class="btn btn-ghost danger" data-action="req-cancel" data-id="${r.id}">Cancel request</button>`;
  if (isOwner && r.status === 'active') actions = `<button class="btn btn-primary" data-action="req-return" data-id="${r.id}">${icon('check')}Confirm item returned</button>`;
  if (!isOwner && r.status === 'active') actions = r.returnMarked
    ? `<span class="pill pill-blue">${icon('clock')}Waiting for ${esc(other.name.split(' ')[0])} to confirm</span>`
    : `<button class="btn btn-primary" data-action="req-mark-returned" data-id="${r.id}">${icon('swap')}I’ve returned it</button>`;
  if (r.status === 'completed' && !reviewed) actions = `<button class="btn btn-primary" data-action="review" data-id="${r.id}">★ Rate ${esc(other.name.split(' ')[0])}</button>`;

  const hint = {
    pending: isOwner ? `${esc(other.name.split(' ')[0])} is waiting for your reply. Accepting shares your room number so you can meet.` : `Waiting for ${esc(other.name.split(' ')[0])} to accept. Most owners reply within a few hours.`,
    accepted: isOwner ? 'Meet at the pickup spot and tap “handed over” once they have it.' : `Accepted! Meet ${esc(other.name.split(' ')[0])} at the pickup spot.${r.deposit || it.deposit ? ' Bring the deposit in cash/UPI.' : ''}`,
    active: r.returnMarked ? (isOwner ? `<b>${esc(other.name.split(' ')[0])} says they’ve returned it.</b> Check the item, then confirm below.` : 'You marked this as returned. The owner will confirm once they check it.')
      : overdue ? `This item is <b>overdue by ${plural(-daysLeft, 'day')}</b>.` : isOwner ? `With ${esc(other.name.split(' ')[0])} — due back ${fmtDay(r.to)}.` : `Enjoy! Please return it by <b>${fmtDay(r.to)}</b>${daysLeft >= 0 ? ` (${daysLeft === 0 ? 'today' : plural(daysLeft, 'day') + ' left'})` : ''}.`,
    completed: reviewed ? 'All done — thanks for sharing! 🎉' : 'All done! Leave a quick rating to help build trust on campus.',
    declined: 'This request was declined.',
    cancelled: 'This request was cancelled.',
  }[r.status];

  return `<div class="container narrow-lg">
    <button class="back" data-action="back">${icon('back')}Back</button>
    <div class="req-layout">
      <div>
        <a class="card pad req-head" href="#/item/${it.id}">${thumb(it, 'thumb-md')}<div class="grow"><div class="row gap wrap">${typeBadge(r.type)}${statusPill(r.status)}</div><h1>${esc(it.title)}</h1><div class="muted">${priceLabel(it, true)}</div></div>${icon('chevron')}</a>

        <div class="card pad">
          ${closed ? `<div class="notice ${r.status === 'declined' ? 'red' : ''}">${hint}</div>` : `<ol class="steps">${steps.map((s, i) => `<li class="${i < idx || r.status === 'completed' ? 'done' : i === idx ? 'current' : ''}"><span>${i < idx || r.status === 'completed' ? icon('check') : i + 1}</span>${s}</li>`).join('')}</ol>
          <div class="notice ${overdue ? 'red' : ''}">${hint}</div>`}
          <dl class="facts">
            ${r.from ? `<div><dt>Dates</dt><dd>${fmtDay(r.from)} → ${fmtDay(r.to)} <span class="muted">(${plural(daysBetween(r.from, r.to), 'day')})</span></dd></div>` : ''}
            ${units(r) > 1 ? `<div><dt>Units</dt><dd>${units(r)} of ${qty(it)}</dd></div>` : ''}
            ${r.total ? `<div><dt>Rent total</dt><dd>${rupee(r.total)}</dd></div>` : ''}
            ${it.deposit && dated ? `<div><dt>Deposit</dt><dd>${rupee(it.deposit * units(r))} <span class="muted">refundable</span></dd></div>` : ''}
            ${r.offer != null ? `<div><dt>Offer</dt><dd>${rupee(r.offer)} <span class="muted">(listed ${rupee(it.price)})</span></dd></div>` : ''}
            <div><dt>Pickup</dt><dd>${esc(r.pickup)}</dd></div>
            <div><dt>Requested</dt><dd>${timeAgo(r.createdAt)}</dd></div>
          </dl>
          ${actions ? `<div class="row gap wrap mt">${actions}</div>` : ''}
        </div>

        <div class="card chat">
          <div class="chat-head">${avatar(other, 'sm')}<div><b>${esc(other.name)}</b><small>${revealed ? `${icon('pin')}${esc(getHostel(other.hostelId).name)}, Room ${esc(other.room)}` : 'Room number shared once accepted'}</small></div></div>
          <div class="chat-log" id="chat-log">
            ${r.messages.length ? r.messages.map((msg) => `<div class="bubble ${msg.from === m.id ? 'me' : ''}"><p>${esc(msg.text)}</p><small>${timeAgo(msg.at)}</small></div>`).join('') : '<p class="muted center small">No messages yet. Say hi 👋</p>'}
          </div>
          ${closed ? '<p class="muted small center pad">Chat is closed for this request.</p>' : `<form class="chat-form" data-form="chat" data-id="${r.id}"><input name="text" placeholder="Message ${esc(other.name.split(' ')[0])}…" autocomplete="off" maxlength="500" required><button class="btn btn-primary" aria-label="Send">${icon('send')}</button></form>`}
        </div>
      </div>
      <aside>
        <a class="card pad person" href="#/profile/${other.id}">
          ${avatar(other, 'lg')}<b>${esc(other.name)}</b>
          <span class="muted small">${isOwner ? 'Requester' : 'Owner'} · ${esc(other.dept)}</span>
          ${stars(userRating(other.id).avg, userRating(other.id).count)}
          <span class="muted small">${userStats(other.id).lent} lent · ${userStats(other.id).borrowed} borrowed</span>
        </a>
        <div class="card pad small safety">
          <h4>${icon('shield')}Safe sharing</h4>
          <ul><li>Meet in common areas on campus.</li><li>Check the item together at handover.</li><li>Pay rent/deposit only in person.</li></ul>
        </div>
      </aside>
    </div>
  </div>`;
}

/* ---------- Profile & saved ---------- */
function pageProfile(q, id) {
  const u = getUser(id);
  if (!u) return `<div class="container narrow">${emptyState('👤', 'User not found', '', '<a class="btn btn-primary" href="#/">Go home</a>')}</div>`;
  const m = me(), mine = m && m.id === u.id;
  const r = userRating(u.id), st = userStats(u.id), h = getHostel(u.hostelId);
  const items = DB.items.filter((i) => i.ownerId === u.id && isVisibleItem(i)).sort((a, b) => b.createdAt - a.createdAt);
  const wants = DB.wanted.filter((w) => w.userId === u.id && (mine || w.status === 'open'));
  const reviews = DB.reviews.filter((rv) => rv.toId === u.id).sort((a, b) => b.at - a.at);
  return `<div class="container">
    <div class="profile-card card">
      <div class="profile-cover" style="--c:${u.color}"></div>
      <div class="profile-body">
        ${avatar(u, 'xl')}
        <div class="grow">
          <div class="row between wrap gap"><div><h1>${esc(u.name)}</h1><p class="muted">${esc(u.dept)} · ${esc(u.year)}</p></div>
          ${mine ? `<button class="btn btn-ghost" data-action="edit-profile">${icon('edit')}Edit profile</button>` : ''}</div>
          <div class="row gap wrap mt-sm"><a class="tag" href="#/hostel/${h.id}">${h.emoji} ${esc(h.name)}</a>${mine ? `<span class="tag">Room ${esc(u.room)}</span>` : ''}<span class="tag">Joined ${new Date(u.joinedAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span><span class="tag tag-green">${icon('shield')}Campus verified</span></div>
          ${u.bio ? `<p class="bio">${esc(u.bio)}</p>` : ''}
        </div>
      </div>
      <div class="profile-stats">
        <div><b>${r.count ? r.avg.toFixed(1) + '★' : '—'}</b><span>${plural(r.count, 'review')}</span></div>
        <div><b>${st.listings}</b><span>listings</span></div>
        <div><b>${st.lent}</b><span>lent</span></div>
        <div><b>${st.borrowed}</b><span>borrowed</span></div>
      </div>
    </div>
    <section class="section"><div class="section-head"><h2>${mine ? 'Your listings' : `${esc(u.name.split(' ')[0])}’s listings`}</h2>${mine ? `<a class="btn btn-primary btn-sm" href="#/post">${icon('plus')}List an item</a>` : ''}</div>
      ${itemGrid(items, emptyState('📦', 'No listings yet', mine ? 'List your first item — it only takes a minute.' : 'Nothing listed right now.', mine ? '<a class="btn btn-primary" href="#/post">List an item</a>' : ''))}</section>
    ${wants.length ? `<section class="section"><div class="section-head"><h2>Wanted posts</h2></div><div class="wanted-grid">${wants.map(wantedCard).join('')}</div></section>` : ''}
    <section class="section"><div class="section-head"><h2>Reviews</h2></div>
      ${reviews.length ? `<div class="reviews">${reviews.map((rv) => { const f = getUser(rv.fromId); return `<div class="review card pad">${avatar(f, 'sm')}<div><div class="row gap"><b>${esc(f.name)}</b><span class="star-row">${'★'.repeat(rv.stars)}<span class="dim">${'★'.repeat(5 - rv.stars)}</span></span></div><p>${esc(rv.text)}</p><small class="muted">${timeAgo(rv.at)}</small></div></div>`; }).join('')}</div>` : '<p class="muted">No reviews yet.</p>'}
    </section>
  </div>`;
}
function pageSaved() {
  const m = me();
  if (!m) return loginPrompt('to see saved items');
  const items = m.saved.map(getItem).filter((i) => i && isVisibleItem(i));
  return `<div class="container">
    <div class="page-head"><div><h1>Saved items</h1><p class="muted">Tap the ♥ on any item to keep it here.</p></div></div>
    ${itemGrid(items, emptyState('💜', 'Nothing saved yet', 'Save items you might need later — like that cycle for the weekend.', '<a class="btn btn-primary" href="#/browse">Browse items</a>'))}
  </div>`;
}

/* ---------- Auth ---------- */
function demoAccounts() {
  return `<div class="demo-accounts">${DB.users.slice(0, 6).map((u) => `<button class="demo-acc" data-action="demo-login" data-id="${u.id}">${avatar(u, 'sm')}<span><b>${esc(u.name)}</b><small>${esc(getHostel(u.hostelId).short)} · ${esc(u.dept)}</small></span></button>`).join('')}</div>`;
}
function pageLogin(q) {
  if (me()) { setTimeout(() => go(q.next || '/'), 0); return ''; }
  return `<div class="auth-wrap">
    <div class="auth card">
      <div class="auth-brand"><span class="logo-mark">${icon('swap')}</span><h1>Welcome back</h1><p class="muted">Log in with your campus email.</p></div>
      <form class="form" data-form="login" data-next="${esc(q.next || '/')}">
        <label>Campus email<input type="email" name="email" required placeholder="you@campus.edu" autocomplete="email"></label>
        <label>Password<input type="password" name="password" required placeholder="••••••••" autocomplete="current-password"></label>
        <button class="btn btn-primary btn-block btn-lg">Log in</button>
      </form>
      <p class="center muted small">New here? <a class="link" href="#/signup">Create an account</a></p>
      <div class="divider"><span>or try a demo account</span></div>
      ${demoAccounts()}
      <p class="fine center">All demo accounts use password <code>demo123</code>.</p>
    </div>
  </div>`;
}
function pageSignup() {
  if (me()) { setTimeout(() => go('/'), 0); return ''; }
  return `<div class="auth-wrap">
    <div class="auth card wide">
      <div class="auth-brand"><span class="logo-mark">${icon('swap')}</span><h1>Join CampusShare</h1><p class="muted">Only students with a campus email can join.</p></div>
      <form class="form" data-form="signup">
        <label>Full name<input name="name" required maxlength="40" placeholder="Your name" autocomplete="name"></label>
        <label>Campus email<input type="email" name="email" required placeholder="you@campus.edu" autocomplete="email"></label>
        <div class="two">
          <label>Hostel<select name="hostelId" required>${DB.hostels.map((h) => `<option value="${h.id}">${h.emoji} ${esc(h.name)} (${h.kind})</option>`).join('')}</select></label>
          <label>Room no.<input name="room" required maxlength="10" placeholder="A-214"></label>
        </div>
        <div class="two">
          <label>Department<input name="dept" required maxlength="40" placeholder="Computer Science"></label>
          <label>Year<select name="year">${['1st year', '2nd year', '3rd year', '4th year', '5th year', 'PG / PhD'].map((y) => `<option>${y}</option>`).join('')}</select></label>
        </div>
        <label>Password<input type="password" name="password" required minlength="6" placeholder="At least 6 characters" autocomplete="new-password"></label>
        <button class="btn btn-primary btn-block btn-lg">Create account</button>
        <p class="fine center">Your room number is only shown to people whose request you accept.</p>
      </form>
      <p class="center muted small">Already have an account? <a class="link" href="#/login">Log in</a></p>
    </div>
  </div>`;
}

/* =========================================================
   Actions (click)
   ========================================================= */
function needLogin() {
  if (me()) return false;
  toast('Log in to do that', 'error');
  go('/login?next=' + encodeURIComponent(location.hash.slice(1) || '/'));
  return true;
}
function setFilter(key, val, route = '/browse') {
  const { path, query } = parseHash();
  const base = path === route ? query : {};
  delete base.focus;
  if (val === '' || val == null) delete base[key]; else base[key] = val;
  go(route + qs(base));
}
function setReqStatus(r, status) {
  r.status = status; r.updatedAt = Date.now(); r.history.push({ status, at: Date.now() });
}

const ACTIONS = {
  'close-modal': closeModal,
  back: () => (history.length > 1 ? history.back() : go('/')),
  menu: (el) => { openMenu = openMenu === el.dataset.menu ? null : el.dataset.menu; renderHeader(parseHash().path); },
  theme: () => {
    const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t; localStorage.setItem('campusshare.theme', t); renderHeader(parseHash().path);
  },
  logout: () => { DB.session = null; saveDB(); openMenu = null; toast('Logged out. See you soon!'); go('/'); },
  'reset-demo': () => confirmModal('Reset demo data?', 'This restores all sample listings, requests and accounts. Anything you created will be cleared.', 'data-action="reset-demo-yes"', 'Reset', true),
  'reset-demo-yes': () => { const s = DB.session; resetDB(); DB.session = s && getUser(s) ? s : null; saveDB(); closeModal(); openMenu = null; toast('Demo data restored', 'success'); go('/'); },
  'switch-account': () => { openMenu = null; renderHeader(parseHash().path); openModal('Switch demo account', `<p class="muted">Jump between students to try both sides of a request.</p>${demoAccounts()}`); },
  'demo-login': (el) => {
    DB.session = el.dataset.id; saveDB(); closeModal(); openMenu = null;
    toast(`Logged in as ${esc(getUser(el.dataset.id).name)}`, 'success');
    const next = parseHash().path === '/login' ? parseHash().query.next || '/' : null;
    if (next) go(next); else render();
  },
  'notif-open': (el) => { const n = DB.notifications.find((x) => x.id === el.dataset.id); if (n) n.read = true; saveDB(); openMenu = null; go(n.link); },
  'notif-read-all': () => { DB.notifications.forEach((n) => { if (n.userId === me().id) n.read = true; }); saveDB(); renderHeader(parseHash().path); },
  fav: (el) => {
    if (needLogin()) return;
    const m = me(), id = el.dataset.id, i = m.saved.indexOf(id);
    if (i >= 0) { m.saved.splice(i, 1); toast('Removed from saved'); } else { m.saved.push(id); toast('Saved ♥ — find it under Saved items', 'success'); }
    saveDB(); render();
  },
  filter: (el) => setFilter(el.dataset.key, el.dataset.val, el.dataset.route || '/browse'),
  'toggle-filters': () => $('.browse')?.classList.toggle('show-filters'),
  'quick-msg': (el) => { const t = el.closest('form').elements.message; t.value = (t.value.trim() + ' ' + el.dataset.text).trim() + ' '; t.focus(); },
  'copy-link': () => { const url = location.href; (navigator.clipboard?.writeText(url) || Promise.reject()).then(() => toast('Link copied!', 'success'), () => toast(url)); },
  'new-wanted': (el) => { if (needLogin()) return; openModal('Post a wanted request', wantedForm({ title: el.dataset.title, cat: el.dataset.cat })); },

  // listing management
  'item-pause': (el) => {
    const it = ownItem(el.dataset.id); if (!it) return;
    if (it.status !== 'available') return toast('Only available listings can be paused', 'error');
    it.status = 'paused'; saveDB(); toast('Listing paused — hidden from others. Accepted requests still stand.'); render();
  },
  'item-resume': (el) => {
    const it = ownItem(el.dataset.id); if (!it) return;
    if (!['paused', 'sold', 'given'].includes(it.status)) return render();
    const relist = it.status !== 'paused';
    if (relist) it.sold = 0;
    it.status = 'available'; syncItemStatus(it);
    saveDB(); toast(relist ? 'Relisted — stock reset' : 'Listing is live again', 'success'); render();
  },
  'item-delete': (el) => {
    const it = ownItem(el.dataset.id); if (!it) return;
    const out = DB.requests.filter((r) => r.itemId === it.id && r.status === 'active');
    if (out.length) return toast(`Can’t delete while it’s on loan to ${esc(getUser(out[0].requesterId).name.split(' ')[0])}. Confirm the return first.`, 'error');
    confirmModal('Delete this listing?', 'Open requests for this item will be cancelled. This can’t be undone.', `data-action="item-delete-yes" data-id="${it.id}"`, 'Delete', true);
  },
  'item-delete-yes': (el) => {
    const it = ownItem(el.dataset.id); if (!it) return closeModal();
    if (DB.requests.some((r) => r.itemId === it.id && r.status === 'active')) { closeModal(); return toast('It’s on loan right now — can’t delete', 'error'); }
    it.status = 'removed';
    DB.requests.filter((r) => r.itemId === it.id && ['pending', 'accepted'].includes(r.status)).forEach((r) => {
      setReqStatus(r, 'cancelled'); notify(r.requesterId, `<b>${esc(it.title)}</b> was removed by the owner, so your request was cancelled.`, '/request/' + r.id);
    });
    saveDB(); closeModal(); toast('Listing deleted'); go('/profile/' + me().id);
  },
  'remove-photo': (el) => { const f = el.closest('form'); f.elements.image.value = ''; f.elements.photo.value = ''; $('.photo-drop span', f).textContent = 'Upload a photo'; updatePostForm(f); },

  // request lifecycle
  'req-accept': (el) => {
    const r = guardReq(el.dataset.id, 'owner', ['pending']); if (!r) return;
    const it = getItem(r.itemId), m = me();
    if (it.status === 'removed') return toast('This listing was deleted', 'error');
    if (isDated(r) && r.to < isoDay(0)) return toast('These dates have already passed — decline it instead', 'error');
    const c = conflictFor(r);
    if (c) return toast(conflictText(c), 'error');
    setReqStatus(r, 'accepted');
    notify(r.requesterId, `<b>${esc(m.name)}</b> accepted your request for <b>${esc(it.title)}</b> 🎉`, '/request/' + r.id);
    // dated items: pending requests that can no longer fit (all units booked those days) are auto-declined
    let autoDeclined = 0;
    if (isDated(r)) {
      DB.requests.filter((x) => x.itemId === it.id && x.id !== r.id && x.status === 'pending' && x.from && overlaps(x, r) && conflictFor(x)).forEach((x) => {
        setReqStatus(x, 'declined'); autoDeclined++;
        notify(x.requesterId, `Those dates for <b>${esc(it.title)}</b> just got booked — try different dates.`, '/item/' + it.id);
      });
    }
    saveDB();
    toast(`Accepted! Your room number is now shared with them.${autoDeclined ? ` ${plural(autoDeclined, 'clashing request')} auto-declined.` : ''}`, 'success');
    render();
  },
  'req-mark-returned': (el) => {
    const r = guardReq(el.dataset.id, 'requester', ['active']); if (!r) return;
    if (r.returnMarked) return render();
    const it = getItem(r.itemId);
    r.returnMarked = true; r.updatedAt = Date.now();
    notify(r.ownerId, `<b>${esc(me().name)}</b> says they’ve returned <b>${esc(it.title)}</b> — please confirm.`, '/request/' + r.id);
    saveDB(); toast('Owner notified — they’ll confirm once they check it.', 'success'); render();
  },
  'req-decline': (el) => {
    const r = guardReq(el.dataset.id, 'owner', ['pending']); if (!r) return;
    const it = getItem(r.itemId);
    setReqStatus(r, 'declined');
    notify(r.requesterId, `<b>${esc(me().name)}</b> declined your request for <b>${esc(it.title)}</b>`, '/request/' + r.id);
    saveDB(); toast('Request declined'); render();
  },
  'req-cancel': (el) => {
    const r = guardReq(el.dataset.id, 'either', ['pending', 'accepted']); if (!r) return;
    const it = getItem(r.itemId), m = me();
    setReqStatus(r, 'cancelled');
    notify(m.id === r.ownerId ? r.requesterId : r.ownerId, `<b>${esc(m.name)}</b> cancelled the request for <b>${esc(it.title)}</b>`, '/request/' + r.id);
    saveDB(); toast('Request cancelled'); render();
  },
  'req-handover': (el) => {
    const r = guardReq(el.dataset.id, 'owner', ['accepted']); if (!r) return;
    const it = getItem(r.itemId);
    if (isDated(r)) {
      setReqStatus(r, 'active'); syncItemStatus(it);
      notify(r.requesterId, `You now have <b>${esc(it.title)}</b>. Return by ${fmtDay(r.to)}.`, '/request/' + r.id);
      toast('Marked as handed over', 'success');
    } else {
      setReqStatus(r, 'completed'); it.sold = (it.sold || 0) + units(r); syncItemStatus(it);
      notify(r.requesterId, `<b>${esc(it.title)}</b> is yours! Leave ${esc(me().name.split(' ')[0])} a rating.`, '/request/' + r.id);
      if (unitsLeft(it) <= 0) {
        DB.requests.filter((x) => x.itemId === it.id && x.status === 'pending').forEach((x) => {
          setReqStatus(x, 'declined'); notify(x.requesterId, `<b>${esc(it.title)}</b> went to someone else — sorry!`, '/request/' + x.id);
        });
      }
      toast(it.status === 'available' ? `Done! ${unitsNote(it)}.` : `Done! Item marked as ${ITEM_STATUS[it.status].toLowerCase()}.`, 'success');
    }
    saveDB(); render();
  },
  'req-return': (el) => {
    const r = guardReq(el.dataset.id, 'owner', ['active']); if (!r) return;
    const it = getItem(r.itemId);
    setReqStatus(r, 'completed'); syncItemStatus(it);
    notify(r.requesterId, `<b>${esc(me().name)}</b> confirmed <b>${esc(it.title)}</b> was returned. Leave a rating!`, '/request/' + r.id);
    saveDB(); toast('Returned — your item is available again', 'success'); render();
  },
  review: (el) => {
    const r = guardReq(el.dataset.id, 'either', ['completed']); if (!r) return;
    if (r.ownerId === me().id ? r.reviewedByOwner : r.reviewedByRequester) return toast('You already rated this exchange');
    const other = getUser(r.ownerId === me().id ? r.requesterId : r.ownerId);
    openModal(`Rate ${esc(other.name.split(' ')[0])}`, `<form class="form" data-form="review" data-id="${r.id}">
      <div class="star-input">${[5, 4, 3, 2, 1].map((s) => `<input type="radio" name="stars" id="s${s}" value="${s}" ${s === 5 ? 'checked' : ''}><label for="s${s}" title="${s} stars">★</label>`).join('')}</div>
      <label>A few words <span class="muted">(optional)</span><textarea name="text" rows="3" maxlength="300" placeholder="On time? Item as described? Friendly?"></textarea></label>
      <div class="row end gap"><button type="button" class="btn btn-ghost" data-action="close-modal">Later</button><button class="btn btn-primary">Submit rating</button></div>
    </form>`);
  },

  // wanted
  'offer-accept': (el) => {
    const w = ownWanted(el.dataset.id, 'open'); if (!w) return;
    const o = w.offers.find((x) => x.id === el.dataset.offer); if (!o) return render();
    w.status = 'fulfilled'; w.acceptedOffer = o.id;
    notify(o.userId, `<b>${esc(me().name)}</b> accepted your offer for <b>${esc(w.title)}</b>`, '/wanted/' + w.id);
    saveDB(); toast('Offer accepted! Coordinate with them to meet.', 'success'); render();
  },
  'wanted-close': (el) => { const w = ownWanted(el.dataset.id, 'open'); if (!w) return; w.status = 'fulfilled'; saveDB(); toast('Marked as fulfilled 🎉', 'success'); render(); },
  'wanted-reopen': (el) => { const w = ownWanted(el.dataset.id, 'fulfilled'); if (!w) return; w.status = 'open'; delete w.acceptedOffer; saveDB(); toast('Request reopened'); render(); },
  'dup-merge': () => {
    if (!pendingPost) return closeModal();
    const it = ownItem(pendingPost.dupId); if (!it) return closeModal();
    it.quantity = qty(it) + pendingPost.data.quantity; syncItemStatus(it);
    pendingPost = null; saveDB(); closeModal(); toast(`Quantity updated to ${it.quantity}`, 'success'); go('/item/' + it.id);
  },
  'dup-post': () => { if (!pendingPost) return closeModal(); const d = pendingPost.data; pendingPost = null; closeModal(); createItem(d); },

  'edit-profile': () => {
    const m = me();
    openModal('Edit profile', `<form class="form" data-form="profile">
      <label>Full name<input name="name" required maxlength="40" value="${esc(m.name)}"></label>
      <div class="two"><label>Hostel<select name="hostelId">${DB.hostels.map((h) => `<option value="${h.id}" ${h.id === m.hostelId ? 'selected' : ''}>${esc(h.name)}</option>`).join('')}</select></label>
      <label>Room no.<input name="room" required maxlength="10" value="${esc(m.room)}"></label></div>
      <div class="two"><label>Department<input name="dept" required maxlength="40" value="${esc(m.dept)}"></label>
      <label>Year<select name="year">${['1st year', '2nd year', '3rd year', '4th year', '5th year', 'PG / PhD'].map((y) => `<option ${m.year === y ? 'selected' : ''}>${y}</option>`).join('')}</select></label></div>
      <label>Bio<textarea name="bio" rows="3" maxlength="200">${esc(m.bio)}</textarea></label>
      <div class="row end gap"><button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button><button class="btn btn-primary">Save</button></div>
    </form>`);
  },
};

/* =========================================================
   Forms (submit)
   ========================================================= */
const FORMS = {
  search: (f) => go('/browse' + qs({ q: f.elements.q.value.trim() })),
  login: (f) => {
    const u = DB.users.find((x) => x.email.toLowerCase() === f.elements.email.value.trim().toLowerCase());
    if (!u || u.password !== f.elements.password.value) return toast('Wrong email or password. Try a demo account below!', 'error');
    DB.session = u.id; saveDB(); toast(`Welcome back, ${esc(u.name.split(' ')[0])}!`, 'success'); go(f.dataset.next || '/');
  },
  signup: (f) => {
    const email = f.elements.email.value.trim().toLowerCase();
    if (!f.elements.name.value.trim() || !f.elements.room.value.trim() || !f.elements.dept.value.trim()) return toast('Fill in your name, room and department', 'error');
    if (f.elements.password.value.length < 6) return toast('Password needs at least 6 characters', 'error');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/(@campus\.edu|\.edu|\.ac\.in)$/.test(email)) return toast('Please use your campus email (e.g. you@campus.edu)', 'error');
    if (DB.users.some((u) => u.email.toLowerCase() === email)) return toast('An account with this email already exists', 'error');
    const u = {
      id: uid('u'), name: f.elements.name.value.trim(), email, password: f.elements.password.value, hostelId: f.elements.hostelId.value, room: f.elements.room.value.trim(),
      dept: f.elements.dept.value.trim(), year: f.elements.year.value, bio: '', joinedAt: Date.now(), color: AVATAR_COLORS[DB.users.length % AVATAR_COLORS.length], saved: [],
    };
    DB.users.push(u); DB.session = u.id;
    notify(u.id, `Welcome to CampusShare, <b>${esc(u.name.split(' ')[0])}</b>! List your first item to start sharing.`, '/post');
    saveDB(); toast('Account created — welcome! 🎉', 'success'); go('/');
  },
  request: (f) => {
    if (needLogin()) return;
    const m = me(), it = getItem(f.dataset.id), fd = new FormData(f);
    if (!it || ['removed', 'paused', 'sold', 'given'].includes(it.status)) { toast('This item isn’t available any more', 'error'); return render(); }
    if (it.ownerId === m.id) return toast('That’s your own listing', 'error');
    const open = DB.requests.find((x) => x.itemId === it.id && x.requesterId === m.id && ['pending', 'accepted', 'active'].includes(x.status));
    if (open) { toast('You already have an open request for this item', 'error'); return go('/request/' + open.id); }
    const r = {
      id: uid('r'), itemId: it.id, requesterId: m.id, ownerId: it.ownerId, type: it.type, status: 'pending',
      pickup: fd.get('pickup'), message: String(fd.get('message') || '').trim(), messages: [],
      createdAt: Date.now(), updatedAt: Date.now(), history: [{ status: 'pending', at: Date.now() }],
    };
    const askUnits = Math.floor(+(fd.get('units') || 1));
    if (!(askUnits >= 1) || askUnits > qty(it)) return toast(`Choose between 1 and ${qty(it)} units`, 'error');
    if (askUnits > 1) r.units = askUnits;
    if (it.type === 'lend' || it.type === 'rent') {
      r.from = fd.get('from'); r.to = fd.get('to');
      if (!r.from || !r.to || r.to < r.from) return toast('Pick a valid date range', 'error');
      const days = daysBetween(r.from, r.to);
      if (it.maxDays && days > it.maxDays) return toast(`The owner lends this for at most ${plural(it.maxDays, 'day')}`, 'error');
      if (r.from < isoDay(0)) return toast('Start date can’t be in the past', 'error');
      if (r.from > isoDay(180)) return toast('You can book at most 6 months ahead', 'error');
      const free = qty(it) - peakLoad(it.id, r.from, r.to).peak;
      if (free <= 0) return toast('Those dates are already booked — pick free dates', 'error');
      if (askUnits > free) return toast(`Only ${free} of ${qty(it)} units are free on those dates`, 'error');
      if (it.type === 'rent') r.total = days * it.price * askUnits;
    } else if (unitsLeft(it) <= 0) return toast('Every unit is reserved right now — try again later', 'error');
    else if (askUnits > unitsLeft(it)) return toast(`Only ${unitsLeft(it)} of ${qty(it)} units are still available`, 'error');
    if (it.type === 'sell') {
      r.offer = Math.round(+fd.get('offer'));
      if (!(r.offer >= 1)) return toast('Enter an offer of at least ₹1', 'error');
      if (r.offer > it.price * 2) return toast(`That’s way above the ${rupee(it.price)} asking price — double-check the amount`, 'error');
    }
    if (r.message && r.message !== `Hi ${getUser(it.ownerId).name.split(' ')[0]}!`) r.messages.push({ from: m.id, text: r.message, at: Date.now() });
    DB.requests.push(r);
    notify(it.ownerId, `<b>${esc(m.name)}</b> wants to ${TYPES[it.type].ing} ${units(r) > 1 ? `<b>${units(r)} units</b> of ` : ''}your <b>${esc(it.title)}</b>${r.offer != null ? ` for ${rupee(r.offer)}` : ''}`, '/request/' + r.id);
    saveDB(); toast('Request sent! We’ve notified the owner.', 'success'); go('/request/' + r.id);
  },
  chat: (f) => {
    const r = guardReq(f.dataset.id, 'either', ['pending', 'accepted', 'active', 'completed']); if (!r) return;
    const text = f.elements.text.value.trim(), m = me();
    if (!text) return;
    r.messages.push({ from: m.id, text, at: Date.now() }); r.updatedAt = Date.now();
    const other = m.id === r.ownerId ? r.requesterId : r.ownerId;
    const existing = DB.notifications.find((n) => n.userId === other && !n.read && n.link === '/request/' + r.id && n.kind === 'msg');
    if (!existing) { notify(other, `New message from <b>${esc(m.name)}</b> about <b>${esc(getItem(r.itemId).title)}</b>`, '/request/' + r.id); DB.notifications[0].kind = 'msg'; }
    saveDB(); render(); setTimeout(() => $('.chat-form input')?.focus(), 0);
  },
  post: (f) => {
    const m = me(), fd = new FormData(f), type = fd.get('type');
    if (!m) return needLogin();
    const title = String(fd.get('title')).trim().replace(/\s+/g, ' ');
    if (title.length < 3) return toast('Give your item a title (at least 3 characters)', 'error');
    const price = Math.round(+fd.get('price') || 0), deposit = Math.round(+fd.get('deposit') || 0), quantity = Math.floor(+fd.get('quantity') || 1);
    if (price < 0 || deposit < 0) return toast('Amounts can’t be negative', 'error');
    if (price > 100000 || deposit > 100000) return toast('Amounts are capped at ₹1,00,000 for campus listings', 'error');
    if (quantity < 1 || quantity > 50) return toast('Quantity must be between 1 and 50', 'error');
    if ((type === 'rent' || type === 'sell') && !price) return toast(`Set a ${type === 'rent' ? 'daily rent' : 'price'} — or choose Lend/Giveaway for free`, 'error');
    const editing = f.dataset.id ? getItem(f.dataset.id) : null;
    if (f.dataset.id && (!editing || editing.ownerId !== m.id || editing.status === 'removed')) return toast('You can only edit your own listings', 'error');
    if (editing) {
      const openReqs = DB.requests.filter((r) => r.itemId === editing.id && ['pending', 'accepted', 'active'].includes(r.status));
      if (type !== editing.type && openReqs.length) return toast(`Can’t switch from ${TYPES[editing.type].label} to ${TYPES[type].label} while ${plural(openReqs.length, 'request')} ${openReqs.length === 1 ? 'is' : 'are'} open`, 'error');
      const committed = committedUnits(editing);
      if (quantity < committed) return toast(`${committed} ${committed === 1 ? 'unit is' : 'units are'} already committed to people — quantity can’t go below that`, 'error');
      const maxDays = +fd.get('maxDays');
      if ((type === 'lend' || type === 'rent') && openReqs.some((r) => r.from && daysBetween(r.from, r.to) > maxDays)) return toast('An open request is longer than that max period — keep it longer, or decline it first', 'error');
    }
    const data = {
      title, category: fd.get('category'), type, condition: fd.get('condition'), desc: String(fd.get('desc')).trim(),
      price: type === 'rent' || type === 'sell' ? price : 0,
      deposit: type === 'rent' || type === 'lend' ? deposit : 0,
      maxDays: type === 'rent' || type === 'lend' ? +fd.get('maxDays') : null,
      quantity,
      emoji: fd.get('emoji') || (editing ? editing.emoji : null), image: fd.get('image') || null,
    };
    if (editing) {
      Object.assign(editing, data); syncItemStatus(editing);
      saveDB(); toast('Listing updated', 'success'); return go('/item/' + editing.id);
    }
    // same person listing the same thing twice → offer to bump quantity instead
    const dup = DB.items.find((i) => i.ownerId === m.id && i.status !== 'removed' && normTitle(i.title) === normTitle(title));
    if (dup) {
      pendingPost = { dupId: dup.id, data };
      return openModal('You already listed this', `<p class="lead">“${esc(dup.title)}” is already one of your listings (${TYPES[dup.type].label}, quantity ${qty(dup)}).</p>
        <p class="muted mt-sm">If it’s another unit of the same thing, add it to the existing listing so people can book either one.</p>
        <div class="row end gap wrap mt"><button class="btn btn-ghost" data-action="dup-post">Post as a separate listing</button><button class="btn btn-primary" data-action="dup-merge">Add ${quantity} to existing (→ ${qty(dup) + quantity})</button></div>`);
    }
    createItem(data);
  },
  wanted: (f) => {
    const m = me(), fd = new FormData(f);
    if (!m) return needLogin();
    if (String(fd.get('title')).trim().length < 3) return toast('Describe what you need (at least 3 characters)', 'error');
    if (!fd.get('neededBy') || fd.get('neededBy') < isoDay(0)) return toast('“Needed by” can’t be in the past', 'error');
    if (+fd.get('budget') < 0 || +fd.get('budget') > 100000) return toast('Budget must be between ₹0 and ₹1,00,000', 'error');
    const w = {
      id: uid('w'), userId: m.id, hostelId: m.hostelId, title: String(fd.get('title')).trim(), category: fd.get('category'),
      mode: fd.get('mode'), budget: +fd.get('budget') || null, neededBy: fd.get('neededBy'), desc: String(fd.get('desc')).trim(),
      createdAt: Date.now(), status: 'open', offers: [],
    };
    DB.wanted.push(w); saveDB(); closeModal(); toast('Posted! We’ll notify you when someone offers.', 'success'); go('/wanted/' + w.id);
  },
  offer: (f) => {
    const m = me(), w = getWanted(f.dataset.id), fd = new FormData(f);
    if (!m) return needLogin();
    if (!w || w.status !== 'open') { toast('This request is no longer open', 'error'); return render(); }
    if (w.userId === m.id) return toast('You can’t offer on your own request', 'error');
    if (w.offers.some((o) => o.userId === m.id)) { toast('You already offered to help', 'error'); return render(); }
    if (!String(fd.get('text')).trim()) return toast('Write a short message', 'error');
    w.offers.push({ id: uid('o'), userId: m.id, text: String(fd.get('text')).trim(), itemId: fd.get('itemId') || null, at: Date.now() });
    notify(w.userId, `<b>${esc(m.name)}</b> offered to help with <b>${esc(w.title)}</b>`, '/wanted/' + w.id);
    saveDB(); toast('Offer sent!', 'success'); render();
  },
  review: (f) => {
    const r = guardReq(f.dataset.id, 'either', ['completed']), m = me(), fd = new FormData(f);
    if (!r) return closeModal();
    if (m.id === r.ownerId ? r.reviewedByOwner : r.reviewedByRequester) { closeModal(); return toast('You already rated this exchange'); }
    const stars = Math.min(5, Math.max(1, +fd.get('stars') || 5));
    const toId = m.id === r.ownerId ? r.requesterId : r.ownerId;
    DB.reviews.push({ id: uid('rv'), fromId: m.id, toId, stars, reqId: r.id, text: String(fd.get('text')).trim() || 'Smooth exchange 👍', at: Date.now() });
    if (m.id === r.ownerId) r.reviewedByOwner = true; else r.reviewedByRequester = true;
    saveDB(); closeModal(); toast('Thanks for the rating!', 'success'); render();
  },
  profile: (f) => {
    const m = me(), fd = new FormData(f);
    if (['name', 'room', 'dept'].some((k) => !String(fd.get(k)).trim())) return toast('Name, room and department can’t be empty', 'error');
    ['name', 'room', 'dept', 'year', 'bio'].forEach((k) => { m[k] = String(fd.get(k)).trim(); });
    if (fd.get('hostelId') !== m.hostelId) {
      m.hostelId = fd.get('hostelId');
      // your listings and open wanted posts move with you (pickup location follows the owner)
      DB.items.filter((i) => i.ownerId === m.id && i.status !== 'removed').forEach((i) => { i.hostelId = m.hostelId; });
      DB.wanted.filter((w) => w.userId === m.id && w.status === 'open').forEach((w) => { w.hostelId = m.hostelId; });
    }
    saveDB(); closeModal(); toast('Profile saved', 'success'); render();
  },
};

/* =========================================================
   Event wiring
   ========================================================= */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (openMenu && !e.target.closest('.menu-wrap')) { openMenu = null; renderHeader(parseHash().path); }
  if (!el) return;
  if (el.matches('.modal-backdrop') && e.target !== el) return;
  e.preventDefault(); e.stopPropagation();
  const fn = ACTIONS[el.dataset.action];
  if (fn) fn(el, e);
});
document.addEventListener('submit', (e) => {
  const f = e.target.closest('form[data-form]');
  if (!f) return;
  e.preventDefault();
  const fn = FORMS[f.dataset.form];
  if (fn) fn(f);
});
let searchTimer;
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.live === 'browse-q') {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const { query } = parseHash();
      if (t.value.trim()) query.q = t.value.trim(); else delete query.q;
      history.replaceState(null, '', '#/browse' + qs(query));
      const res = browseResults(query);
      $('#results').innerHTML = res.html;
      $('#result-count').textContent = `${plural(res.count, 'item')} ${query.avail === '0' ? 'listed' : 'available'}${query.hostel ? ` in ${getHostel(query.hostel).name}` : ' across campus'}`;
      const hs = $('.header-search input'); if (hs) hs.value = t.value;
    }, 180);
    return;
  }
  const f = t.closest('form[data-live]');
  if (f?.dataset.live === 'estimate') updateEstimate(f);
  if (f?.dataset.live === 'post') updatePostForm(f);
});
document.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.dataset.change === 'filter') return setFilter(t.dataset.key, t.value);
  if (t.dataset.change === 'avail') return setFilter('avail', t.checked ? '' : '0');
  if (t.dataset.change === 'as') {
    DB.session = t.value || null; saveDB(); openMenu = null;
    const u = me();
    toast(u ? `Now viewing as ${esc(u.name)} (${esc(getHostel(u.hostelId).short)})` : 'Viewing as a guest', 'success');
    const { path } = parseHash();
    // a private page of the previous user makes no sense for the new one
    if (/^\/(request\/|edit\/)/.test(path) || ((path === '/login' || path === '/signup') && u)) go(u ? '/requests' : '/'); else render();
    return;
  }
  const f = t.closest('form[data-live=post]');
  if (!f) return;
  if (t.name === 'photo' && t.files[0]) {
    try {
      f.elements.image.value = await resizeImage(t.files[0]);
      $('.photo-drop span', f).textContent = 'Change photo';
      toast('Photo added', 'success');
    } catch (err) { toast('Couldn’t read that image', 'error'); }
  }
  if (t.name === 'emoji') f.dataset.emojiTouched = '1';
  if (t.name === 'category' && !f.dataset.emojiTouched) {
    const r = f.querySelector(`input[name=emoji][value="${cat(t.value).emoji}"]`);
    if (r) r.checked = true;
  }
  updatePostForm(f);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if ($('#modal-root').innerHTML) closeModal(); else if (openMenu) { openMenu = null; renderHeader(parseHash().path); } }
  if (e.key === '/' && !e.target.closest('input, textarea, select')) { e.preventDefault(); $('.header-search input')?.focus(); }
});
window.addEventListener('hashchange', () => { closeModal(); render(); });
window.addEventListener('storage', (e) => { if (e.key === DB_KEY) { loadDB(); render(); } });

/* =========================================================
   Boot
   ========================================================= */
(function boot() {
  const theme = localStorage.getItem('campusshare.theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.dataset.theme = theme;
  loadDB();
  render();
})();
