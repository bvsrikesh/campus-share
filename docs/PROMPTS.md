# Prompt log: CampusShare

This log follows CS5013 L2 s35 ("logging your prompt iterations is a real engineering artefact"). It records the significant AI-assisted tasks in order: the prompt, what was produced, how it was verified, and the gap that led to the next prompt.

> **About the prompt text.** The real session was a conversation in informal language. The prompts below are the **cleaned-up, structured versions** of those instructions. They use the four-part structure (L2 s3–4: instruction, context, examples/constraints, output format) and name the gap each time (L2 s11). The order, intent and outcomes match the real session. Nothing was sent to the AI except fictional demo data (L1 s45).

Tool: Claude Code (Claude Opus 5.5) in VS Code · Date: 26 Nov 2026

---

## P1: Build the prototype (specification prompt)

**Intent.** Turn "a campus sharing site" into a concrete, demo-ready product.

```text
ROLE/CONTEXT
You are building a demo prototype for a university course. Users are hostel students
who want to borrow, lend, rent, sell or give away everyday items (calculators,
cycles, lab coats, notes, formals) instead of buying them for one-time use.
The project folder is empty. Node is available; Python is not.

TASK
Build "CampusShare", a web app covering:
1. Accounts: campus-email sign-up/login, profile (hostel, room, dept, year), demo accounts.
2. Hostels: directory + per-hostel page (listings, members, stats).
3. Listings: modes Lend (free) / Rent (per day) / Sell / Giveaway; price, deposit,
   max lending days, condition, photo or icon; edit / pause / delete.
4. Browse: search + filters (category, type, hostel, price, available now) + sorting,
   "nearest first" = same hostel as the viewer.
5. Requesting: dates for lend/rent with cost estimate, offer price for sell,
   pickup spot, message. Lifecycle pending → accepted → handed over → returned,
   decline/cancel, chat per request, ratings, notifications.
6. A "Wanted" board for items nobody has listed.

CONSTRAINTS (negative prompting)
- Zero install / zero build: plain HTML + CSS + JS, opens by double-click.
- Data in localStorage; seed realistic FICTIONAL data (no real people or institutions).
- Escape all user text (no HTML injection). Room numbers private until a request is accepted.
- Mobile-first: bottom tab bar on phones; dark mode; accessible labels.
- Do not claim anything works until it has been run.

OUTPUT
index.html, css/styles.css, js/data.js (constants + seed), js/app.js (store, router, pages,
actions), README.md. Then run it and report what was verified.
```

**Produced.** A hash-routed single-page app with 15 routes, seed data (6 hostels, 10 students, 30 items, 8 wanted posts, 8 requests), and a full request state machine.

**Verified.** `node --check` on all scripts. A jsdom smoke test visited all 20 routes logged-out and logged-in and drove the main flows: request, chat, accept, hand-over, return, rating, post item, wanted post, offer, sign-up (65 checks). Headless Edge screenshots at desktop and phone width were reviewed.

**Gaps found → next prompts.**
- The smoke test crashed because `form.from` is not portable. Fixed by switching to `form.elements.from`.
- A bulk find-and-replace also hit an unrelated `f.name` variable. The test caught it.
- Phone screenshots looked cropped. Diagnosed as a headless-browser minimum-width artefact; overflow guards were added anyway.

---

## P2: Design review: two-sided demo and booking integrity

**Intent.** Make the prototype easy to demo from both sides, and close gaps in the request flow.

```text
CONTEXT
CampusShare (js/app.js, js/data.js). Requests: pending → accepted → active → completed.
Reviewers must demo an exchange as BOTH owner and borrower.

TASK
1. Review the request lifecycle for integrity gaps (can two requests hold the
   same dates? who can start a return?).
2. Make switching between demo students a one-click, always-visible control.
3. Fix each gap; seed a demo scenario that shows each fix.

OUTPUT
The list of gaps found, the changes made, and the tests proving them.
```

**Produced.**
- An always-visible "Viewing as" account switcher.
- Competing requests are declined automatically when one is accepted.
- A two-step return: the borrower marks it returned, then the owner confirms.

**Main gap found.** **Double-booking**: an owner could accept two people for the same dates. Added `conflictFor`. Clashing requests show a red "Clashes with …" label instead of Accept. Accepting auto-declines overlaps. The date picker defaults to the first free window, and booked dates are listed.

**Verified.** 16 new jsdom checks: clash blocked, non-clash accepted, overlapping submission rejected, default dates free, return handshake, banner switch.

---

## P3: Edge-case and consistency audit

**Intent.** Find every way the data could become inconsistent before a reviewer does.

```text
CONTEXT
CampusShare (js/app.js). Requests move pending → accepted → active → completed,
or declined/cancelled. Items are lend/rent (dated) or sell/free (undated).

TASK
Audit for consistency problems and fix them. Think about at least:
- the same object listed twice by one owner; the same object from two owners;
- an owner with 2+ units of the same item (two calculators);
- double submits / double clicks; an old tab acting on stale state;
- the wrong person triggering an action (forged button, edited HTML);
- deleting or editing a listing that has open or active requests;
- dates in the past, reversed ranges, far-future bookings, over max period;
- prices/offers that are zero, negative or absurd; blank or whitespace-only names;
- hostel change by a user who owns listings.
For each: describe the failure scenario, then the rule you enforce.

CONSTRAINTS
- Item status must be DERIVED from requests, never hand-set.
- Every state-changing action must re-check role + current status at click time.
- Keep the demo seed coherent; bump the storage version so old browsers reseed.

OUTPUT
Code changes + a list of rules enforced + the scenario that proves each one.
```

**Produced.**
- A `quantity` field with a per-day load model (`peakLoad`) and per-unit stock for sales (`unitsLeft`).
- `syncItemStatus`, so item status is always derived from the requests.
- Guards on every action: `guardReq`, `ownItem`, `ownWanted`.
- A duplicate-listing dialog: merge into the existing listing, or post separately.
- Edit rules: no type change, quantity reduction or max-period cut under open requests.
- No deleting an item while it is on loan.
- Validation for dates, prices, offers and names.
- Listings move with the owner when they change hostel.
- Seed data gained a 2-unit calculator and the same calculator from a second owner.

**Verified.** By the browser suite in P4. The earlier jsdom suites were rerun first as characterization tests (L4 s97) to confirm no regressions.

---

## P4: Real-browser test suite (ask for the tests first)

**Intent.** Prove the audit's rules hold in a real browser, with real clicks.

```text
TASK
Write an end-to-end suite with puppeteer-core driving the installed Microsoft Edge.
Organise it in groups; each group starts from fresh demo data and must also assert
"no JavaScript errors in the page".

For every rule from P3 write at least one happy-path and one abuse-path check
(L2 s40: 3 happy + 2 edge as a minimum per feature). Include:
- two tabs: tab B changes a request, tab A must refresh and reject its stale button;
- forged buttons (wrong user / wrong state) injected into the DOM;
- quantity: 3 borrowers for 2 units on the same dates;
- a 390px mobile viewport with no horizontal overflow on every main page.

CONSTRAINTS
- Assertions must encode requirements, not implementation details (L5 s16).
- When a check fails, first decide: harness bug or app bug? Never weaken an assertion
  to get a green run.

OUTPUT
tests/browser-tests.js, `npm test` script, and a pass/fail report with details.
```

**Produced.** `tests/browser-tests.js`: 13 groups and 159 checks, plus live progress and failure details.

**Iterations (naming the gap each time, L2 s11):**

| Run | Result | Gap identified | Classified as | Fix |
|---|---|---|---|---|
| 1 | hung > 10 min | `nav()` waited forever for a `hashchange` that never fired | harness | timeouts + per-group 60 s limit |
| 2 | 92/104 | "reset" changed only the hash, so in-memory state leaked between groups | harness | real reload after clearing storage |
| 2 | — | ₹0 / too-high offers produced no toast | harness (expected a toast, but the browser's own validation blocks first) | assert native validity, *and* bypass it to prove the app also rejects |
| 3 | 109/117 | later groups timed out after the two-tab test | harness (background-tab timer throttling) | `bringToFront`, throttling flags |
| 4 | 148/155 | rating stored ★5 when ★4 clicked | **app**: hidden radio inputs sat over neighbouring stars | inputs made non-interactive |
| 5 | 154/159 | "Delete did nothing: status=available, modal still open" | **app**: stacked toasts covered modal buttons | max 3 toasts, click-through |
| 6 | **159/159** | — | — | — |

**Verified.** The final run passed every check with no JavaScript errors, and was repeated from the project folder with `npm test`.

---

## P5: Accessibility and performance audit

**Intent.** Objective quality numbers for the evaluation section.

```text
TASK
Serve the app locally and run Lighthouse (desktop preset and mobile) using Edge.
Report the category scores and Core Web Vitals; list every failing audit with
the exact element. Fix accessibility failures without changing the visual design
in light mode; then re-run and report before/after.
OUTPUT
Before/after table + the CSS/JS changes.
```

**Produced.** The audit found low contrast in dark mode (white on light purple, grey counts on coloured tiles) and an icon-only Reset button with no accessible name. Fixes: a darker `--btn` colour in dark mode, readable tile counts, and an `aria-label` on the Reset button.

**Verified.** Accessibility went from 96 to **100** on desktop and from 91 to **100** on mobile. Performance is 100 on desktop and 98 on mobile. Best Practices and SEO are 100. The browser suite was rerun after the CSS change: 159/159.

---

## P6: Documentation, deployment and submission

**Intent.** A submission a grader can evaluate without asking questions.

```text
CONTEXT
Course: CS5013 Programming with AI. Principles are in lectures 1–5 (extracted to a
cited list). Submission needs: problem statement, app link, prompts, evaluation.

TASK
Write docs/SUBMISSION.md (problem, solution, design decisions with merits and
trade-offs, assumptions, improvisations, evaluation with real numbers, principle-by-
principle mapping with slide citations, AI-usage disclosure, limitations),
docs/PROMPTS.md (this log), docs/DEPLOYMENT.md (GitHub + Netlify steps),
AGENTS.md (rules for future AI assistants), and update README.md.

CONSTRAINTS
- Report only results that were actually produced in this session; mark unknowns
  (name, URLs) as TODO instead of inventing them (L5 s35).
- Prompts must be the structured versions, labelled as such, not raw chat.
- Audience: course graders; concise, skimmable tables.
```

**Produced.** The documents listed above, `netlify.toml`, and a ready git repository.

**Verified.** Every number in SUBMISSION.md was checked against the test logs and Lighthouse JSON. All links between documents are relative.

**Limitations.** The deployed URL and repository URL are filled in by the student after deployment. The student must read every file before the viva (L1 s47).
