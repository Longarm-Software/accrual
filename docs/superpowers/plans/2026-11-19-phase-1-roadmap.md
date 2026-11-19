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
| 3 | Quick add | Add a transaction from anywhere, with the bite | Round 3 "Quick add" and "more than the category has" |
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
| First-download time. On a Galaxy S24 Ultra (release build, over HTTPS) the owner's own budget downloaded too fast to notice; its size was not recorded. The 12,400-transaction test budget took 3.2 s on the Android emulator (debug build). Still unmeasured: a large budget on a mid-range phone, which is what ADR 0002's 5 s threshold is about. Plan 2 measured nothing new. | Plan 3 |
| The scripted device check starts twice on one launch (two interleaved runs were recorded), which can inflate its timings. Find the double start and stop it. Plan 2 did not get to it. | Plan 3 |
| A future month says "Budgeted" for a category that only has money carried in, with nothing budgeted that month. | Plan 4 |
| The app's last month is one later than the reference client's for the same budget (November 2027 against October 2027). Both come from Actual; harmless so far, but worth knowing when comparing. | Plan 4 |
| "Today" is read once, when the Plan opens. A phone that keeps the app in memory overnight shows yesterday's pace, and at a month's end the wrong current month. Re-read today, and sync, when the app returns to the foreground. | Plan 3 |
| A sync has no time bound: a server that silently drops packets keeps the pull spinner turning for the platform's own timeout. Bound it, as sign-in already is. | Plan 3 |
| A monthly goal's note ("$40.00 more needed") ignores money carried in from last month. Settle it with goals and Cover. | Plan 4 |
| The top card shows "Free $7,007" under "Ready to budget $7,006.86": the same figure, rounded differently, on one card. | Plan 6 |
| The pull-to-refresh spinner draws over the month switcher's next arrow while it turns. | Plan 6 |
| On Android with three-button navigation, the system buttons are invisible in light mode and faint in dark mode. The fix is the `expo-navigation-bar` package (a new native dependency) with its style following the theme. | Next build for the owner's phone, once the dependency is approved |
| At the largest text size with the Offline chip showing, the top bar may overflow; not yet tried. | Plan 6 |

## Settled

- **A category with no goal template** describes itself from its own numbers: "Not spent yet",
  "Fully spent", "$150.00 left over" in a past month, "Budgeted" in a future one, "Nothing
  budgeted" when there is nothing at all, and "Overspent" when it is below zero. Templates are an
  experimental Actual feature most budgets do not have, so this is the main case. (Plan 2.)
- **Pace is shown**, as "$17 a day for 12 days", for a category in the current month that has
  money left and has been spent from. It is our own sum: what is left, divided by the days left
  including today, rounded down to a whole dollar so it never promises more than is left. Checked by hand against the emulator's numbers. (Plan 2.)

## Not in Phase 1

Reports, editing rules, imports, bank-sync setup, widgets, an offline queue with a visible
status, and encrypted budgets. These are listed as non-goals or as Phase 2 in `docs/plan.md`.
