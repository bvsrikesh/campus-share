# CampusShare: borrow, lend and share across campus hostels

**CS5013 Programming with AI, project submission**

| | |
|---|---|
| **Student** | TODO: name, roll number |
| **App link** | TODO: `https://<site-name>.netlify.app` (see [DEPLOYMENT.md](DEPLOYMENT.md)) |
| **Source code** | https://github.com/bvsrikesh/campus-share |
| **Prompt log** | [PROMPTS.md](PROMPTS.md) |
| **Date** | 26 November 2026 |

---

## 1. Problem statement

Hostel students often need things they use only a few times: a scientific calculator for one exam, a blazer for a placement interview, a cycle for a week, an extension board, a lab coat. Buying each one is wasteful. The same items are usually lying unused a few rooms away. Students currently find them through scattered WhatsApp groups, where messages get buried and nobody can tell what is available. There is no record of who has what, and no way to stop two people being promised the same item.

**Goal.** Build a campus sharing platform where students can:

1. **List** items to lend (free), rent (per day), sell, or give away.
2. **Browse and search** items across all hostels, nearest hostel first.
3. **Request** an item with dates, pickup spot and a message. Then follow the request through accept → hand-over → return, with chat and ratings.
4. **Post what they need** on a Wanted board when nobody has listed it yet.
5. See **hostels** as communities, and manage their own **account**, listings and requests.

The deliverable is a working, demo-ready prototype that a reviewer can open from a link and use from both sides of an exchange (owner and borrower).

---

## 2. Solution overview

A single-page web application in plain HTML, CSS and JavaScript. It has no framework and no build step. All data is stored in the browser.

| Area | What the user can do |
|---|---|
| **Accounts** | Sign up with a campus email, log in, edit profile. Profiles show ratings, reviews and share statistics. A **"Viewing as" switcher** lets a reviewer jump between 10 demo students. |
| **Listings** | Four sharing modes (Lend / Rent / Sell / Giveaway). Fields: price, refundable deposit, max lending period, condition, **quantity**, photo or icon. The form shows a live preview. Owners can edit, pause, relist or delete. |
| **Browse** | Search, plus filters for category, type, hostel, max price and "available now". Sorting options: **nearest first** (your hostel), newest, or price. Saved items (♥). |
| **Requesting** | The request form depends on the type: date range with a live cost estimate, an offer price for sale items, pickup spot, and quick-message chips. Already-booked dates are shown. The date picker defaults to the first free window. |
| **Request lifecycle** | Pending → Accepted → Handed over → Returned, plus decline and cancel. Each request has its own chat. The room number is shown only after acceptance. Overdue warnings appear when needed. The borrower taps "I've returned it" and the owner confirms. Both sides rate each other. |
| **Wanted board** | Post a need with a deadline, budget and mode. Others offer help and can attach one of their listings. The poster accepts an offer or closes the post. |
| **Hostels** | Hostel directory with stats. Each hostel has its own page with its listings, wanted posts and members. |
| **Notifications** | Bell with unread count. Notifications for new requests, decisions, messages, returns and matching listings. |
| **Quality of life** | Dark mode, mobile bottom tab bar, `/` to search, `Esc` to close dialogs, toasts, empty states with a next action. |

Demo data: 6 hostels, 10 students, 31 listings (including a 2-unit item and the same item from two owners), 8 wanted posts and 10 requests in every state.

---

## 3. Design decisions and their merits

| Decision | Why | Merit | Trade-off accepted |
|---|---|---|---|
| **Vanilla HTML/CSS/JS, no framework, no build** | The brief is a demo prototype that must open from a link or a double-click. | Opens anywhere with zero setup, loads in 0.4 s (Lighthouse 100), and every line is readable in a viva without framework knowledge. | Manual DOM rendering; it would need restructuring to grow into a large team project. |
| **Hash routing (`#/item/i3`)** | Works on any static host and from `file://`. | Every screen has a shareable URL. Back/forward and refresh work, so no server rewrite rules are needed. | URLs contain `#`. |
| **`localStorage` as the data store** | No backend fits the demo scope and needs no accounts or keys. | The demo works offline, costs nothing to host, and data survives reloads. Tabs stay in sync through the `storage` event. | Data is per browser, not shared between users. This is stated in the app banner and in the Assumptions. |
| **Four sharing modes in one model** (`lend/rent/sell/free`) | Real campus needs cover all four. | One listing flow and one request lifecycle serve every case. Only the form fields and the final step differ. | Slightly more rules (e.g. dated vs. undated requests). |
| **Item status is *derived*, never stored by hand** (`syncItemStatus`) | Hand-set status drifted from reality in early versions. | "Available / On loan / Sold" is always recomputed from the requests, so it can't contradict them. | Recomputed after every change; the cost is trivial at this scale. |
| **Booking model with quantity** (`peakLoad`, `unitsLeft`) | Students own duplicates (two calculators), and double-booking was the main risk. | Dates count as full only when *every* unit is booked. Sale items sell out per unit, and conflicts are shown before the owner clicks. | Day-level granularity (no hours). |
| **Every action re-validated** (`guardReq`, `ownItem`, `ownWanted`) | Stale tabs, double clicks and edited HTML can send old actions. | The state machine can't be pushed into an invalid state; tested with a second browser tab and forged buttons. | A few extra checks per click. |
| **Privacy by default** | Room numbers are personal. | A room is revealed only after a request is accepted. All user text is HTML-escaped. | — |
| **"Viewing as" switcher in the banner** | Reviewers must see both sides of an exchange. | One click shows owner and borrower views, so a two-sided demo can be done alone. | Demo-only; it would be removed in production. |
| **Accessibility and mobile first-class** | Students mostly use phones. | Bottom tab bar, no sideways scrolling (tested on 12 pages), WCAG-AA contrast and keyboard shortcuts. Lighthouse Accessibility is 100. | — |
| **Real-browser end-to-end tests** (puppeteer-core + Edge) | AI-written UI code must be checked running, not just read (L1 s35–36). | 159 checks click real buttons in a real browser. One command reruns everything after any change. | About 4 minutes per run; Edge or Chrome must be installed. |

---

## 4. Assumptions

1. **Scope is a prototype.** Data lives in each browser (`localStorage`). There is no server, so two people on different devices do not see each other's changes. Passwords are stored in plain text in the browser because the accounts are demo accounts.
2. **Campus email = identity.** Sign-up accepts only `@campus.edu`, `*.edu` or `*.ac.in` addresses. Real email verification (OTP/SSO) is out of scope.
3. **No online payments.** Rent, deposits and sale prices are settled in person at pickup, and the app shows this. Prices are in ₹ and capped at ₹1,00,000.
4. **Day-level booking.** Loans are booked by whole days (inclusive), at most 6 months ahead, with a max period per listing (1–30 days).
5. **Pickup happens on campus.** Pickup spots are a fixed list of common areas (hostel lobby, library, canteen, main gate…).
6. **The owner's hostel is the item's location.** If a student changes hostel, their listings and open wanted posts move with them.
7. **Trust comes from ratings.** One rating per side per completed exchange, 1–5 stars.
8. **All people, hostels and listings in the demo are fictional.**

---

## 5. Improvisations beyond the original brief

The brief asked for listings, requests, items, accounts, hostels and requesting options. These additions came from design review and testing:

| Improvisation | Trigger |
|---|---|
| **Wanted board**: request items nobody has listed. Includes "post this search as wanted" from an empty search, and notifications when a matching item is listed. | Requests should also work when no listing exists. |
| **Double-booking prevention** with visible "Clashes with Aarav's booking" labels and auto-decline of clashing requests. | Design review: two requests for the same dates could both be accepted. |
| **Two-step return** (borrower "I've returned it" → owner confirms). | Design review: either side should be able to start the return. |
| **"Viewing as" demo switcher** always on screen. | Demo review: reviewers need to play both owner and borrower quickly. |
| **Quantity / multiple units**, and the **duplicate-listing dialog** ("add 1 to existing → 3" or post separately). | Edge-case audit: "what if someone has 2 of the same item?" |
| **Guards against stale tabs, double clicks and forged actions.** Rules for editing listings with open requests. No deleting an item while it is on loan. | Edge-case audit. |
| **Privacy: room number shown only after acceptance.** | Safety review. |
| **Accessibility fixes** (contrast, labels) and **click-through toasts**. | Lighthouse audit and the browser test suite (§6). |
| **Dark mode, mobile tab bar, keyboard shortcuts, live listing preview.** | UX review. |

---

## 6. Evaluation

### 6.1 Automated end-to-end tests (real browser)

`tests/browser-tests.js` drives **Microsoft Edge** with puppeteer-core. Run it with `npm test`. Each group starts from fresh demo data, and every group also asserts **"no JavaScript errors in the page"**.

| # | Group | What is checked (examples) |
|---|---|---|
| 1 | Every page renders | 28 routes × (guest + 3 students). A 404 page is shown for unknown links. Outsiders cannot open someone else's request. |
| 2 | Accounts | Wrong password, redirect after login, session survives reload. Signup rejects: non-campus email, duplicate email (any case or spacing), blank name, malformed email. |
| 3 | Listing validation and duplicates | Title length, missing or negative price, prices above the cap, quantity 0 or 51. The same item twice gives a merge or post-separately dialog. The same object from two owners shows both. HTML in titles is shown as text. |
| 4 | Quantity | 3 students ask for a 2-unit item on the same dates. Accept 2 → the 3rd is auto-declined and notified. A 4th is blocked for those dates but can book free ones. "1 of 2 free" → "on loan" → back to available. |
| 5 | Single item: dates | Clash labels, overlapping, past, reversed, too-long and >6-month dates. A forced second request is blocked. A stale request with past dates can't be accepted. |
| 6 | Sell and giveaway | Offer limits (browser *and* app), reservations, a buyer backing out, sold out → relist. Last unit of a 2-unit giveaway → "claimed", remaining requests declined. |
| 7 | Full lifecycle | Notification → chat (Enter, blank ignored) → room hidden, then revealed → hand-over → no delete while on loan → two-step return → ratings (once only). |
| 8 | Stale tabs and wrong person | A second tab declines a request; the first tab refreshes itself and rejects a stale Accept. The requester can't accept, hand over or return. Non-owners can't pause listings. A double-click is recorded once. |
| 9 | Editing with open requests | Can't change type, shrink the max period, or lower quantity below commitments. Pause/resume works. Delete cancels requests and notifies; deleted items vanish from Saved. |
| 10 | Wanted board | Validation, offers with an attached listing, one offer per person, accept → fulfilled, reopen. Empty search → prefilled wanted post. |
| 11 | Profile and community | Blank-name guard. Changing hostel moves listings. Saved items, mark-all-read, guest ♥ → login. |
| 12 | Navigation | Filters stack, live search keeps focus, back/forward, `/` shortcut, theme persists, reset restores data. |
| 13 | Mobile (390 px) | No horizontal overflow on 12 pages, bottom tab bar, filter drawer. |

**Result: 159 / 159 checks pass, 0 JavaScript errors** (Edge, 26 Nov 2026).

**What verification caught.** These are defects in AI-generated code that were found by running it, not by reading it (L1 s49–51):

| Defect | Found by | Fix |
|---|---|---|
| Two people could be accepted for the same dates | Design review | Booking conflict model, auto-decline |
| No way to represent 2 of the same item; duplicates silently created | Edge-case audit | `quantity` field, per-day load, duplicate dialog |
| Old tab or double click could re-run Accept or Decline | Second-tab test | `guardReq` re-validates the role and state |
| Item could be deleted while on loan; type could change under open requests | Edge-case tests | Blocked with explanations |
| Hidden radio inputs sat over neighbouring stars, so clicking ★4 could save ★5 | Test failed: stored 5 instead of 4 | Inputs made non-interactive |
| Stacked toasts covered modal buttons, so clicks were lost | Test failed: Delete did nothing | Toasts limited to 3 and click-through |
| Form fields read through `form.fieldName` (not portable) | jsdom smoke test crash | `form.elements.fieldName` |
| A bulk edit broke an unrelated variable (`f.name` in reviews) | Smoke test crash | Corrected and re-tested |
| Content overflowed sideways on phones | Screenshot review | `min-width: 0` guards |
| Low contrast in dark mode; icon-only button had no label | Lighthouse | Darker button colour, `aria-label` |

The test harness itself also had bugs (state carried over between groups, background-tab timer throttling, clicks during a 0.18 s modal animation). These were diagnosed separately from app bugs before any app code was changed, so no assertion was weakened to get a green run.

### 6.2 Lighthouse audit (performance, accessibility, best practices)

| | Performance | Accessibility | Best practices | SEO | First paint | Layout shift |
|---|---|---|---|---|---|---|
| Desktop | **100** | **100** | **100** | **100** | 0.4 s | 0 |
| Mobile (throttled) | **98** | **100** | **100** | **100** | 1.8 s | 0 |

Before the fixes, Accessibility was 96 (desktop) and 91 (mobile).

---

## 7. How the course principles were applied

| CS5013 principle (lecture, slide) | How it shows in this project |
|---|---|
| **"The fix is verification: compile, run, test, read"** (L1 s35–36) | Nothing was accepted on reading alone. Every change ran through the browser suite, and all bugs in §6.1 were found by running the code. |
| **Calibration: treat AI output as a smart but unverified collaborator's first draft** (L1 s37) | The AI's own claims ("this works") were never taken as evidence. Only test results and screenshots were. |
| **The AI-assisted loop: Intent → Prompt → Suggestion → Read → Run & test → Commit** (L1 s48) | Each feature in [PROMPTS.md](PROMPTS.md) records intent, prompt, output, verification and the gap that led to the next prompt. |
| **Iterate by testing on bad input** (L1 s49–51) | Groups 2, 3, 5 and 8 feed invalid, stale and forged input on purpose. |
| **Four parts of a prompt: instruction, context, examples, output format** (L2 s3–4) and **CO-STAR** (L2 s103) | Each prompt in the log is written in this shape. |
| **"Iteration: name the gap", not "try again"** (L2 s11) | Every follow-up prompt names a measured gap, such as "Delete did nothing: status=available, modal still open". |
| **Logging prompt iterations as an engineering artefact** (L2 s35, s139) | [PROMPTS.md](PROMPTS.md) is versioned in the repository. |
| **Ask for the test first / 3 happy + 2 edge** (L2 s39–40) | Each test group pairs happy paths with edge and abuse cases. |
| **Negative prompting** (L2 s66–71, s127) | Prompts forbid frameworks, build steps, unescaped HTML, weakened assertions and invented claims. |
| **Fix-this-code: diagnosis → patch → explanation; distrust unexplained patches** (L4 s9–11) | Each failure was diagnosed first, e.g. a test bug vs. an app bug. The toast fix came with its explanation (toasts covering buttons). |
| **Tests decide; diff review after every refactor** (L4 s22, s56) | The suites were rerun after every change. |
| **Characterization tests before refactoring** (L4 s97–101) | The earlier suites (65 and 16 checks) were rerun to catch regressions before the quantity/guard refactor. |
| **Coverage is hygiene, not quality; read every assertion** (L5 s13, s16) | The assertions encode requirements (e.g. "3rd request auto-declined"), not implementation details. |
| **README with description, build, quick example; docs as code; TODO escape hatch** (L5 s34–37) | README, AGENTS.md and the docs live in the repository. Unknowns (name, URLs) are marked TODO, not invented. |
| **Data leakage: never paste secrets or personal data** (L1 s45–47) | Only fictional data. No keys, no real student data, no external APIs. |
| **Disclose AI assistance; never submit code you have not read** (L1 s5, s47) | See §8. Reading the code before the viva is listed as a required human step. |

---

## 8. AI usage disclosure

**Tool:** Claude Code (Claude Opus 5.5), in VS Code, 26 November 2026.

**AI-generated:** all application code (`index.html`, `css/`, `js/`), the demo data, the browser test suite (`tests/`), and the documentation (this file, README, PROMPTS.md, AGENTS.md, DEPLOYMENT.md).

**Human-directed:**
- the problem and scope;
- the decision to build a demo prototype;
- the requirement to audit edge cases (e.g. "two of the same item");
- the requirement to follow the CS5013 principles;
- the choice of Netlify and GitHub for hosting.

**How correctness was verified:** the real-browser suite (159 checks, §6.1), the earlier in-memory smoke tests (81 checks), Lighthouse (§6.2), and visual review of desktop and mobile screenshots. Each defect in §6.1 was fixed and re-tested before moving on.

**Still required from the student before submission or viva:**
1. **Read and be able to explain every file**, especially `js/app.js` (booking model, guards, router) and `tests/browser-tests.js`. The course forbids submitting AI code you have not read (L1 s47).
2. Fill in the TODO fields at the top (name, roll number, deployed URL, repository URL).
3. Open the deployed link on a phone and do one complete borrow flow by hand.

---

## 9. Limitations and future work

| Limitation | Next step |
|---|---|
| Data is per browser, so not shared between real users | Move storage to a hosted database with real-time sync (e.g. Supabase or Firebase). The data model already maps 1:1 to tables. |
| Demo passwords in plain text; no email verification | Campus SSO or OTP login; server-side auth and row-level security (only an owner can accept their requests). |
| Notifications appear in the app only | Email or push notifications for new requests and due dates. |
| Photos stored as compressed data-URLs | Object storage with thumbnails. |
| Day-level bookings | Optional hour slots for short loans (chargers, irons). |
| No moderation or reporting | Report listing/user, admin dashboard, ban rules. |

---

## 10. Running it

- **Online:** open the app link at the top.
- **Locally:** open `index.html` in any browser, or run `npx serve .`.
- **Tests:** `npm install`, then `npm test` (needs Microsoft Edge; set `BROWSER` to use Chrome).
- **Demo tip:** in the top banner, pick **Kabir Singh** → Requests to see the double-booking guard. Pick **Rohan Verma** → his calculator listing to see quantity (2 units).
