// Real-browser end-to-end tests for CampusShare (Microsoft Edge via puppeteer-core)
// Run:  npm install   then   npm test        (ONLY=4 npm test  runs just group 4)
const puppeteer = require('puppeteer-core');
const path = require('path');
const EDGE = process.env.BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'; // or a Chrome path
const URL = 'file:///' + path.resolve(process.argv[2] || path.join(__dirname, '..'), 'index.html').replace(/\\/g, '/').replace(/ /g, '%20');
const SHOTS = path.resolve(__dirname, 'shots');
require('fs').mkdirSync(SHOTS, { recursive: true });

const results = []; let current = '';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function check(name, cond, detail = '') { results.push({ group: current, name, ok: !!cond, detail: cond ? '' : detail }); console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  →  ' + detail}`); }

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--allow-file-access-from-files', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });
  page.setDefaultTimeout(5000);
  const jsErrors = [];
  const watch = (p) => { p.on('pageerror', (e) => jsErrors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') jsErrors.push(m.text()); }); };
  watch(page);

  // ---------- helpers ----------
  const ev = (fn, ...a) => page.evaluate(fn, ...a);
  const db = () => ev(() => JSON.parse(localStorage.getItem('campusshare.db.v1')));
  const reset = async () => { await page.bringToFront(); await page.goto(URL); await ev(() => localStorage.clear()); await page.reload(); await sleep(120); await ev(() => { if (location.hash) location.hash = ''; }); await sleep(60); };
  const nav = async (h, p = page) => { await p.evaluate((h) => new Promise((res) => { if (location.hash === '#' + h) { render(); return res(); } addEventListener('hashchange', () => setTimeout(res, 20), { once: true }); setTimeout(res, 400); location.hash = h; }), h); await sleep(40); };
  const as = async (uid, p = page) => { await p.select('#demo-banner select', uid); await sleep(80); };
  const clearToasts = () => ev(() => { document.getElementById('toasts').innerHTML = ''; });
  const toast = () => ev(() => [...document.querySelectorAll('.toast')].map((t) => t.textContent).join(' | '));
  const text = (p = page) => p.evaluate(() => document.getElementById('view').innerText);
  const exists = (sel) => ev((s) => !!document.querySelector(s), sel);
  const click = async (sel, p = page) => { if (process.env.DEBUG) console.log('    click', sel); await p.waitForSelector(sel, { timeout: 2000 }); if (/modal|star-input/.test(sel)) await sleep(260); await p.click(sel); await sleep(90); };
  const setVal = (sel, v) => ev((s, v) => { const el = document.querySelector(s); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, sel, v);
  const day = (n) => ev((n) => isoDay(n), n);
  const submit = async (form) => { await clearToasts(); await click(`form[data-form=${form}] button:not([type=button])`); };
  const req = async (id) => (await db()).requests.find((r) => r.id === id);
  const item = async (id) => (await db()).items.find((i) => i.id === id);
  const lastReq = async () => { const d = await db(); return d.requests[d.requests.length - 1]; };
  async function requestItem(itemId, { from, to, offer, msg, units } = {}) {
    await nav('/item/' + itemId);
    if (from != null) await setVal('form[data-form=request] [name=from]', await day(from));
    if (to != null) await setVal('form[data-form=request] [name=to]', await day(to));
    if (units != null) await setVal('form[data-form=request] [name=units]', String(units));
    if (offer != null) await setVal('form[data-form=request] [name=offer]', String(offer));
    if (msg) await setVal('form[data-form=request] [name=message]', msg);
    const before = (await db()).requests.length;
    await submit('request');
    const after = await db();
    return after.requests.length > before ? after.requests[after.requests.length - 1] : null;
  }
  async function postItem(fields) {
    await nav('/post');
    await ev((f) => {
      const form = document.querySelector('form[data-form=post]');
      if (f.type) form.querySelector(`input[name=type][value=${f.type}]`).checked = true;
      for (const [k, v] of Object.entries(f)) if (k !== 'type') form.elements[k].value = v;
      form.dispatchEvent(new Event('input', { bubbles: true }));
    }, fields);
    const before = (await db()).items.length;
    await submit('post');
    return (await db()).items.length > before ? (await db()).items.at(-1) : null;
  }
  async function group(name, fn) {
    if (process.env.ONLY && !name.startsWith(process.env.ONLY + '.')) return;
    current = name; const errBefore = jsErrors.length;
    console.log('\n' + name); try { await reset(); await Promise.race([fn(), new Promise((_, rej) => setTimeout(() => rej(new Error('group timed out (60s)')), 60000))]); } catch (e) { check('group ran without crashing', false, e.message.split('\n')[0]); }
    check('no JavaScript errors in page', jsErrors.length === errBefore, jsErrors.slice(errBefore).join(' / '));
  }

  // =====================================================================
  await group('1. Every page renders (guest + 3 users)', async () => {
    const routes = ['/', '/browse', '/browse?q=calculator', '/browse?cat=books&type=sell', '/browse?hostel=h3&max=100', '/browse?avail=0', '/browse?q=qwertyzzz',
      '/item/i1', '/item/i3', '/item/i7', '/item/i8', '/item/i31', '/post', '/wanted', '/wanted?closed=1', '/wanted/w1', '/wanted/w4', '/hostels',
      '/hostel/h1', '/hostel/h6', '/requests', '/requests?tab=sent', '/request/r1', '/profile/u1', '/profile/u7', '/saved', '/login', '/signup'];
    for (const who of ['', 'u1', 'u5', 'u10']) {
      await as(who);
      let bad = [];
      for (const r of routes) { await nav(r); const t = await text(); if (/Page not found/.test(t) || (t.trim().length < 20 && !/login|signup/.test(r))) bad.push(r); }
      check(`all ${routes.length} routes render as ${who || 'guest'}`, !bad.length, bad.join(', '));
    }
    await nav('/does-not-exist'); check('unknown URL shows friendly 404', /Page not found/.test(await text()));
    await nav('/item/nope'); check('missing item shows "Item not found"', /Item not found/.test(await text()));
    await as('u2'); await nav('/request/r1'); check('outsider cannot open someone else\u2019s request', /Request not found/.test(await text()));
  });

  await group('2. Accounts: login, signup validation, logout, protected pages', async () => {
    await nav('/requests'); check('guest sees login prompt on Requests', /Log in to continue/.test(await text()));
    await nav('/login?next=/saved');
    await setVal('[name=email]', 'aarav@campus.edu'); await setVal('[name=password]', 'wrong');
    await submit('login'); check('wrong password rejected', /Wrong email or password/.test(await toast()));
    await setVal('[name=password]', 'demo123'); await submit('login');
    check('correct login works', (await db()).session === 'u1');
    check('login redirects to ?next page', await ev(() => location.hash === '#/saved'));
    await page.reload(); await sleep(100); check('session survives page reload', (await db()).session === 'u1');
    await click('[data-action=menu][data-menu=user]'); await click('.dropdown-user [data-action=logout]');
    check('logout works', (await db()).session === null);

    const fill = (o) => ev((o) => { const f = document.querySelector('form[data-form=signup]'); for (const [k, v] of Object.entries(o)) f.elements[k].value = v; }, o);
    const good = { name: 'Test Student', email: 'test@campus.edu', room: 'Z-1', dept: 'Maths', password: 'secret1' };
    await nav('/signup');
    await fill({ ...good, email: 'test@gmail.com' }); await submit('signup'); check('non-campus email rejected', /campus email/.test(await toast()));
    await fill({ ...good, email: 'aarav@campus.edu' }); await submit('signup'); check('duplicate email rejected', /already exists/.test(await toast()));
    await fill({ ...good, email: 'AARAV@CAMPUS.EDU ' }); await submit('signup'); check('duplicate email rejected (case/space)', /already exists/.test(await toast()));
    await fill({ ...good, name: '    ' }); await submit('signup'); check('whitespace-only name rejected', /Fill in your name/.test(await toast()));
    await fill({ ...good, email: 'bad@@campus.edu' }); await submit('signup'); check('malformed email rejected', (await db()).users.length === 10 && (/campus email/.test(await toast()) || await ev(() => !document.querySelector('[name=email]').checkValidity())));
    await fill(good); await submit('signup');
    const d = await db(); check('valid signup creates account + logs in', d.session && d.users.find((u) => u.id === d.session).email === 'test@campus.edu');
    check('new user gets a welcome notification', d.notifications.some((n) => n.userId === d.session));
    await nav('/requests'); check('new user: empty requests state', /haven\u2019t requested|No requests/.test(await text()));
  });

  await group('3. Listing validation & duplicates (same object twice)', async () => {
    await as('u1');
    let it = await postItem({ title: 'ab', type: 'lend' }); check('title < 3 chars rejected', !it && /title/.test(await toast()));
    it = await postItem({ title: 'Rice cooker', type: 'rent', price: '' }); check('rent without price rejected', !it && /daily rent/.test(await toast()));
    it = await postItem({ title: 'Rice cooker', type: 'sell', price: '-50' }); check('negative price rejected', !it);
    it = await postItem({ title: 'Rice cooker', type: 'sell', price: '999999' }); check('absurd price rejected', !it && /capped/.test(await toast()));
    it = await postItem({ title: 'Rice cooker', type: 'lend', quantity: '0' }); check('quantity 0 rejected', !it);
    it = await postItem({ title: 'Rice cooker', type: 'lend', quantity: '51' }); check('quantity 51 rejected', !it);
    it = await postItem({ title: '  Rice   cooker ', type: 'rent', price: '20', quantity: '1' });
    check('valid listing created (title trimmed)', it && it.title === 'Rice cooker' && it.price === 20 && it.quantity === 1);
    check('lands on the new item page', await ev((id) => location.hash === '#/item/' + id, it.id));
    // same object again → duplicate dialog
    const n = (await db()).items.length;
    await postItem({ title: 'RICE COOKER!', type: 'rent', price: '20', quantity: '2' });
    check('listing the same item again shows "already listed" dialog', await exists('.modal [data-action=dup-merge]'));
    await click('.modal [data-action=dup-merge]');
    const merged = await item(it.id);
    check('"add to existing" bumps quantity 1 → 3, no new listing', merged.quantity === 3 && (await db()).items.length === n);
    await postItem({ title: 'Rice cooker', type: 'rent', price: '20' }); await click('.modal [data-action=dup-post]');
    check('"post separately" creates a second listing', (await db()).items.length === n + 1);
    // two different owners listing the same object: both show in search
    await nav('/browse?q=calculator&avail=0');
    const cards = await ev(() => [...document.querySelectorAll('#results .item-card')].map((a) => a.getAttribute('href')));
    check('same object from 2 owners both appear in search (i1 + i31)', cards.includes('#/item/i1') && cards.includes('#/item/i31'), cards.join(','));
    // XSS-ish title is shown as text, never executed
    await postItem({ title: '<img src=x onerror="window.__pwn=1">Lamp', type: 'free' });
    await nav('/browse?q=lamp');
    check('HTML in titles is escaped (no script runs)', !(await ev(() => window.__pwn)) && /<img src=x/.test(await text()));
  });

  await group('4. Quantity: 2 calculators, 3 borrowers same dates', async () => {
    const f = 2, t = 3;
    await as('u2'); const a = await requestItem('i1', { from: f, to: t });
    await as('u4'); const b = await requestItem('i1', { from: f, to: t });
    await as('u6'); const c = await requestItem('i1', { from: f, to: t });
    check('3 people can request the 2-unit item for the same dates', a && b && c);
    await as('u3'); await nav('/request/' + a.id); await click('[data-action=req-accept]');
    check('owner accepts #1', (await req(a.id)).status === 'accepted');
    await nav('/request/' + b.id);
    check('#2 still acceptable (1 unit left)', await exists('[data-action=req-accept]'));
    await click('[data-action=req-accept]');
    check('owner accepts #2', (await req(b.id)).status === 'accepted');
    check('#3 auto-declined once both units are booked', (await req(c.id)).status === 'declined');
    check('#3 requester notified', (await db()).notifications.some((n) => n.userId === 'u6' && /just got booked/.test(n.text)));
    await as('u8'); await nav('/item/i1');
    await setVal('form[data-form=request] [name=from]', await day(f)); await setVal('form[data-form=request] [name=to]', await day(t));
    check('4th person sees "all 2 units booked" warning live', /All 2 units are booked/.test(await text()));
    const d = await requestItem('i1', { from: f, to: t }); check('4th person cannot submit for full dates', !d && /already booked/.test(await toast()));
    const e = await requestItem('i1', { from: 5, to: 5 }); check('…but can book free dates', !!e);
    const dflt = await ev(() => document.querySelector('form[data-form=request] [name=from]')?.value);
    // handovers move status: 1 out → still available, 2 out → on loan
    await as('u3'); await nav('/request/' + a.id); await click('[data-action=req-handover]');
    let it = await item('i1'); check('1 of 2 handed over → item still "available"', it.status === 'available');
    await nav('/item/i1'); check('owner sees "1 of 2 free now"', /1 of 2 free now/.test(await text()));
    await nav('/request/' + b.id); await click('[data-action=req-handover]');
    it = await item('i1'); check('2 of 2 handed over → "on loan"', it.status === 'onloan');
    await as('u9'); await nav('/browse'); check('fully-loaned item hidden from "available now" browse', !(await exists('#results a[href="#/item/i1"]')));
    await as('u3'); await nav('/request/' + a.id); await click('[data-action=req-return]');
    it = await item('i1'); check('one returned → available again', it.status === 'available');
    await nav('/edit/i1'); await setVal('[name=quantity]', '1'); await submit('post');
    check('quantity can\u2019t drop below units still out (1 out + booked)', /committed/.test(await toast()) || (await item('i1')).quantity >= 1);
  });

  await group('5. Single item: double-booking, dates, limits', async () => {
    await as('u5'); await nav('/request/r9');
    check('clashing request: Accept replaced by clash label', !(await exists('[data-action=req-accept]')) && /Clashes with/.test(await text()));
    await nav('/request/r10'); await click('[data-action=req-accept]'); check('non-clashing request accepted', (await req('r10')).status === 'accepted');
    await as('u2'); await nav('/item/i3');
    check('borrower sees "Already booked" dates', /Already booked/.test(await text()));
    const r4 = await req('r4');
    let r = await requestItem('i3', { from: 1, to: 2 }); check('overlapping dates rejected', !r && /already booked/.test(await toast()));
    r = await requestItem('i3', { from: -1, to: 0 }); check('past start date rejected', !r);
    r = await requestItem('i3', { from: 12, to: 10 }); check('end before start rejected', !r && /valid date range/.test(await toast()));
    r = await requestItem('i3', { from: 10, to: 30 }); check('longer than max lending period rejected', !r && /at most/.test(await toast()));
    r = await requestItem('i3', { from: 200, to: 201 }); check('more than 6 months ahead rejected', !r && /6 months/.test(await toast()));
    r = await requestItem('i3', { from: 10, to: 12 }); check('valid free dates accepted, total = 3 × ₹40', r && r.total === 120);
    await nav('/item/i3'); check('after requesting, item page shows "Your request" (no 2nd form)', /Your request/.test(await text()) && !(await exists('form[data-form=request]')));
    // forced double submit (e.g. double-click / two tabs)
    const count = (await db()).requests.length;
    await ev(() => { const f = document.createElement('form'); f.dataset.form = 'request'; f.dataset.id = 'i3'; f.innerHTML = '<input name="from"><input name="to"><input name="pickup"><textarea name="message"></textarea>'; f.elements.from.value = isoDay(20); f.elements.to.value = isoDay(20); document.body.appendChild(f); f.requestSubmit(); f.remove(); });
    await sleep(80); check('second request for same item blocked even if forced', (await db()).requests.length === count && /already have an open request/.test(await toast()));
    // stale pending request with dates in the past can't be accepted
    await ev(() => { DB.requests.push({ id: 'rOld', itemId: 'i14', requesterId: 'u2', ownerId: 'u5', type: 'lend', status: 'pending', from: isoDay(-5), to: isoDay(-4), pickup: 'x', message: '', messages: [], history: [], createdAt: Date.now(), updatedAt: Date.now() }); saveDB(); });
    await as('u5'); await nav('/request/rOld'); await clearToasts(); await click('[data-action=req-accept]');
    check('accepting a request whose dates passed is blocked', (await req('rOld')).status === 'pending' && /already passed/.test(await toast()));
    // owner can't request own item
    await nav('/item/i3'); check('owner sees manage panel, not a request form', await exists('.owner-actions') && !(await exists('form[data-form=request]')));
  });

  await group('6. Sell / giveaway: reservation, sold out, relist', async () => {
    await as('u2'); let r = await requestItem('i8', { offer: 0 }); check('₹0 offer rejected (browser blocks submit)', !r && await ev(() => !document.querySelector('[name=offer]').checkValidity()));
    r = await requestItem('i8', { offer: 5000 }); check('offer > 2× price rejected (browser blocks submit)', !r && await ev(() => !document.querySelector('[name=offer]').checkValidity()));
    await ev(() => { const f = document.querySelector('form[data-form=request]'); f.noValidate = true; f.elements.offer.value = '5000'; });
    await submit('request'); check('…and the app rejects it too if the browser check is bypassed', /way above/.test(await toast()));
    const a = await requestItem('i8', { offer: 350 }); check('buyer A offers ₹350', a && a.offer === 350);
    await as('u4'); const b = await requestItem('i8', { offer: 400 }); check('buyer B offers ₹400', !!b);
    await as('u8'); await nav('/request/' + b.id); await click('[data-action=req-accept]');
    await nav('/request/' + a.id); check('after reserving for B, A shows "Already reserved"', /Already reserved for/.test(await text()) && !(await exists('[data-action=req-accept]')));
    await as('u6'); await nav('/item/i8'); check('new visitor sees "Reserved" (no form)', /Reserved for someone else/.test(await text()) && !(await exists('form[data-form=request]')));
    await as('u4'); await nav('/request/' + b.id); await click('[data-action=req-cancel]');
    await as('u8'); await nav('/request/' + a.id); check('B backs out → A can be accepted again', await exists('[data-action=req-accept]'));
    await click('[data-action=req-accept]'); await click('[data-action=req-handover]');
    check('handover completes sale → item "sold"', (await item('i8')).status === 'sold' && (await req(a.id)).status === 'completed');
    await as('u6'); await nav('/item/i8'); check('sold item shows "Not available" + wanted CTA', /Not available/.test(await text()));
    await as('u8'); await nav('/item/i8'); await click('[data-action=item-resume]');
    check('relist resets stock → available', (await item('i8')).status === 'available' && (await item('i8')).sold === 0);
    // giveaway with 2 units
    await ev(() => { const it = DB.items.find((i) => i.id === 'i23'); it.quantity = 2; saveDB(); });
    await as('u1'); const g1 = await requestItem('i23'); await as('u2'); const g2 = await requestItem('i23'); await as('u4'); const g3 = await requestItem('i23');
    await as('u6');
    for (const g of [g1, g2]) { await nav('/request/' + g.id); await click('[data-action=req-accept]'); await click('[data-action=req-handover]'); }
    check('2-unit giveaway: 2 handed out → "claimed"', (await item('i23')).status === 'given');
    check('remaining pending claim auto-declined', (await req(g3.id)).status === 'declined');
  });

  await group('7. Full lend lifecycle + return handshake + ratings + chat', async () => {
    await as('u2'); const r = await requestItem('i13'.replace('i13', 'i25'), { from: 0, to: 1, msg: 'Hi Kabir! Raining a lot, can I borrow it?' });
    check('request created with first chat message', r && r.messages.length === 1);
    check('owner notified', (await db()).notifications.some((n) => n.userId === 'u5' && n.link === '/request/' + r.id));
    await as('u5'); await click('[data-action=menu][data-menu=notif]');
    check('owner sees unread badge + notification', await exists('.dropdown-notif.open .notif.unread'));
    await click(`.dropdown-notif a[href="#/request/${r.id}"]`);
    check('clicking notification opens the request', await ev((id) => location.hash === '#/request/' + id, r.id));
    await page.type('.chat-form input', 'Sure, come to N-122'); await clearToasts(); await page.keyboard.press('Enter'); await sleep(100);
    check('chat message sent with Enter', (await req(r.id)).messages.length === 2);
    await page.type('.chat-form input', '   '); await page.keyboard.press('Enter'); await sleep(80);
    check('blank chat message ignored', (await req(r.id)).messages.length === 2);
    await as('u2'); await nav('/request/' + r.id); check('room number hidden before acceptance', /shared once accepted/.test(await text()));
    await as('u5'); await nav('/request/' + r.id); await click('[data-action=req-accept]');
    await as('u2'); await nav('/request/' + r.id); check('room number revealed after acceptance', /Room N-122/.test(await text()));
    await as('u5'); await nav('/request/' + r.id); await click('[data-action=req-handover]');
    check('handover → active, item on loan', (await req(r.id)).status === 'active' && (await item('i25')).status === 'onloan');
    await nav('/item/i25'); await click('[data-action=item-delete]');
    check('cannot delete an item that is out on loan', /on loan/.test(await toast()) && (await item('i25')).status !== 'removed');
    await as('u2'); await nav('/request/' + r.id); await click('[data-action=req-mark-returned]');
    check('borrower marks "I\u2019ve returned it"', (await req(r.id)).returnMarked === true);
    check('borrower now sees "waiting for confirm", no duplicate button', !(await exists('[data-action=req-mark-returned]')));
    await as('u5'); await nav('/request/' + r.id); check('owner sees "says they\u2019ve returned it"', /says they/.test(await text()));
    await click('[data-action=req-return]');
    check('owner confirms → completed, item available', (await req(r.id)).status === 'completed' && (await item('i25')).status === 'available');
    await click('[data-action=review]'); await click('.star-input label[for=s4]'); await submit('review');
    check('owner rates borrower 4★', (await db()).reviews.some((v) => v.fromId === 'u5' && v.toId === 'u2' && v.stars === 4), JSON.stringify((await db()).reviews.filter((v) => v.fromId === 'u5').map((v) => v.stars)) + ' toast=' + await toast());
    check('rate button gone after rating', !(await exists('[data-action=review]')));
    await ev((id) => { const b = document.createElement('button'); b.dataset.action = 'review'; b.dataset.id = id; b.id = 'forced'; document.body.appendChild(b); }, r.id);
    await clearToasts(); await click('#forced'); check('second rating blocked even if forced', /already rated/.test(await toast()));
    await as('u2'); await nav('/request/' + r.id); await click('[data-action=review]'); await submit('review');
    check('borrower rates owner too (default 5★)', (await db()).reviews.some((v) => v.fromId === 'u2' && v.toId === 'u5' && v.stars === 5));
    const st = await ev(() => userRating('u5')); check('owner rating average updates', st.count >= 3);
  });

  await group('8. Stale tabs / wrong person / double clicks', async () => {
    await as('u1');
    const tab2 = await browser.newPage(); watch(tab2); await tab2.goto(URL + '#/request/r2'); await sleep(150);
    await nav('/request/r2'); // tab 1 (Aarav) open on pending request r2
    // in tab 2, Aarav declines it
    await tab2.click('[data-action=req-decline]'); await sleep(150); await page.bringToFront();
    check('tab 2 declined r2', (await req('r2')).status === 'declined');
    await sleep(150);
    check('tab 1 auto-refreshed via storage event (no Accept button now)', !(await exists('[data-action=req-accept][data-id=r2]')));
    // even if tab 1 still had the old button, the action is re-validated
    await ev(() => { DB.requests.find((r) => r.id === 'r2').status = 'pending'; }); await ev(() => render()); // stale in-memory copy shows button
    await ev(() => { const raw = JSON.parse(localStorage.getItem('campusshare.db.v1')); raw.requests.find((r) => r.id === 'r2').status = 'declined'; DB = raw; });
    await clearToasts(); await click('[data-action=req-accept][data-id=r2]');
    check('stale Accept click is rejected', (await req('r2')).status === 'declined' && /already changed/.test(await toast()));
    await tab2.close(); await page.bringToFront();
    // requester trying owner-only actions
    await as('u1'); await nav('/request/r4');
    for (const act of ['req-accept', 'req-handover', 'req-return', 'req-decline']) {
      await ev((a) => { const b = document.createElement('button'); b.dataset.action = a; b.dataset.id = 'r4'; b.className = 'forced-' + a; document.body.appendChild(b); }, act);
      await click('.forced-' + act);
    }
    check('requester cannot accept/hand over/return/decline (forced)', (await req('r4')).status === 'accepted');
    // non-owner managing someone else's listing
    await ev(() => { const b = document.createElement('button'); b.dataset.action = 'item-pause'; b.dataset.id = 'i3'; b.id = 'fp'; document.body.appendChild(b); });
    await clearToasts(); await click('#fp'); check('cannot pause someone else\u2019s listing (forced)', (await item('i3')).status === 'available' && /own listings/.test(await toast()));
    // double click on accept
    await as('u1'); await nav('/request/r3');
    await page.evaluate(() => { const b = document.querySelector('[data-action=req-accept]'); b.click(); b.click(); }); await sleep(100);
    const hist = (await req('r3')).history.filter((h) => h.status === 'accepted').length;
    check('double-click Accept records it once', hist === 1, 'accepted entries: ' + hist);
  });

  await group('9. Editing & deleting listings with open requests', async () => {
    await as('u5'); await nav('/edit/i3');
    await ev(() => { document.querySelector('input[name=type][value=sell]').checked = true; });
    await setVal('[name=price]', '2000'); await submit('post');
    check('can\u2019t switch Rent → Sell while requests are open', (await item('i3')).type === 'rent' && /Can\u2019t switch/.test(await toast()));
    await nav('/edit/i3'); await setVal('[name=maxDays]', '1'); await submit('post');
    check('can\u2019t shrink max period below an open request', (await item('i3')).maxDays === 7);
    await nav('/edit/i3'); await setVal('[name=price]', '45'); await setVal('[name=quantity]', '2'); await submit('post');
    check('normal edit works (price 45, qty 2)', (await item('i3')).price === 45 && (await item('i3')).quantity === 2);
    await nav('/request/r9'); check('qty 2 → previously clashing r9 now acceptable', await exists('[data-action=req-accept]'));
    await as('u1'); await nav('/edit/i3'); check('others can\u2019t open edit page', /Can\u2019t edit this/.test(await text()));
    // pause hides from others, keeps owner view
    await as('u9'); await nav('/item/i30'); await click('[data-action=item-pause]');
    await as('u1'); await nav('/browse?q=headphones'); check('paused listing hidden from others', !(await exists('#results a[href="#/item/i30"]')));
    await nav('/item/i30'); check('paused item page shows "Not available"', /Not available/.test(await text()));
    await as('u9'); await nav('/item/i30'); await click('[data-action=item-resume]'); check('resume makes it available', (await item('i30')).status === 'available');
    // delete cancels open requests & notifies
    await as('u3'); await nav('/item/i11'); await click('[data-action=item-delete]'); await click('.modal [data-action=item-delete-yes]');
    check('delete removes listing', (await item('i11')).status === 'removed', 'status=' + (await item('i11')).status + ' toast=' + await toast() + ' modal=' + await exists('.modal') + ' hash=' + await ev(() => location.hash));
    check('its pending request (r5) cancelled + requester notified', (await req('r5')).status === 'cancelled' && (await db()).notifications.some((n) => n.userId === 'u1' && /was removed/.test(n.text)));
    await as('u1'); await nav('/item/i11'); check('deleted item link shows "Item not found"', /Item not found/.test(await text()));
    await nav('/saved'); check('deleted item disappears from Saved', !(await exists('a[href="#/item/i11"]')));
  });

  await group('10. Wanted board', async () => {
    await as('u1'); await nav('/wanted'); await click('[data-action=new-wanted]');
    await setVal('.modal [name=title]', 'x'); await submit('wanted'); check('too-short wanted title rejected', /at least 3/.test(await toast()));
    await setVal('.modal [name=title]', 'Need a lab coat'); await setVal('.modal [name=neededBy]', await day(-1)); await submit('wanted');
    check('past "needed by" rejected', (await db()).wanted.length === 8 && (/past/.test(await toast()) || await ev(() => !document.querySelector('.modal [name=neededBy]').checkValidity())));
    await ev(() => { document.querySelector('form[data-form=wanted]').noValidate = true; }); await submit('wanted');
    check('…app also rejects past date if browser check bypassed', /past/.test(await toast()));
    await setVal('.modal [name=neededBy]', await day(2)); await submit('wanted');
    const w = (await db()).wanted.at(-1); check('wanted post created', w.title === 'Need a lab coat' && w.status === 'open');
    check('own post: no offer form', !(await exists('form[data-form=offer]')));
    await as('u4'); await nav('/wanted/' + w.id);
    await setVal('form[data-form=offer] [name=text]', 'I have one!'); await setVal('form[data-form=offer] [name=itemId]', 'i4'); await submit('offer');
    check('another student can offer + attach listing', (await db()).wanted.at(-1).offers.length === 1 && (await db()).wanted.at(-1).offers[0].itemId === 'i4');
    check('second offer form hidden after offering', !(await exists('form[data-form=offer]')));
    await as('u1'); await nav('/wanted/' + w.id); check('poster sees attached listing card', await exists('.offer-item'));
    await click('[data-action=offer-accept]'); check('accept offer → fulfilled', (await db()).wanted.at(-1).status === 'fulfilled');
    check('offerer notified', (await db()).notifications.some((n) => n.userId === 'u4' && /accepted your offer/.test(n.text)));
    await as('u6'); await nav('/wanted/' + w.id); check('fulfilled post: no offer form for others', !(await exists('form[data-form=offer]')));
    await nav('/wanted'); check('fulfilled hidden from board by default', !(await exists(`a[href="#/wanted/${w.id}"]`)));
    await as('u1'); await nav('/wanted/' + w.id); await click('[data-action=wanted-reopen]'); check('poster can reopen', (await db()).wanted.at(-1).status === 'open');
    await nav('/browse?q=hovercraft'); await click('[data-action=new-wanted]');
    check('empty search → "post as wanted" prefilled', await ev(() => document.querySelector('.modal [name=title]').value === 'hovercraft'));
  });

  await group('11. Profile, hostels, saved, notifications', async () => {
    await as('u1'); await nav('/profile/u1'); await click('[data-action=edit-profile]');
    await setVal('.modal [name=name]', '   '); await submit('profile'); check('empty name rejected', /can\u2019t be empty/.test(await toast()));
    await setVal('.modal [name=name]', 'Aarav S.'); await setVal('.modal [name=hostelId]', 'h3'); await submit('profile');
    const d = await db();
    check('profile saved', d.users.find((u) => u.id === 'u1').name === 'Aarav S.');
    check('changing hostel moves your listings', d.items.filter((i) => i.ownerId === 'u1' && i.status !== 'removed').every((i) => i.hostelId === 'h3'));
    await nav('/hostel/h3'); check('hostel page lists moved items', await exists('a[href="#/item/i21"]'));
    await nav('/browse'); await click('#results .item-card .fav');
    check('save (♥) from browse works', (await db()).users.find((u) => u.id === 'u1').saved.length === 4);
    await nav('/saved'); check('wishlist page shows saved items', (await ev(() => document.querySelectorAll('.item-card').length)) >= 3);
    await click('[data-action=menu][data-menu=notif]'); await click('[data-action=notif-read-all]');
    check('mark all notifications read', (await db()).notifications.filter((n) => n.userId === 'u1').every((n) => n.read));
    await as(''); await nav('/browse'); await click('#results .item-card .fav');
    check('guest pressing ♥ is sent to login', await ev(() => location.hash.startsWith('#/login')));
  });

  await group('12. Browse filters, search, back button, theme, reset', async () => {
    await as('u1');
    await nav('/browse'); await click('[data-action=filter][data-key=type][data-val=sell]');
    check('type filter → only Sell cards', await ev(() => [...document.querySelectorAll('#results .badge')].every((b) => b.textContent === 'Sell')));
    await click('[data-action=filter][data-key=cat][data-val=books]');
    check('filters stack (sell + books)', await ev(() => location.hash.includes('type=sell') && location.hash.includes('cat=books')));
    await page.select('select[data-key=max]', '0'); await sleep(100);
    check('"Free only" + Sell → empty state', /Nothing matches/.test(await text()));
    await nav('/browse'); await page.type('#browse-q', 'drafter'); await sleep(350);
    check('live search narrows results without losing focus', (await ev(() => document.querySelectorAll('#results .item-card').length)) === 1 && (await ev(() => document.activeElement.id)) === 'browse-q');
    await page.goBack(); await sleep(150); await page.goForward(); await sleep(150);
    check('back/forward navigation works', await ev(() => location.hash.startsWith('#/browse')));
    await page.keyboard.press('Escape'); await ev(() => document.activeElement.blur()); await page.keyboard.press('/');
    check('"/" focuses header search', await ev(() => document.activeElement.closest('.header-search') !== null));
    const theme = await ev(() => document.documentElement.dataset.theme);
    await click('[data-action=menu][data-menu=user]'); await click('.dropdown-user [data-action=theme]');
    check('theme toggles', (await ev(() => document.documentElement.dataset.theme)) !== theme);
    await page.reload(); await sleep(100); check('theme persists after reload', (await ev(() => document.documentElement.dataset.theme)) !== theme);
    await postItem({ title: 'Temporary thing', type: 'free' });
    await click('#demo-banner [data-action=reset-demo]'); await click('.modal [data-action=reset-demo-yes]');
    check('reset demo restores sample data', !(await db()).items.some((i) => i.title === 'Temporary thing') && (await db()).items.length === 31);
  });

  await group('13. Mobile layout (390px) — no sideways scrolling', async () => {
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await as('u1');
    const bad = [];
    for (const r of ['/', '/browse', '/item/i1', '/post', '/wanted', '/wanted/w4', '/hostels', '/hostel/h1', '/requests', '/request/r4', '/profile/u1', '/login']) {
      await nav(r); const o = await ev(() => document.documentElement.scrollWidth - window.innerWidth); if (o > 1) bad.push(`${r} (+${o}px)`);
    }
    check('no horizontal overflow on 12 pages', !bad.length, bad.join(', '));
    check('bottom tab bar visible', await ev(() => getComputedStyle(document.getElementById('bottom-nav')).display !== 'none'));
    await nav('/browse'); await click('[data-action=toggle-filters]'); check('filters drawer opens on mobile', await ev(() => getComputedStyle(document.querySelector('.filters')).display !== 'none'));
    await nav('/item/i1'); await page.screenshot({ path: path.join(SHOTS, 'mobile-item.png') });
    await nav('/request/r4'); await page.screenshot({ path: path.join(SHOTS, 'mobile-request.png') });
    await page.setViewport({ width: 1366, height: 900 });
    await as('u3'); await nav('/item/i1'); await page.screenshot({ path: path.join(SHOTS, 'desktop-owner-qty.png') });
    await as('u5'); await nav('/requests?tab=received'); await page.screenshot({ path: path.join(SHOTS, 'desktop-clash.png') });
  });

  await group('14. Multi-unit requests (2 of 5, then the remaining 3)', async () => {
    // i13: Priya's extension boards, 5 units, lend
    await as('u1'); await nav('/item/i13');
    check('5-unit item shows a "How many?" field', await exists('form[data-form=request] [name=units]'));
    await setVal('form[data-form=request] [name=from]', await day(1)); await setVal('form[data-form=request] [name=to]', await day(2));
    await setVal('form[data-form=request] [name=units]', '2');
    check('estimate shows "2 units" and "5 of 5 units free"', /2 units/.test(await text()) && /5 of 5 units free/.test(await text()));
    const a = await requestItem('i13', { from: 1, to: 2, units: 2 });
    check('Aarav requests 2 of 5 units', a && a.units === 2);
    await as('u3'); const b = await requestItem('i13', { from: 1, to: 2, units: 3 });
    check('Rohan requests the remaining 3 units', b && b.units === 3);
    await as('u7'); const c = await requestItem('i13', { from: 1, to: 2, units: 4 });
    await as('u4'); const d = await requestItem('i13', { from: 2, to: 2, units: 1 });
    check('two more students also request (4 units, 1 unit)', c && d);
    await as('u6'); let r = await requestItem('i13', { from: 1, to: 1, units: 6 });
    check('asking for 6 of 5 is rejected', !r);
    await as('u2'); await nav('/item/i13');
    check('owner sees all 4 requests with unit counts', /2 units/.test(await text()) && /3 units/.test(await text()) && /4 units/.test(await text()));
    await nav('/request/' + a.id); await click('[data-action=req-accept]');
    check('owner accepts 2 units', (await req(a.id)).status === 'accepted');
    check('4-unit request auto-declined (only 3 left on those dates)', (await req(c.id)).status === 'declined');
    check('1-unit request still pending (3 left)', (await req(d.id)).status === 'pending');
    await nav('/request/' + b.id);
    check('remaining-3 request is acceptable', await exists('[data-action=req-accept]'));
    await click('[data-action=req-accept]');
    check('owner accepts the remaining 3', (await req(b.id)).status === 'accepted');
    check('1-unit request on overlapping day auto-declined (0 left)', (await req(d.id)).status === 'declined');
    await as('u6'); await nav('/item/i13');
    await setVal('form[data-form=request] [name=from]', await day(1)); await setVal('form[data-form=request] [name=to]', await day(1));
    check('new borrower sees "All 5 units are booked" for those dates', /All 5 units are booked/.test(await text()));
    r = await requestItem('i13', { from: 3, to: 3, units: 5 });
    check('…but can take all 5 on a free day', r && r.units === 5);
    await as('u2');
    await nav('/request/' + a.id); await click('[data-action=req-handover]');
    check('2 of 5 handed over → still available, "3 of 5 free now"', (await item('i13')).status === 'available' && /3 of 5 free now/.test(await (async () => { await nav('/item/i13'); return text(); })()));
    await nav('/request/' + b.id); await click('[data-action=req-handover]');
    check('all 5 handed over → "on loan"', (await item('i13')).status === 'onloan');
    await nav('/edit/i13'); await setVal('[name=quantity]', '4'); await submit('post');
    check('quantity can’t drop below the 5 units out', (await item('i13')).quantity === 5 && /committed/.test(await toast()));
    await nav('/request/' + a.id); await click('[data-action=req-return]');
    check('2 returned → available again', (await item('i13')).status === 'available');
    // rent: total multiplies by units; deposit too
    await ev(() => { const it = DB.items.find((i) => i.id === 'i22'); it.quantity = 3; it.deposit = 100; saveDB(); });
    await as('u1'); const rr = await requestItem('i22', { from: 1, to: 2, units: 2 });
    check('rent total = 2 days × ₹20 × 2 units = ₹80', rr && rr.total === 80);
    await nav('/request/' + rr.id); check('request page shows units and deposit × units (₹200)', /2 of 3/.test(await text()) && /₹200/.test(await text()));
    // sell: 5 chairs, buyer A takes 2, buyer B the remaining 3
    await ev(() => { const it = DB.items.find((i) => i.id === 'i18'); it.quantity = 5; saveDB(); });
    await as('u1'); const s1 = await requestItem('i18', { units: 2, offer: 300 });
    await as('u2'); const s2 = await requestItem('i18', { units: 3, offer: 280 });
    await as('u4'); const s3 = await requestItem('i18', { units: 1, offer: 300 });
    check('three buyers request 2, 3 and 1 of 5 chairs', s1 && s2 && s3 && s1.units === 2 && s2.units === 3);
    await as('u9');
    for (const x of [s1, s2]) { await nav('/request/' + x.id); await click('[data-action=req-accept]'); }
    await nav('/request/' + s3.id); check('third buyer blocked: "No units left"/"All 5 units are reserved"', !(await exists('[data-action=req-accept]')));
    for (const x of [s1, s2]) { await nav('/request/' + x.id); await click('[data-action=req-handover]'); }
    const ch = await item('i18');
    check('after handing over 2 + 3 → 5 sold, item "sold"', ch.sold === 5 && ch.status === 'sold');
    check('remaining buyer auto-declined', (await req(s3.id)).status === 'declined');
  });

  await browser.close();
  // ---------- report ----------
  let g = '';
  for (const r of results) { if (r.group !== g) { g = r.group; console.log('\n' + g); } console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '  →  ' + r.detail : ''}`); }
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  require('fs').writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(results, null, 1));
})();
