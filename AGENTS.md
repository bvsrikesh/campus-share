# Instructions for AI coding assistants

Read this before changing anything. It applies to Claude Code, Copilot, Codex and any other assistant.

## What this project is

CampusShare is a zero-build static web app (HTML, CSS, vanilla JS) where hostel students lend, rent, sell and give away items. Data lives in `localStorage`. Start with `README.md` and `docs/SUBMISSION.md`.

## Hard rules

1. **No framework, no build step.** The app must keep opening by double-clicking `index.html`.
2. **Item status is derived.** Never set `item.status` to `available`, `onloan`, `sold` or `given` by hand. Call `syncItemStatus(item)` after changing requests. Only `paused` and `removed` are set directly.
3. **Every state change re-validates.** Request actions start with `guardReq(id, role, allowedStatuses)`. Listing actions use `ownItem`; wanted posts use `ownWanted`. Never trust that a button on screen is still valid.
4. **Bookings respect quantity.** Use `conflictFor`, `peakLoad` and `unitsLeft`. Never compare dates by hand.
5. **Escape user text.** Wrap every user-supplied string in `esc()` before it goes into HTML, including notification text.
6. **Fictional data only.** No real people, no secrets and no external API calls.
7. **Changing the shape of the data** means bumping the version in `seed()` (`js/data.js`) and in `loadDB()` (`js/app.js`), so old browsers reseed.

## Working method

- Add or update a check in `tests/browser-tests.js` first, then make it pass. Run `npm test` (Microsoft Edge required) and read the result. Use `ONLY=<group number> npm test` for one group.
- When a check fails, decide whether the bug is in the test harness or in the app **before** editing anything. Never weaken an assertion to get a green run.
- Update the docs that describe changed behaviour in the same commit. Write TODO for anything unknown; never claim a result that was not produced.

## Map

| File | Responsibility |
|---|---|
| `js/data.js` | categories, types, pickup spots, seed data (`seed()`) |
| `js/app.js` | store (`loadDB`, `saveDB`), booking model, guards, router (`ROUTES`), pages (`page*`), `ACTIONS` (clicks), `FORMS` (submits), event wiring |
| `css/styles.css` | design tokens (light/dark), components, responsive rules |
| `tests/browser-tests.js` | 13 end-to-end groups (puppeteer-core + Edge) |
| `docs/` | submission, prompt log, deployment |
