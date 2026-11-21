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
| 4 | [Moving money](2026-11-21-moving-money.md) (built; checked on an Android emulator, see [app/README.md](../../../app/README.md#what-works)) | Category screen, Move money, Cover overspending, Assign | Round 1 B "Category"; round 3 "Cover", "Move money", "Assign" |
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
| The app's last month is one later than the reference client's for the same budget (November 2027 against October 2027). Both come from Actual; harmless so far, but worth knowing when comparing. Plan 4 did not look into it. | Plan 6 |
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
| On a short phone with the over-budget warning showing, opening a picker and closing it leaves the form scrolled to the top without the fade that says there is more below. | Plan 6 |
| On a 360 × 640 screen the move sheet shows only the From card above the keypad; To needs a scroll. At the largest text size it shows about one card at a time. The same layout decision as quick add's tall band and small screens. | Plan 6 |
| At the largest text size on a 360 × 640 screen, with the Plan at the top, the `+` sits over the notice's `Cover` (a tap there opened quick add), and the month switcher runs past the right edge. | Plan 6 |
| A move or cover now syncs before it writes (waiting 3 seconds at most; offline, or with a server that does not answer, it writes on the phone's copy as before) and is refused, with "That changed while you were here" and the new figures, when either pot differs from what the sheet showed. What remains: a change another device makes between that sync and the write (about a second for a partner whose app is online, plus a round trip), and a change a partner makes offline, which is unbounded: whichever device's change to the same budget cell is later wins when they sync. That is how Actual's sync works; the app cannot close it. | Before a public beta |
| The cover sheet's list of sources has no fade at the bottom when it runs under the button (the move sheet has one; reuse `moreBelow`). | Plan 6 |
| Content scrolling under the status bar is cut off hard at the safe-area edge (the Plan, the category screen), with no fade. | Plan 6 |
| "Still set aside $0" next to "Spent $14,147" after a large expense: the figure (`planSummary.ts`) is this month's budgeted minus spent and ignores money carried in, so it can mislead. | Plan 6 |
| A token the server has revoked shows "Not synced" after a sync instead of signing out: the server answers `unauthorized`, and only `token-expired` signs out (`usePlanMonth.ts`). | Plan 5 |
| At the largest text size a long sheet title ("Cover Subscriptions") is drawn smaller than Cancel, to fit on one line. | Plan 6 |
| In a past month the notice has no button, so it is shorter and the tiles start higher than in the current month. | Plan 6 |
| The move sheet's swap control (two chevrons in a small glass circle) is faint in the dark theme, and plainer than the design's. | Plan 6 |
| Each change of the system text size on Android restarts the screen and, in a debug build, logs "Looks like you have configured linking in multiple places" once. Goes with the `configChanges` row above. | Plan 6 |

## Settled

- **A future month's tile** for a category with money only carried in, nothing budgeted that
  month, says "{balance} carried in" rather than "Budgeted". **A monthly goal's note** ("$40.00
  more needed") stays as it is: it compares this month's budgeted amount with the goal, as
  Actual's own indicator does. (Plan 4, decision 11.)
- **Moving money, as built:** one sheet moves between any two pots (a category or Ready to
  budget), so Assign is a move from Ready to budget and Fix a move to it; covering has its own
  sheet; past months are read-only; every write is Actual's own budget action. (Plan 4.)
- **Fixed in plan 4's device run:** a past month's category screen listed later months'
  transactions too (a query bound Actual dropped; `engine:verify` now checks it); leaving a sheet
  with nothing to show stacked a second Plan; a refused write's message was out of sight; at the
  largest text a button's label was cut off and a long sheet title squeezed Cancel; the top
  card's amount moved when the card had a pill. (Plan 4.)

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
