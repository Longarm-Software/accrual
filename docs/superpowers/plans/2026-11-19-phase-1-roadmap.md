# Phase 1 roadmap

Phase 1 is the personal MVP in [`docs/plan.md`](../../plan.md), built to the Aurora design in
[`design/README.md`](../../../design/README.md). It is too big for one implementation plan, so
it is split into six. Each plan ends with an app that runs and does something more than the
last one, and each gets its own detailed plan written just before it starts.

## The six plans

| # | Plan | Ends with | Design it implements |
|---|---|---|---|
| 1 | [Foundation](2026-11-19-foundation.md) | Connect to a server, pick a budget, watch it download, and land on a screen showing this month's Ready to budget | Round 2 "Connect"; ADR 0002 |
| 2 | Plan screen | The real Plan: month switcher, top card, one notice, category tiles, pull to refresh | Round 1 B "Plan"; round 2 stress cases (long names, largest text, overbudgeted, offline) |
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
| What a category shows when it has no goal template (no "$40 needed by 5 Dec") | Plan 2 |
| Whether "pace" ("$17 a day") is worth showing, since it is our own sum and not Actual's | Plan 2 |
| Plain HTTP for LAN and Tailscale servers: allowed behind a toggle, as `docs/architecture.md` says | Plan 1 |
| Encrypted budgets: plan 1 shows "not supported yet"; real support is Phase 2 | Plan 1 |
| Name, logo and trademark checks | Before any store work; not part of Phase 1 |
| Sign out leaves the downloaded budget on the phone: delete it, or keep it? | Before any build leaves the household |
| First-download time. On a Galaxy S24 Ultra (release build, over HTTPS) the owner's own budget downloaded too fast to notice; its size was not recorded. The 12,400-transaction test budget took 3.2 s on the Android emulator (debug build). Still unmeasured: a large budget on a mid-range phone, which is what ADR 0002's 5 s threshold is about. | Plan 2 |
| The scripted device check starts twice on one launch (two interleaved runs were recorded), which can inflate its timings. Find the double start and stop it. | Plan 2 |

## Not in Phase 1

Reports, editing rules, imports, bank-sync setup, widgets, an offline queue with a visible
status, and encrypted budgets. These are listed as non-goals or as Phase 2 in `docs/plan.md`.
