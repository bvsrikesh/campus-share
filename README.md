# CampusShare: borrow, lend and share across campus hostels

A campus sharing marketplace where students can **lend, rent, sell or give away** items across hostels, and post **wanted requests** for things they need.

**Live app:** https://campus-share-bvs.netlify.app · **Code:** https://github.com/bvsrikesh/campus-share · **Submission:** [docs/SUBMISSION.md](docs/SUBMISSION.md) · **PDF:** [docs/CampusShare_Submission.pdf](docs/CampusShare_Submission.pdf) · **Deploy guide:** [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

| Tests | Lighthouse (desktop) | Lighthouse (mobile) |
|---|---|---|
| 159/159 browser checks pass | Performance 100 · Accessibility 100 · Best practices 100 | Performance 98 · Accessibility 100 · Best practices 100 |

## Run it
No install or build step. Open `index.html` in a browser (double-click works), or open the live link.
Optional local server: `npx serve .`

## Demo accounts
On the login page, click any demo account (password for all of them: `demo123`).
**Aarav Sharma** (Aravali Hall) has the most seeded activity: incoming and outgoing requests, an item on loan, and notifications.
Use the **"Viewing as"** dropdown in the top banner to jump between students and see both sides of a request. **Reset** starts over.
Try viewing as **Kabir Singh**: one of his cycle requests clashes with an existing booking, so Accept is blocked.

## Features
- **Listings**: four sharing modes (Lend / Rent per day / Sell / Giveaway), deposits, max lending period, condition, photo upload or icon, live preview, edit / pause / relist / delete
- **Browse**: search, category, type, hostel and price filters, "available now" toggle, sort by nearest (your hostel first), newest or price
- **Requesting**: date range with cost estimate, offer price for sale items, pickup spot, quick message chips, max-days validation
- **No double-booking**: owners can't accept a request whose dates overlap an existing booking. Accepting a request auto-declines pending ones for the same dates. Borrowers see the booked dates, and the date picker defaults to the first free window.
- **Request lifecycle**: Pending → Accepted → Handed over → Returned/Completed. The borrower taps "I've returned it" and the owner confirms. Also decline and cancel, per-request chat, room number shown only after acceptance, overdue warnings, two-way ratings
- **Wanted board**: post what you need (deadline, budget, mode), others offer help and can attach their listing, accept an offer to mark it fulfilled
- **Hostels**: hostel directory with stats, plus per-hostel listings, wanted posts and members
- **Accounts**: signup restricted to campus email, profiles with reviews and stats, saved items, notifications
- Dark mode, mobile bottom nav, keyboard shortcut `/` to search, `Esc` to close dialogs

## Rules the app enforces
- **Quantity**: a listing can have several units (e.g. 2 calculators). Dates are full only when every unit is booked, and sell/giveaway items become Sold/Claimed when the last unit goes.
- **Same item twice**: if you list something you already listed, the app offers to add the new units to the existing listing instead of creating a duplicate. The same item from different owners stays as separate listings.
- **No double-booking**: requests for full dates are rejected, and accepting a request auto-declines pending ones that no longer fit.
- **Every action is re-checked**: who you are and the request's current state are verified before anything changes. Old tabs, double clicks and tampered buttons can't push a request into an invalid state.
- **Listings with open requests**: you can't switch the sharing type, lower the quantity below units already promised, shorten the max period below an open request, or delete an item that is out on loan.
- **Input checks**: campus-only emails, no blank names, no past dates, bookings at most 6 months ahead, price and offer limits, one open request per item per person, one rating per exchange, and HTML in text is shown as plain text.

## Tests
The suite has 159 checks in 13 groups and runs in real Microsoft Edge:
```
npm install
npm test            # all groups
ONLY=4 npm test     # one group (e.g. quantity)
```
To use Chrome instead, set `BROWSER` to Chrome's exe path.

## Structure
```
index.html        app shell
css/styles.css    all styles (light + dark themes, responsive)
js/data.js        categories, constants, seed data
js/app.js         store (localStorage), router, pages, actions
tests/            end-to-end browser tests (puppeteer-core + Edge)
docs/             submission (problem, link, prompts, evaluations) + PDF, deployment guide
AGENTS.md         rules for AI coding assistants working on this repo
netlify.toml      hosting config (static, no build)
```
Data is kept in `localStorage` under `campusshare.db.v1`. The prototype has no backend.

