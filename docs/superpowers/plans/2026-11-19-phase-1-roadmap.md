# Phase 1 roadmap

Phase 1 is the personal MVP in [`docs/plan.md`](../../plan.md), built to the Aurora design in
[`design/README.md`](../../../design/README.md). It is too big for one implementation plan, so
it is split into six. Each plan ends with an app that runs and does something more than the
last one, and each gets its own detailed plan written just before it starts.

## The six plans

| # | Plan | Ends with | Design it implements |
|---|---|---|---|
| 1 | [Foundation](2026-11-19-foundation.md) | Connect to a server, pick a budget, watch it download, and land on a screen showing this month's Ready to budget | Round 2 "Connect"; ADR 0002 |
| 2 | Plan screen (built; checked on an Android emulator, see [app/README.md](../../../app/README.md#what-works)) | The real Plan: month switcher, top card, one notice, category tiles, pull to refresh | Round 1 B "Plan"; round 2 stress cases (long names, largest text, overbudgeted, offline) |
| 3 | [Quick add](2026-11-19-quick-add.md) (built; checked on an Android emulator, see [app/README.md](../../../app/README.md#what-works)) | Add a transaction from anywhere, with the bite | Round 3 "Quick add" and "more than the category has" |
| 4 | Moving money | Category screen, Move money, Cover overspending, Assign | Round 1 B "Category"; round 3 "Cover", "Move money", "Assign" |
| 5 | Accounts and transactions | Accounts list, an account's transactions, categorizing what is uncategorized | Round 2 "Accounts" and "Transactions" |
| 6 | Finish | Light theme, motion to the round 3 spec, haptics, Reduce Motion, screen-reader labels, Android details | Round 2 "under stress"; round 3 "Motion" |

Order matters for 1 to 3. Plans 4 and 5 do not depend on each other and can swap. Plan 6 comes
last because it touches every screen.

## What is shared, and where it is decided

- **The engine adapter** (`app/src/engine/`) is the only code that talks to Actual's engine.
  Each plan adds the calls it needs. Plan 1 sets its shape: typed methods, errors with a code,
  integer cents.
- **Design tokens and base components** (`app/src/theme/`, `app/src/ui/`) are set up in plan 1
  and added to as screens need them. Colours come from the contrast-checked set in
  `design/src/contrast.mjs`, and a test keeps the two in step.
- **The bite** is built once in plan 3 as a component and reused in plan 4.
- **Tests:** logic and components with Jest. The engine with the Node harness, which already
  runs in CI. Each plan ends with a run on the iOS simulator and an Android emulator.

## Decisions already made

- The engine runs in the app (ADR 0001) on the JS thread, with a progress screen for the first
  download (ADR 0002).
- Direction Aurora, the bite, the motion spec and the Ring logo (`design/README.md`).
- The session token is kept in the Keychain or Keystore. The password is never stored.

## Still open, and which plan has to settle it

| Question | Settle in |
|---|---|
| Plain HTTP for LAN and Tailscale servers: allowed behind a toggle, as `docs/architecture.md` says | Plan 1 |
| Encrypted budgets: plan 1 shows "not supported yet"; real support is Phase 2 | Plan 1 |
| Name, logo and trademark checks | Before any store work; not part of Phase 1 |
| Sign out leaves the downloaded budget on the phone: delete it, or keep it? | Before any build leaves the household |
| First-download time. On a Galaxy S24 Ultra (release build, over HTTPS) the owner's own budget downloaded too fast to notice; its size was not recorded. The 12,400-transaction test budget took 3.2 s on the Android emulator (debug build). Still unmeasured: a large budget on a mid-range phone, which is what ADR 0002's 5 s threshold is about. Plans 2 and 3 measured nothing new; it needs a mid-range phone. | Before a public beta |
| A future month says "Budgeted" for a category that only has money carried in, with nothing budgeted that month. | Plan 4 |
| The app's last month is one later than the reference client's for the same budget (November 2027 against October 2027). Both come from Actual; harmless so far, but worth knowing when comparing. | Plan 4 |
| A monthly goal's note ("$40.00 more needed") ignores money carried in from last month. Settle it with goals and Cover. | Plan 4 |
| The top card shows "Free $7,007" under "Ready to budget $7,006.86": the same figure, rounded differently, on one card. | Plan 6 |
| The pull-to-refresh spinner draws over the month switcher's next arrow while it turns. | Plan 6 |
| At the largest text size with the Offline chip showing, the top bar may overflow; not yet tried. | Plan 6 |
| Actual's rules run when a transaction is added, so a rule can change the payee or category after Save; quick add's preview (the suggested category, the bite) does not show this. | Plan 5 |
| A save that finishes after the sheet was swiped away says nothing when it succeeds. The transaction exists and the Plan updates; a confirmation belongs with the transaction list. | Plan 5 |
| The engine check (`npm run engine:verify`) does not yet check that transfer payees are left out of quick add's payees, or that income categories are offered. | Plan 5 |
| Quick add's account name is cut short ("Everyday Ch…") at large text, and at normal text on a 360-point-wide screen. The picker shows the full name. | Plan 6 |
| On a tall phone there is an empty band between quick add's date row and the keypad; the design packs the keypad up under the form. Decide between that and keeping the keypad in thumb reach. | Plan 6 |
| Quick add's payee is a tall labelled field, heavier than the design's small pill under the amount. The compact sheet tightens it but keeps its shape. | Plan 6 |
| Changing the system text size while the quick-add sheet is open closes it on Android and loses what was typed (Android restarts the screen; it needs native `configChanges`). Dark mode does not. | Plan 6 |
| The bite's spring was still moving a second after the last key (debug build). Measure it in a release build first, with the motion spec. | Plan 6 |
| Quick add's header has no "Today" at its right, where the design has one; the date is in the row with the account instead. | Plan 6 |
| Quick add's date label never shows the year ("Tue 17 Nov"); only reachable by stepping back past 1 January a day at a time. | Plan 6 |
| Android may read the quick-add warning ("That is … more than … has") twice: once as the card's label and once from its live region. | Plan 6 |
| Reopening a budget syncs with no time limit (`openBudget`), where every other sync gives up after 15 seconds. Rare, because sign-in, which is bounded, has just succeeded. | Plan 6 |
| Quick add's lists (`getQuickAddLists`) have never been timed on a large budget; measure with the first-download time on a mid-range phone. The sheet shows a spinner meanwhile. | Plan 6 |

## Settled

- **Returning to the app** re-reads today's date and syncs, and **a sync gives up after 15
  seconds**, as sign-in gives up after 5. The scripted device check starts once per launch.
  (Plan 3.)
- **Android's three-button navigation** is drawn by `expo-navigation-bar` with its buttons
  following the theme; seen in light and dark on the emulator. (Plan 3's branch; see below.)
- **Quick add, fixed before plan 3's merge** (final review): an open sheet follows the Plan's day,
  so one left open past midnight calls its date "Yesterday" rather than dating it the day before
  under "Today"; a short screen (360 × 640 points) gets a compact sheet with the category card and
  its bite above the keypad; the amount shows what was typed ("$18.", "$18.4"); and the
  category list draws an overspent balance coral, by the Plan's own rule. (Plan 3.)

- **A category with no goal template** describes itself from its own numbers: "Not spent yet",
  "Fully spent", "$150.00 left over" in a past month, "Budgeted" in a future one, "Nothing
  budgeted" when there is nothing at all, and "Overspent" when it is below zero. Templates are an
  experimental Actual feature most budgets do not have, so this is the main case. (Plan 2.)
- **Pace is shown**, as "$17 a day for 12 days", for a category in the current month that has
  money left and has been spent from. It is our own sum: what is left, divided by the days left
  including today, rounded down to a whole dollar so it never promises more than is left. Checked by hand against the emulator's numbers. (Plan 2.)

## Fixes made after plan 2 was merged

Three fixes were made after plan 2's pull request had been merged, and ride on plan 3's branch:
the amounts' type and spacing (Geist figures, and cents large enough to read as cents), the
Android navigation bar (`expo-navigation-bar`, approved by the owner, with a fade behind it), and
overspending that rolls over to next month, which the notice no longer counts as "over" and the
tile describes as "Rolls over to next month".

## Not in Phase 1

Reports, editing rules, imports, bank-sync setup, widgets, an offline queue with a visible
status, and encrypted budgets. These are listed as non-goals or as Phase 2 in `docs/plan.md`.
