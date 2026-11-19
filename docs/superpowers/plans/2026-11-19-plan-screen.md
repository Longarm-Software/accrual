# Plan Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder Home with the real Plan screen: this month's budget as Aurora tiles, a month switcher, the top card, one notice, pull to refresh, and the app opening when the server cannot be reached.

**Architecture:** The engine adapter gains a month read that includes goal targets, and a sign-in that tolerates being offline. Everything a tile says is decided by pure functions in `src/features/plan/`, tested without React. Components draw what those functions return. The Plan screen wires an engine, a month and a refresh together and holds no budgeting logic.

**Tech Stack:** As plan 1: Expo SDK 58, React Native 0.88, TypeScript 6, Expo Router, Reanimated 4, Jest with jest-expo and React Native Testing Library 14. Actual 26.11.0.

This is plan 2 of 6. See the [Phase 1 roadmap](2026-11-19-phase-1-roadmap.md). It builds on the [foundation plan](2026-11-19-foundation.md).

**How this plan is written.** The foundation plan gave every file's code in full, and several review rounds were spent fixing mistakes in that code. This plan gives exact interfaces, exact behaviour as tables, and the tests' cases; it gives code only for the pure logic, where exactness matters most. Components and screens are specified by what they must show and do. Write them to fit the installed packages and the patterns already in `app/src/`.

## Global Constraints

- **Fake data only.** This repo is public. No real budgets, server URLs, passwords, tokens or screenshots of real transactions, in code, tests, fixtures or commit messages. The test server is the throwaway one on port 5007. Never point anything at port 5006.
- **Never store the password.** Only the session token, in expo-secure-store. Neither may appear in logs or error messages.
- **All amounts are integer cents.** In Actual, money spent is a **negative** number: a category that spent $512.38 has `spent: -51238`. Convert to text only when displaying, with `src/lib/money.ts`.
- **The UI never imports the engine bundle.** UI code imports types from `src/engine/types.ts` and gets an `Engine` from `useSession()`. Only `src/engine/adapter.ts` requires the bundle.
- **One engine per process.** `createEngine` signs in afresh and replaces the previous session.
- **Colours, radii, spacing and type come from `src/theme/tokens.ts`.** No hex values in screens or components. If a size is needed that has no token, add the token.
- **Budgeting logic lives in `src/features/plan/` as pure functions.** A component never compares amounts or builds a status string.
- **Tests:** screen tests live in `app/src/app-tests/`, never under `app/src/app/` (Expo Router bundles everything there). The testing library is async: `await render(...)`, `await fireEvent.press(...)`. App code is typechecked without Node or Jest globals.
- **Install Expo packages with `npx expo install <name>`.** Read `https://docs.expo.dev/versions/v58.0.0/` before using an Expo API.
- **Xcode 27.0 cannot build expo-dev-launcher 58.0.21.** Build iOS with `DEVELOPER_DIR=/Applications/Xcode-26.6.0.app/Contents/Developer`.
- **Commits** are scanned by gitleaks. Never use `--no-verify`.
- Before a task is done: `npm run typecheck` and `npm test` pass in `app/`, with no warnings in the test output.

## Decisions this plan makes

These were open in the roadmap. They are settled here.

1. **A category with no goal template describes itself from its own numbers.** Actual's goal templates are an experimental feature most budgets will not have, so the template-free case is the main one, not a fallback. The rules are the table in Task 2.
2. **Pace is shown** ("$17 a day for 12 days"), for a category in the current month that has money left and has been spent from. It is our own sum (what is left, divided by the days left including today), not an Actual feature.
3. **Tiles have no icons.** The mockups gave each category an icon, but Actual stores none. People who want one put an emoji in the category's name, and that shows as part of the name.
4. **No Assign button, no Cover button, no dock.** Assign and Cover arrive in plan 4, quick add in plan 3 and Accounts in plan 5. A button that does nothing is worse than no button. The top card and the notice inform only.
5. **Tracking budgets are not supported yet.** Actual has two budget types. Everything here assumes the envelope type, which is the default. A tracking budget gets a plain message.
6. **Offline: the app opens the copy on the phone.** It says it is offline and shows the numbers it has.

## File Structure

New and changed files, with what each is for:

```
app/
  engine/entry.ts                    (no change expected)
  harness/verify.ts                  + checks for getPlanMonth, month bounds, offline open
  src/
    engine/
      types.ts                       + PlanMonth, PlanGroup, PlanCategory, MonthBounds; Engine gains
                                       offline, getPlanMonth, getMonthBounds
      adapter.ts                     offline-tolerant token sign-in; the new reads
    lib/
      month.ts                       + addMonths, compareMonths, monthLabel, daysLeftInMonth
    features/plan/
      categoryView.ts                a category's status, note and bar, from its numbers
      planSummary.ts                 the top card's figures and the notice
      usePlanMonth.ts                loads a month from the engine; reload; refresh (sync then reload)
      CategoryTile.tsx               one tile
      GroupHeader.tsx                group name and what is available in it
      HeroCard.tsx                   Ready to budget, or Overbudgeted
      Notice.tsx                     the one line about overspending
      MonthSwitcher.tsx              previous, month name, next
      AccountMenu.tsx                profile button; budget name; Sign out
    ui/
      ProgressBar.tsx                a track with a filled part
      Chip.tsx                       a small pill of text (used for "Offline")
    session/
      SessionProvider.tsx            (small change: nothing blocks an offline open)
      fakeEngine.ts                  + the new Engine members, with a fake month
    app/
      index.tsx                      becomes the Plan screen
      opening.tsx                    an offline reopen is not an error
    app-tests/                       tests for the above screens
tools/test-server/scripts/seed.mjs   + one category with a goal template, if practical (Task 1)
```

---

### Task 1: Engine: a month with goals, month bounds, and opening offline

**Files:**
- Modify: `app/src/engine/types.ts`, `app/src/engine/adapter.ts`, `app/harness/verify.ts`, `app/src/session/fakeEngine.ts`, `app/src/dev/autorun.ts` (only if a signature it uses changes)
- Possibly modify: `tools/test-server/scripts/seed.mjs`

**Interfaces:**
- Consumes: the engine bundle; loot-core handlers `envelope-budget-month` (returns `{ name, value }[]` for a month, including `budget-<id>`, `sum-amount-<id>`, `leftover-<id>`, `carryover-<id>`, `goal-<id>`, `long-goal-<id>` per category), `get-budget-bounds` (`{ start, end }`), `get-categories` or `api/budget-month` for names and hidden flags, `subscribe-set-token`, `subscribe-get-user`. Read them in `app/node_modules/@actual-app/core/src/server/` (`budget/app.ts`, `auth/app.ts`, `main.ts`, `api.ts`) before using them. Verify every shape against the source.
- Produces, in `src/engine/types.ts`:

```ts
export type PlanCategory = {
  id: string;
  name: string;
  budgeted: number;   // cents assigned this month
  spent: number;      // cents, negative or zero
  balance: number;    // cents left; negative when overspent
  carryover: boolean; // overspending rolls into next month
  goal: number | null; // cents; the target a goal template set for this month, or null
  longGoal: boolean;   // true when `goal` is a balance to reach, false when it is an amount to budget
};
export type PlanGroup = { id: string; name: string; categories: PlanCategory[] };
export type PlanMonth = {
  month: string;        // YYYY-MM
  toBudget: number;     // negative when overbudgeted
  totalIncome: number;
  totalBudgeted: number; // as Actual reports it (see its sign in the source and normalise to a positive amount)
  totalSpent: number;    // negative or zero
  groups: PlanGroup[];   // expense groups only, in Actual's order; hidden groups and categories left out
};
export type MonthBounds = { start: string; end: string }; // YYYY-MM, inclusive

// Engine gains:
//   readonly offline: boolean;                       true when the server could not be reached at sign-in
//   getPlanMonth(month: string): Promise<PlanMonth>;
//   getMonthBounds(): Promise<MonthBounds>;
```

`getMonth` and `BudgetMonth` stay for the harness and the scripted check.

**Behaviour:**

| Situation | Result |
|---|---|
| `createEngine({ serverURL, password })` | Unchanged from plan 1. `offline` is `false`. |
| `createEngine({ serverURL, sessionToken })`, server reachable, token good | Resolves. `offline` is `false`. |
| …server reachable, token rejected | Throws `EngineError` code `token-expired`. |
| …server **not reachable** | Resolves. `offline` is `true`. The token is kept for later syncs. |
| `openBudget(budget)` when `offline` and a local copy exists | Reports `opening`, loads the local copy, does **not** sync, resolves. |
| `openBudget(budget)` when `offline` and no local copy | Throws `EngineError` code `network-failure`. |
| `sync()` when the server cannot be reached | Throws `EngineError` code `network-failure`. It must not leave the budget unusable. |
| `getPlanMonth(m)` on a tracking budget | Throws `EngineError` code `tracking-budget`. |
| `getPlanMonth(m)` for a month outside the bounds | Whatever loot-core returns for it; do not add a check. |

Plan 1's `createEngine` passed the token to loot-core's `init`, which contacts the server and throws when it cannot. To open offline, sign in without that step: start the engine with the server address only, set the token with `subscribe-set-token`, then ask `subscribe-get-user` and act on what it says. Read `getUser` in `auth/app.ts` for what it returns when offline and when the token is bad. Whatever you find, the table above is the contract.

- [ ] **Step 1: Write the failing harness checks**

In `app/harness/verify.ts`, after the existing "months identical" check for the large budget, add checks that:

1. `getPlanMonth(month)` agrees with `getMonth(month)` for the same month: `toBudget`, `totalIncome` and `totalSpent` equal; for every expense category that is not hidden, `budgeted`, `spent` and `balance` equal; no income group is present; group and category order matches.
2. `getMonthBounds()` returns `start <= end`, both `YYYY-MM`, and the current month lies within them.
3. Every `goal` is `null` or a positive integer, and `longGoal` is a boolean.
4. If Step 2 below manages to seed a templated category: that category's `goal` is the seeded amount.

Add an offline section that runs after the budgets are downloaded (so local copies exist). Use a server address nothing listens on, `http://127.0.0.1:59999`:

5. `createEngine({ serverURL: 'http://127.0.0.1:59999', sessionToken: token, dataDir })` resolves with `offline === true`.
6. On that engine, `openBudget(large, record)` reports exactly `opening`, and `getPlanMonth(month)` equals what the online engine returned for the same month.
7. On that engine, `sync()` rejects with code `network-failure`, and `getPlanMonth(month)` still works afterwards.
8. On that engine, opening a budget with no local copy (use a made-up `RemoteBudget` with ids that do not exist) rejects with code `network-failure`.

Then sign in to the real test server again so later checks, if any, have a working session. Remember there is one engine per process.

- [ ] **Step 2: See whether the seeder can give one category a goal**

A goal comes from a template in the category's note, applied for a month. In `tools/test-server/scripts/seed.mjs`, try to give one category in "Spike Small" a monthly template (for example `#template 150` in its note) and apply templates for the current month through `@actual-app/api` or the handler behind it. Look in loot-core's `budget/goal-template.ts` and `budget/app.ts` for the handler names.

If it works within about half an hour, keep it, reseed, and add check 4. If it does not, leave the seeder alone, skip check 4, and say exactly what blocked it in your report. Do not fake a goal in the adapter.

- [ ] **Step 3: Run the harness and watch the new checks fail**

Run: `npm run engine:verify` (test server running).
Expected: the new checks fail because `getPlanMonth` is not a function.

- [ ] **Step 4: Implement in `types.ts` and `adapter.ts`**

Keep the existing comment style in `adapter.ts`: say what loot-core actually does where it is not obvious, with the file it was read from.

- [ ] **Step 5: Extend the fake engine**

In `app/src/session/fakeEngine.ts`, add `offline: false`, `getMonthBounds` (returning `{ start: '2026-01', end: '2027-12' }`) and `getPlanMonth`, returning a fixed fake month built from this data (cents; the same household as the design mockups):

| Group | Category | budgeted | spent | balance | goal | longGoal |
|---|---|---|---|---|---|---|
| Bills | Rent | 185000 | -185000 | 0 | null | false |
| Bills | Electricity | 12000 | 0 | 12000 | null | false |
| Bills | Insurance | 10000 | 0 | 10000 | 14000 | false |
| Everyday | Groceries | 72000 | -51238 | 20762 | null | false |
| Everyday | Dining out | 22000 | -24810 | -2810 | null | false |
| Goals | Emergency fund | 40000 | 0 | 640000 | 1000000 | true |

with `toBudget: 31200`, `totalIncome: 619200`, `totalBudgeted: 588000`, `totalSpent: -341617`. Export the month as `fakePlanMonth` so tests can refer to it. Existing tests must keep passing.

- [ ] **Step 6: Run everything**

Run: `npm run engine:build && npm run typecheck && npm run engine:verify && npm run engine:verify -- cold && npm test`
Expected: all pass, including every "months identical" check from plan 1.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Engine: a month with goals, month bounds, and opening offline"
```

---

### Task 2: What a tile says (pure logic)

The rules for a category's status, note and bar, and for the top card and the notice. No React.

**Files:**
- Create: `app/src/features/plan/categoryView.ts`, `categoryView.test.ts`, `planSummary.ts`, `planSummary.test.ts`
- Modify: `app/src/lib/month.ts`, `app/src/lib/month.test.ts`, `app/src/lib/money.ts`, `app/src/lib/money.test.ts`

**Interfaces:**
- Consumes: `PlanCategory`, `PlanMonth`, `PlanGroup` from `src/engine/types.ts`; `formatMoney` from `src/lib/money.ts`.
- Produces:

```ts
// lib/month.ts
export function addMonths(month: string, n: number): string;            // ('2026-11', 2) -> '2027-01'
export function compareMonths(a: string, b: string): -1 | 0 | 1;
export function monthLabel(month: string): { name: string; year: string }; // '2026-11' -> { name: 'November', year: '2026' }
export function daysLeftInMonth(month: string, today: Date): number;    // counting today; 0 if `month` is not today's month

// lib/money.ts
export function formatWholeMoney(cents: number): string; // rounds to the nearest dollar: 1730 -> '$17', -2810 -> '−$28'

// features/plan/categoryView.ts
export type CategoryStatus = 'ok' | 'spent' | 'needs' | 'over' | 'goal' | 'idle';
export type CategoryView = {
  status: CategoryStatus;
  note: string;
  fill: number; // 0 to 1, how full the bar is
};
export function categoryView(category: PlanCategory, when: { month: string; today: Date }): CategoryView;

// features/plan/planSummary.ts
export type HeroView = {
  state: 'ready' | 'even' | 'over';
  label: string;   // 'Ready to budget' | 'Every dollar has a job' | 'Overbudgeted'
  amount: number;  // toBudget, cents
  flow: { spent: number; setAside: number; free: number }; // shares of the bar, summing to 1 (or all 0)
  spentText: string; setAsideText: string; freeText: string;
};
export function heroView(month: PlanMonth): HeroView;
export function overspentNotice(month: PlanMonth): string | null;
```

**The rules for `categoryView`.** Check them in this order; the first that matches wins. `left` is `balance`; `used` is `max(0, -spent)`.

| # | When | status | note | fill |
|---|---|---|---|---|
| 1 | `balance < 0` | `over` | `Overspent` | 1 |
| 2 | `goal` set, `longGoal`, `balance >= goal` | `goal` | `Goal reached` | 1 |
| 3 | `goal` set, `longGoal` | `goal` | `{p}% of {goal}` where p is `balance / goal` rounded down to a whole percent and `{goal}` is `formatWholeMoney(goal)` | `balance / goal` |
| 4 | `goal` set, not `longGoal`, `budgeted < goal` | `needs` | `{amount} more needed` where amount is `formatMoney(goal - budgeted)` | `budgeted / goal` |
| 5 | `budgeted === 0`, `spent === 0`, `balance === 0` | `idle` | `Nothing budgeted` | 0 |
| 6 | `balance === 0` | `spent` | `Fully spent` | 1 |
| 7 | `month` is today's month and `used === 0` | `ok` | `Not spent yet` | 0 |
| 8 | `month` is today's month and `daysLeftInMonth >= 2` | `ok` | `{perDay} a day for {n} days` where perDay is `balance / n` rounded **down** to whole dollars (amended in the final fix pass; it was rounded to the nearest, which can promise more than is left: $30.00 over 12 days showed "$3 a day", $36 in all); if that is `$0` (under $1 a day), `{left} left for {n} days` with `formatMoney(balance)` | `used / (used + balance)` |
| 9 | `month` is today's month (so it is the last day) | `ok` | `{left} left today` with `formatMoney(balance)` | `used / (used + balance)` |
| 10 | `month` is before today's month | `ok` | `{left} left over` with `formatMoney(balance)` | `used / (used + balance)` |
| 11 | otherwise (a future month) | `ok` | `Budgeted` | `used / (used + balance)` |

> **Amended during implementation.** `used` is `max(0, -spent)`, so a net refund counts as not
> spent from. "Not spent yet" (rule 7) applies only in the current month; a past month reads
> "left over" and a future month "Budgeted" whether or not anything was spent. A pace that would
> round to $0 a day says how much is left instead. In the final fix pass the pace was changed to
> round down, never to the nearest dollar, so it never adds up to more than is left. Rule 3's percent is worked out in whole
> cents (`floor(balance * 100 / goal)`), because the floating-point form shows 57% as 56%.

`fill` is always clamped to 0–1. A category that met a monthly goal (rule 4 does not match because `budgeted >= goal`) falls through to rules 5 to 11 like any other.

**The rules for `heroView`.** `state` is `over` when `toBudget < 0`, `even` when it is 0, `ready` otherwise, with the labels in the type above. The flow bar shows where the month's money is: `spent = max(0, -totalSpent)` (a month of net refunds counts as nothing spent), `setAside = max(0, totalBudgeted - spent)`, `free = max(0, toBudget)`; each share is its part of the three added together, or all zeros when they add to zero. The three texts are `Spent {formatWholeMoney}`, `Still set aside {…}`, `Free {…}`.

**The rules for `overspentNotice`.** Look at every category with `balance < 0`. None: `null`. One: `{name} is {amount} over`, with `formatMoney` of the shortfall as a positive amount. More than one: `{n} categories are {total} over`.

- [ ] **Step 1: Write the failing tests**

One test per rule in each table, each named for the rule. Use real numbers from the fake household where they fit:

- Rule 1: Dining out (`balance -2810`) → `over`, `Overspent`, fill 1.
- Rule 3: Emergency fund (`balance 640000`, `goal 1000000`, long) → `goal`, `64% of $10,000`, fill 0.64.
- Rule 4: Insurance (`budgeted 10000`, `goal 14000`) → `needs`, `$40.00 more needed`, fill ≈ 0.714.
- Rule 6: Rent → `spent`, `Fully spent`.
- Rule 7: Electricity → `ok`, `Not spent yet`, fill 0.
- Rule 8: Groceries on 19 November 2026 with month `2026-11` → 12 days left, `$17 a day for 12 days`, fill ≈ 0.712.
- Rule 9: Groceries on 30 November 2026 → `$207.62 left today`.
- Rule 10: Groceries viewed as `2026-10` from November → `$207.62 left over`.
- Rule 11: Groceries viewed as `2026-12` from November → `Budgeted`.
- Order: an overspent category that also has a goal is `over`, not `needs`.
- Clamp: `balance` above a long goal never gives fill above 1.

For `lib/month.ts`: `addMonths` across a year end in both directions; `compareMonths`; `monthLabel`; `daysLeftInMonth` for the first day, a middle day, the last day, a leap-year February, and a month that is not today's (0).

For `heroView`: the fake month (ready, shares summing to 1), a month with `toBudget` 0 (`even`), a month with `toBudget` −12000 (`over`, `free` share 0), and a month of all zeros (all shares 0, no division by zero).

For `overspentNotice`: none, one (`Dining out is $28.10 over`), two.

- [ ] **Step 2: Run them and watch them fail**

Run: `npm test -- features/plan lib`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement**

Dates: use the device's local time, as `currentMonth` in `lib/month.ts` already does. `daysLeftInMonth` counts today.

- [ ] **Step 4: Run the tests and typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Plan: what a tile, the top card and the notice say, as pure functions"
```

---

### Task 3: The pieces of the Plan screen

Components only. Each takes plain values and draws them.

**Files:**
- Create: `app/src/ui/ProgressBar.tsx`, `app/src/ui/Chip.tsx`, `app/src/features/plan/CategoryTile.tsx`, `GroupHeader.tsx`, `HeroCard.tsx`, `Notice.tsx`, `MonthSwitcher.tsx`, `AccountMenu.tsx`, and a `*.test.tsx` beside each of the six in `features/plan/`
- Modify: `app/src/theme/tokens.ts` (add any type sizes these need; fix `type` usage so no component has a bare font size)

**Interfaces:**
- Consumes: `CategoryView`, `HeroView` from Task 2; `PlanCategory`, `PlanGroup`; `Glass`, `Money`, text components, `useTheme`, tokens.
- Produces:

```ts
<ProgressBar fill={0..1} color={string} />                     // 5 high, rounded, track from tokens
<Chip label={string} color?={string} />
<CategoryTile category={PlanCategory} view={CategoryView} compact={boolean} />
<GroupHeader name={string} available={number} />               // available: cents, the sum of positive balances
<HeroCard hero={HeroView} />
<Notice text={string} />
<MonthSwitcher month={string} canGoBack={boolean} canGoForward={boolean} onChange={(month: string) => void} />
<AccountMenu budgetName={string} onSignOut={() => void} />
```

**Look.** The reference is the Plan screen in `design/previews/round-1/aurora.png` (first phone) and the three left phones in `design/previews/round-2/aurora-checks.png`. Use them for proportions, not for features: there are no icons, no Assign button, no Cover button and no dock (see "Decisions").

| Piece | What it shows | Notes |
|---|---|---|
| `CategoryTile` | Name; the balance as `Money`; a `ProgressBar`; the note | A `Glass` tile, radius `radius.tile`. The amount, the bar and (for `over` and `needs`) the note take the status colour: `ok` → `color.ok`, `goal` → `color.goal`, `needs` → `color.need`, `over` → `color.over`, `spent` and `idle` → `color.zero`. The name wraps to two lines and then truncates. An amount of $1,000 or more, or −$1,000 or less, is drawn one size smaller so it fits. An `over` tile has a border in the over colour. When `compact` is false (large text), the tile is a row: name and note on the left, amount on the right, bar underneath. |
| `GroupHeader` | Group name on the left, `formatWholeMoney(available)` on the right | Quiet text. |
| `HeroCard` | `hero.label`; `hero.amount` as large `Money`; the three-part flow bar; the three texts | In the `over` state the amount is in the over colour and the card is tinted with it. The flow bar is three segments side by side: spent in ink, set aside in a quieter ink, free in the gradient. |
| `Notice` | One line of text | Tinted and bordered in the over colour. No button. |
| `MonthSwitcher` | A previous button, the month name with its year in quieter text, a next button | A disabled button is visibly dimmer and does nothing. |
| `AccountMenu` | A round button; pressing it shows the budget's name and a Sign out button; pressing outside hides it | A simple overlay is enough. |

**Accessibility.** Each tile is one element for a screen reader, labelled `{name}, {formatMoney(balance)} available, {note}` (for an overspent category: `{name}, overspent by {amount}`). The month buttons are labelled `Previous month` and `Next month` and report when they are disabled. The account button is labelled `Account`. The hero is labelled `{label}, {formatMoney(amount)}`.

- [ ] **Step 1: Write the failing tests**

For each component, tests that check what a person would see or a screen reader would say, not the styles. At least:

- `CategoryTile`: shows the name, `$207` and `.62`, and the note for Groceries; the screen-reader label for Groceries and for an overspent category; a long name is limited to two lines; `compact={false}` still shows all three pieces.
- `GroupHeader`: given `available={29700}`, shows the name and `$297`.
- `HeroCard`: shows `Ready to budget` and `$312` for the fake month; shows `Overbudgeted` for an `over` hero; the three flow texts are present.
- `Notice`: shows its text.
- `MonthSwitcher`: shows `November` and `2026`; pressing next calls `onChange('2026-12')`; previous calls `onChange('2026-10')`; a disabled button does not call `onChange`.
- `AccountMenu`: the budget name is not shown until the button is pressed; pressing Sign out calls `onSignOut` once.

- [ ] **Step 2: Run them and watch them fail**

Run: `npm test -- features/plan`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement the components**

- [ ] **Step 4: Run the tests and typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS, no warnings.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Plan: tile, group header, top card, notice, month switcher and account menu"
```

---

### Task 4: The Plan screen

**Files:**
- Create: `app/src/features/plan/usePlanMonth.ts`, `app/src/app-tests/plan.test.tsx` (replacing `app/src/app-tests/index.test.tsx`, whose routing tests move into it)
- Modify: `app/src/app/index.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1 to 3; `useSession`; `currentMonth`; `connectErrorMessage`; `fakeEngine`, `fakePlanMonth`.
- Produces:

```ts
// features/plan/usePlanMonth.ts
export type PlanLoad =
  | { state: 'loading' }
  | { state: 'ready'; month: PlanMonth }
  | { state: 'failed'; code: string };
export function usePlanMonth(engine: Engine | null, month: string): {
  load: PlanLoad;
  offline: boolean;                 // the last sync failed, or the engine started offline
  refreshing: boolean;
  refresh(): Promise<void>;         // sync, then reload; a failed sync sets `offline` and keeps the data
};
```

The route `/` keeps its redirects from plan 1 (`signedOut` and `needsBudget` → `/connect`; `closed` → `/opening`; the developer check first, when it is switched on).

**Behaviour:**

| Situation | What the screen shows |
|---|---|
| Month is loading for the first time | The month switcher and account button, and a `Spinner` where the content will be. |
| Month loaded | Month switcher and account button at the top; the top card; the notice if `overspentNotice` returns text; then each group as a `GroupHeader` and its tiles in a two-column grid. The whole screen scrolls. |
| Text size is large (font scale 1.3 or more) | One column, tiles with `compact={false}`. |
| Pull down | `refresh()`: sync with the server, then reload the month. The pull-to-refresh spinner shows while it runs. |
| Sync fails | The numbers stay. An `Offline` chip appears beside the month switcher. Nothing else changes. |
| The engine started offline | The same `Offline` chip, from the start. |
| A later refresh succeeds | The chip goes away. |
| Month switcher | Changes the month and loads it. Previous and next are disabled at the ends of `getMonthBounds()`. The screen starts on the current month. |
| Switching month | The old month's tiles are not shown under the new month's name: show the spinner, or keep the old content dimmed, until the new month arrives. |
| A budget with no expense categories | `This budget has no categories yet. Add them in Actual.` |
| `getPlanMonth` fails with `tracking-budget` | `This budget uses tracking, which Accrual does not support yet.` and nothing else but the account button. |
| `getPlanMonth` fails with anything else | `Could not read this month.` with a `Try again` button that reloads. |
| Sign out, from the account menu | Calls `session.signOut()`; the redirect to `/connect` follows from the status change. |
| A result arrives for a month the person has already left | It is ignored. |

**Not in this screen:** assigning, covering, tapping a tile, quick add, the dock.

- [ ] **Step 1: Write the failing tests**

In `app/src/app-tests/plan.test.tsx`, with the `expo-router` mock used by the other screen tests and a `SessionProvider` given a fake engine:

- the three routing tests from the old `index.test.tsx`, kept as they are;
- after the budget opens: `Ready to budget`, `$312`, the notice `Dining out is $28.10 over`, the group names, and tile text for Groceries (`$207` and a pace note) are shown. Fix "today" so the pace note is deterministic (Jest fake timers set to 19 November 2026, or pass the date in; choose one and say which in the report);
- pressing `Next month` asks the engine for `2026-12` and shows `December`;
- `Next month` is disabled when the current month is the last in the bounds;
- a pull to refresh calls `engine.sync` and then reads the month again;
- when `engine.sync` rejects with `network-failure`, `Offline` appears and the tiles are still shown;
- when the engine has `offline: true`, `Offline` is shown without any refresh;
- a `getPlanMonth` that rejects with `tracking-budget` shows the tracking message;
- a `getPlanMonth` that rejects with another code shows `Could not read this month.`, and pressing `Try again` reads the month again;
- an engine whose month has no groups shows the no-categories message;
- `Account` then `Sign out` calls sign out (assert through the session: status becomes `signedOut`);
- a slow first month followed by a quick second: after pressing `Next month` while the first read is still pending, the first result does not replace the second.

Delete `app/src/app-tests/index.test.tsx` once its three routing tests live in the new file.

- [ ] **Step 2: Run them and watch them fail**

Run: `npm test -- app-tests/plan`
Expected: FAIL.

- [ ] **Step 3: Implement `usePlanMonth` and the screen**

- [ ] **Step 4: Run every test and typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS, no warnings (watch for act warnings from the pending-read tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Plan screen: tiles, top card, notice, month switcher, refresh and offline"
```

---

### Task 5: Opening offline

Plan 1's opening screen treats an unreachable server as an error. With Task 1, a budget already on the phone can open without the server.

**Files:**
- Modify: `app/src/app/opening.tsx`, `app/src/app-tests/opening.test.tsx`, `app/src/features/opening/stageCopy.ts` and its test if copy changes, `app/src/session/SessionProvider.tsx` only if something there blocks an offline open

**Behaviour:**

| Situation | What happens |
|---|---|
| Saved session, server unreachable, budget already on the phone | The opening screen shows `Opening {name}` and goes to `/`. No error. The Plan screen shows `Offline` (Task 4). |
| Saved session, server unreachable, budget not on the phone | `Could not reach that server. Check the address and your connection.` with `Try again`, as now. |
| Connecting for the first time with the server unreachable | Unchanged: the Connect screen says it could not reach the server. Signing in with a password needs the server. |
| Token rejected by a reachable server | Unchanged: back to Connect. |

- [ ] **Step 1: Write the failing tests**

In `opening.test.tsx`: an engine with `offline: true` whose `openBudget` reports only `opening` leads to `router.replace('/')` and no error text; an engine whose `openBudget` rejects with `network-failure` still shows the message and `Try again`. Keep every existing test.

- [ ] **Step 2: Run, implement, run**

Most likely nothing in `opening.tsx` needs to change beyond what the fake engine now exercises; if the tests pass at once, say so and check by reading the code that the offline path really is the one being tested. Do not add code that has no failing test.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "Opening: a budget already on the phone opens without the server"
```

---

### Task 6: On devices, and the record

**Files:**
- Modify: `app/README.md`, `README.md`, `docs/plan.md`, `docs/superpowers/plans/2026-11-19-phase-1-roadmap.md`, `design/README.md`

- [ ] **Step 1: Run on the Android emulator**

With the test server running and the developer check switched off (move `app/.env.local` aside, start Metro with `--clear`), build and run the app on the project's own emulator. Start it on its own port so it cannot be confused with another project's:

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@17 ANDROID_HOME=~/Library/Android/sdk
$ANDROID_HOME/emulator/emulator -avd accrual-spike -port 5560 -no-window -no-audio -no-boot-anim &
```

and address it as `emulator-5560` in every `adb` command. Connect to `http://10.0.2.2:5007` and open "Spike Small", then do each of these, taking a screenshot and looking at it each time:

1. The Plan shows the top card, group headers and two columns of tiles. Fonts, colours and spacing resemble the design.
2. The Ready to budget amount and three categories' balances match the reference client for the same month (`node --env-file=.env scripts/reference.mjs months <groupId> <YYYY-MM>` in `tools/test-server`).
3. Previous month and next month change the month name and the numbers; the buttons stop at the ends.
4. Pull to refresh works. Change a budgeted amount with the reference client's `edit` command first, and confirm the change appears.
5. Stop the test server, pull to refresh: `Offline` appears and the tiles stay.
6. With the server still stopped, close the app (`am force-stop`) and reopen it: it opens to the Plan with `Offline`.
7. Start the server, pull to refresh: `Offline` goes away.
8. Raise the system font size to its largest (`adb shell settings put system font_scale 1.3`), reopen: one column, nothing cut off. Put it back to `1.0` afterwards.
9. `Account`, then `Sign out`: back to Connect.

- [ ] **Step 2: Run on the iOS simulator**

Build with Xcode 26.6, install and launch. Nothing on this machine can tap the simulator, so this verifies only that the app builds and its first screen renders. Report it as exactly that.

- [ ] **Step 3: Write it down**

- `app/README.md`: update the layout block to match the tree; replace the "What works" table with one for this plan's nine checks, by platform, marking anything not run as not run and why.
- `README.md`: Status says the Plan screen works and what is next.
- `docs/plan.md`: tick or annotate the Phase 1 lines this plan completes (the Plan screen line, pull to refresh), with the platforms they were verified on. Covering overspending, category detail and transactions stay unticked.
- The roadmap: mark plan 2 as built in its table; move the two questions this plan settled (no-template categories, pace) out of "Still open" into a short "Settled" list with the answer; add anything new that came up.
- `design/README.md`: under the direction heading, note the three places the built screen deliberately differs from the mockups (no icons, no Assign or Cover button yet, no dock yet) and why.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Plan screen: device run and docs"
```

---

## Done when

- `npm test`, `npm run typecheck` and `npm run engine:verify` pass in `app/`, and CI is green.
- All nine checks in Task 6 pass on the Android emulator, or each one that does not is reported with its reason.
- Nothing in `src/features/plan/*.tsx` or `src/app/index.tsx` compares amounts or builds a status string; that all happens in `categoryView.ts` and `planSummary.ts`.

## Not in this plan

Tapping a tile (plan 4), Assign and Cover (plan 4), quick add (plan 3), accounts and transactions (plan 5), the dock (when there is a second place to go), tracking budgets, due dates on targets ("by 5 Dec" needs the template itself, not just its amount), motion and haptics (plan 6).
