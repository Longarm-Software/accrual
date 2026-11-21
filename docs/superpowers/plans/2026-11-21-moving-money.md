# Moving Money Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tap a category to see where its money went, and move money between categories and Ready to budget: assign what is unassigned, cover what is overspent, and shift from one category to another, each with the bite shown before committing.

**Architecture:** The engine adapter gains a category's transactions for a month and two writes (move, cover) that call Actual's own budget actions, so the app never computes a new budgeted amount itself. What a sheet offers and shows (which pots can give, how much, what each will have after, whether the button is live) is decided by pure functions in `src/features/move/`. Three routes draw them: `/category/[id]`, and the modal sheets `/move` and `/cover`. After a change the Plan re-reads and syncs through the path quick add already uses.

**Tech Stack:** As plans 1 to 3: Expo SDK 58, React Native 0.88, TypeScript 6, Expo Router, Reanimated 4, Jest with jest-expo and React Native Testing Library 14. Actual 26.11.0. **No new dependency.**

This is plan 4 of 6. See the [Phase 1 roadmap](2026-11-19-phase-1-roadmap.md). It builds on [quick add](2026-11-19-quick-add.md). The design is round 3's "Cover overspending", "Move money" and "Assign" (`design/previews/round-3/aurora-bite.png`, phones three to five) and round 1 B's "Category" screen in [`design/README.md`](../../../design/README.md).

**How this plan is written.** As plans 2 and 3: exact interfaces, behaviour as tables, and the tests' cases. Code only where exactness matters. Components and screens are specified by what they must show and do.

## Global Constraints

- **Fake data only.** This repo is public. No real budgets, server URLs, passwords, tokens, payee or category names from a real budget, amounts from a real budget, or screenshots of real data, in code, tests, fixtures, docs or commit messages. The test server is the throwaway one on port 5007. Never point anything at port 5006.
- **Never store the password.** Only the session token, in expo-secure-store.
- **All amounts are integer cents.** Money spent is negative in the engine. No floating-point arithmetic on money.
- **The app never computes a budgeted amount to write.** Moving, covering and assigning call Actual's own actions (`budget/transfer-category`, `budget/transfer-available`, `budget/cover-overspending`, `budget/cover-overbudgeted`) through the adapter, so the result is what Actual's own apps would produce, including its notes on the month.
- **The UI never imports the engine bundle.** UI code imports types from `src/engine/types.ts` and gets an `Engine` from `useSession()`.
- **Colours, radii, spacing and type come from `src/theme/tokens.ts`.** Amounts are drawn with `Money` or quick add's `AmountDisplay`; do not restyle them.
- **Logic lives in `src/features/` as pure functions.** A component or screen never compares amounts, builds a status string, or decides whether a button is live.
- **Reuse quick add's pieces** (`Keypad`, `AmountDisplay`, `BiteBar`, `PickerList`, `amountEntry`, `bite`, `sheetLayout`) where they fit; extend them with a prop and a test, do not fork them. Move a piece to `src/ui/` only if two features now need it and the move is mechanical.
- **Tests:** screen tests live in `app/src/app-tests/`. The testing library is async. App code is typechecked without Node or Jest globals.
- **Android draws edge to edge:** anything at the bottom of a screen adds the bottom safe-area inset.
- **Xcode 27.0 cannot build expo-dev-launcher 58.0.21.** Build iOS with `DEVELOPER_DIR=/Applications/Xcode-26.6.0.app/Contents/Developer`.
- **Commits** are scanned by gitleaks. Never use `--no-verify`.
- Before a task is done: `npm run typecheck` and `npm test` pass in `app/`, with no warnings in the test output.

## Decisions this plan makes

1. **Tapping a tile opens the category's screen** for the month the Plan is showing: what it has, how that came about (budgeted, spent, carried in), its note, and that month's transactions, newest first. The transactions are read-only; editing them is plan 5.
2. **One sheet moves money: `/move`.** It has a *from* pot, a *to* pot and an amount. A pot is a category or Ready to budget. Assigning is a move from Ready to budget; un-assigning is a move to it. There is no separate Assign screen, and no suggested split across goals: that needs goal templates most budgets do not have.
3. **You cannot move more than the *from* pot has.** The bar turns coral, a line says by how much, and the button is off. Actual itself would allow a category to go negative this way; a phone sheet should not make that one tap.
4. **Covering is its own sheet, `/cover`,** because the amount is already known: what the category is over by. It lists the pots that could pay, each with the bite it would take; one is preselected. A pot that cannot cover all of it still can be chosen, and then the button says how much it will cover.
5. **Which pot is preselected to cover:** Ready to budget if it can cover everything; otherwise the first category, in the Plan's order, that can; otherwise the pot with the most.
6. **Where the buttons are:**
   - The top card gets `Assign` when Ready to budget is above zero, and `Fix` when it is below zero (overbudgeted). `Fix` opens `/move` with *to* set to Ready to budget and the amount set to the shortfall.
   - The overspent notice gets `Cover`. It opens `/cover` for the first overspent category in the Plan's order. The notice stays until none is left.
   - The category screen has `Cover` when the category is overspent, and `Move money` otherwise.
7. **Past months are read-only.** The category screen opens for any month, but nothing can be moved, covered or assigned in a month before the current one: changing history alters every month after it, and that belongs on a bigger screen.
8. **A category whose overspending rolls over is not offered `Cover`** and is not in the notice (as today). It can still be the *to* of a move.
9. **Hidden categories and income categories are never pots.**
10. **After a change the sheet closes and the Plan (and the category screen under it) show the new numbers at once; the sync runs in the background** through the same path as after a quick-add save.
11. **Two notes the roadmap left for this plan:**
    - A future month's tile for a category with money only carried in, nothing budgeted that month, now says `{balance} carried in` instead of `Budgeted`.
    - A monthly goal's note (`$40.00 more needed`) stays as it is: it compares what was budgeted this month with the goal, which is what Actual's own indicator does. Recorded as settled.

## File structure

| File | Responsibility |
|---|---|
| `app/src/engine/types.ts`, `adapter.ts`, `harness/verify.ts` | The category's transactions; move and cover |
| `app/src/features/move/pots.ts` | The pots of a month, and what each has |
| `app/src/features/move/moveDraft.ts` | The move sheet as data |
| `app/src/features/move/cover.ts` | The cover sheet as data |
| `app/src/features/move/categoryDetail.ts` | What the category screen says |
| `app/src/features/plan/planActions.ts` | Which buttons the top card, the notice and a category offer |
| `app/src/features/move/*.tsx` | `PotCard`, `SourceRow`, `DetailRows`, `ActivityList` |
| `app/src/app/category/[id].tsx`, `move.tsx`, `cover.tsx` | The screens |
| `app/src/features/plan/*`, `app/src/app/index.tsx` | Tile press, the two buttons, refresh after a change |

---

### Task 1: The engine: a category's transactions, move, cover

**Files:**
- Modify: `app/src/engine/types.ts`, `app/src/engine/adapter.ts`, `app/src/session/fakeEngine.ts`, `app/harness/verify.ts`

**Interfaces:**
- Consumes: the adapter's `lib.send` and `lib.q`; how `getQuickAddLists` builds its transaction query (including the required `tombstone: false` filter).
- Produces, in `types.ts`:

```ts
export const READY = 'to-budget';               // the pot that is Ready to budget
export type PotId = string;                     // a category id, or READY
export type ActivityRow = {
  id: string;
  date: string;           // YYYY-MM-DD
  amount: number;         // cents; negative is money out
  payee: string | null;   // the payee's name; for a transfer, the other account's name
  account: string;        // the account's name
  notes: string | null;
};
// Engine gains:
//   getCategoryActivity(categoryId: string, month: string): Promise<ActivityRow[]>;
//   moveMoney(move: { month: string; from: PotId; to: PotId; amount: number }): Promise<void>;
//   coverOverspending(cover: { month: string; category: string; from: PotId; amount: number }): Promise<void>;
```

**Behaviour:**

| Call | Rule |
|---|---|
| `getCategoryActivity` | Transactions with that category whose date is in the month, not tombstoned, newest first (date, then sort order). A split's children carry the category, so query in the mode that returns children with their own category and leaves the parent out. Amounts in cents as stored |
| `moveMoney`, from a category to a category | `budget/transfer-category` with `{ month, amount, from, to }` |
| `moveMoney`, from a category to `READY` | `budget/transfer-category` with `to: 'to-budget'` |
| `moveMoney`, from `READY` to a category | `budget/transfer-available` with `{ month, amount, category }`. Loot-core clamps this to what is available; the caller is expected never to ask for more |
| `moveMoney`, `amount <= 0`, or `from === to` | Rejects with `EngineError('invalid-move', …)` before calling the engine |
| `coverOverspending` | `budget/cover-overspending` with `{ month, to: category, from, amount }`; `from` may be `READY` |
| Any of the writes failing inside loot-core | Rejects with `EngineError('internal', …)`, as other adapter calls do |

Covering an overbudgeted month (Ready to budget below zero) from a category is a move **to** `READY`; it uses `budget/transfer-category`, not `budget/cover-overbudgeted`, so the amount is the one the person saw.

- [ ] **Step 1: Confirm against the bundle** (`app/engine/dist/loot-core.rn.js`; grep, do not read it whole) the argument names of the four budget actions, the month format they take, and how split children are queried. Do not guess. Write what you found in the report.
- [ ] **Step 2: Extend `harness/verify.ts`** first (it is this task's failing test; run with `npm run engine:verify`, test server on 5007), against "Spike Small" in the current month:
  - activity for a category has the same count and total as the reference figure for that category's `spent` (sum of amounts equals `spent`);
  - a category-to-category move of 1234 lowers one budgeted amount and raises the other by 1234, and both balances follow; Ready to budget is unchanged;
  - a move from `READY` of 500 raises the category's budgeted by 500 and lowers Ready to budget by 500;
  - a move to `READY` reverses it;
  - cover: overspend a category by adding a transaction larger than its balance, cover it from another category for exactly the deficit, and its balance is 0 and the source fell by the deficit;
  - `invalid-move` for zero, negative and same-pot moves;
  - after a sync, the reference client (`@actual-app/api`, as the existing checks use) reads the same budgeted amounts.
  Leave the budget as you found it where you can (reverse the moves), so the harness stays repeatable.
- [ ] **Step 3: Implement in the adapter; add the three methods to `fakeEngine()`** (the fake's moves must change the month it returns from `getPlanMonth`, so screen tests can see a balance change; keep it simple) **and a `fakeActivity` fixture with made-up names.**
- [ ] **Step 4: `npm test`, `npm run typecheck`, `npm run engine:verify`; commit.**

```bash
git add -A
git commit -m "Engine: a category's transactions, moving money and covering overspending"
```

---

### Task 2: The logic

**Files:**
- Create: `app/src/features/move/pots.ts`, `moveDraft.ts`, `cover.ts`, `categoryDetail.ts`, `app/src/features/plan/planActions.ts`, each with a `.test.ts`
- Modify: `app/src/features/plan/categoryView.ts` and its test (decision 11); `app/src/features/quickAdd/bite.ts` only if a shared helper is needed

**Interfaces:**
- Consumes: `PlanMonth`, `PlanCategory`, `READY`, `PotId` from `src/engine/types.ts`; `bite`, `Bite` from `src/features/quickAdd/bite.ts`; `Entry`, `entryCents` from `amountEntry.ts`; `isOverspent` from `categoryView.ts`; `formatMoney`; `compareMonths`, `currentMonth`.
- Produces:

```ts
// pots.ts
export type Pot = { id: PotId; name: string; has: number }; // has: balance, or Ready to budget
export const READY_NAME = 'Ready to budget';
export function pots(plan: PlanMonth): Pot[];               // READY first, then categories in plan order
export function pot(plan: PlanMonth, id: PotId): Pot | null;

// a gain is the mirror of a bite
export type Gain = { kept: number; gained: number; before: string; after: string; tone: 'funded' | 'over' };
export function gain(p: Pot, amount: number): Gain;

// moveDraft.ts
export type MoveDraft = { from: PotId | null; to: PotId | null; entry: Entry; prefilled: boolean };
export function withKey(d: MoveDraft, key: Key): MoveDraft; // the keypad on a move draft
export function newMove(start: { from?: PotId; to?: PotId; amount?: number }): MoveDraft;
export function withFrom(d: MoveDraft, id: PotId): MoveDraft;
export function withTo(d: MoveDraft, id: PotId): MoveDraft;
export function swap(d: MoveDraft): MoveDraft;
export type MoveView = {
  title: string;                       // "Move money" | "Assign" | "Fix overbudgeting"
  from: { name: string | null; bite: Bite | null };
  to: { name: string | null; gain: Gain | null };
  canSave: boolean;
  over: boolean;
  button: string;                      // "Move" | "Assign" | "Move $50.00" … see table
};
export function moveView(d: MoveDraft, plan: PlanMonth): MoveView;
export function fromChoices(d: MoveDraft, plan: PlanMonth): PotRow[];
export function toChoices(d: MoveDraft, plan: PlanMonth): PotRow[];
export function toMove(d: MoveDraft, month: string): { month: string; from: PotId; to: PotId; amount: number };

// cover.ts
export type Source = { id: PotId; name: string; has: number; bite: Bite; covers: number; enough: boolean };
export type CoverView = {
  title: string;        // "Cover Dining out"
  deficit: number;      // positive cents
  target: Gain;         // the overspent category filling to zero (or part way)
  sources: Source[];    // READY first when it has money, then categories in plan order with money
  selected: PotId | null;
  button: string;       // "Cover $28.10" | "Cover $13.50 of $28.10" | "Nothing to cover with"
  canSave: boolean;
};
export function coverView(plan: PlanMonth, categoryId: string, selected: PotId | null): CoverView | null;
export function defaultSource(plan: PlanMonth, categoryId: string): PotId | null;

// categoryDetail.ts
export type DetailRow = { label: string; amount: number; tone: 'plain' | 'mute' | 'over' };
export function detailRows(category: PlanCategory): DetailRow[];
export function activityTotal(rows: ActivityRow[]): number;
export function activityDateLabel(date: string, today: Date): string;

// planActions.ts
export type PlanAction = { label: string; href: string } | null;
export function canChange(month: string, today: Date): boolean;        // false for a past month
export function heroAction(plan: PlanMonth, today: Date): PlanAction;
export function noticeAction(plan: PlanMonth, today: Date): PlanAction;
export function categoryAction(plan: PlanMonth, categoryId: string, today: Date): PlanAction;
```

`PotRow` is `{ id: PotId; name: string; detail?: { text: string; tone: 'over' | 'mute' }; disabled?: boolean }`, the shape quick add's `PickerList` already takes for a category row plus `disabled`.

**Behaviour: `pots`, `gain`**

- `pots`: `{ id: READY, name: 'Ready to budget', has: plan.toBudget }` first, then every category of every group in order, `has` its balance. (The plan month already leaves hidden and income categories out.)
- `gain(p, amount)`: `before` is `formatMoney(p.has)`; `after` is `formatMoney(p.has + amount) + ' after'`. For the bar: when `p.has < 0` the bar's full width is the deficit (`-p.has`) and what arrives fills it in: `kept 0`, `gained = min(1, amount / -p.has)`, never below 0.04 when `amount > 0`; the rest of the bar is the empty track, so covering exactly to zero is `gained 1` and a partial cover part-fills the bar. When `p.has === 0`, `kept 0, gained 1`; otherwise `kept = p.has / (p.has + amount)`, `gained = 1 − kept`, with `gained` never below 0.04 when `amount > 0` (take it from `kept`). Amount 0: `kept 1 (0 if has ≤ 0), gained 0`. `kept + gained` is 1 when the pot started at or above zero and may be less below it. `tone` is `over` when `p.has + amount < 0` (the pot is still below zero after), otherwise `funded`; the pot card and the cover target draw the "after" in the over or funded colour by it. (Corrected in Task 3: the first rule drew an empty bar for any pot still below zero after, so a partial cover showed nothing.)

**Behaviour: the move sheet**

| Situation | Result |
|---|---|
| `newMove({ from: X })` | from X, to null, empty entry |
| `newMove({ to: READY, amount: 1594 })` | to READY, from null, entry showing 15.94 |
| `withKey(d, key)` on a pre-filled amount | the first digit or `.` replaces it (as if the entry were empty); delete clears it; a key the empty entry refuses (`0`, `00`) changes nothing; after the first key the entry behaves as typed. The screen calls `withKey`, not `press` (corrected in Task 3: the pre-fill used to refuse every digit until deleted) |
| `withFrom(d, id)` when `id === d.to` | from becomes id, to becomes null |
| `withTo(d, id)` when `id === d.from` | to becomes id, from becomes null |
| `swap` | from and to change places; the entry is kept |
| `title` | `Assign` when from is READY; `Fix overbudgeting` when to is READY and `plan.toBudget < 0`; otherwise `Move money` |
| `from.bite` | `bite({ name, balance: has }, amount)` for the from pot; null when from is null |
| `to.gain` | `gain(pot, amount)`; null when to is null |
| `over` | from is set and amount > `max(from.has, 0)` |
| `canSave` | from and to are set and different, amount > 0, and not `over` |
| `button` | `Assign` when from is READY, otherwise `Move` |
| `fromChoices` | every pot except the current `to`; detail is its `has` (`over` tone when it is an overspent category by `isOverspent`, or READY below zero); `disabled` when `has <= 0` |
| `toChoices` | every pot except the current `from`; same detail; none disabled |
| `toMove` | throws when `canSave` is false |

**Behaviour: the cover sheet**

| Situation | Result |
|---|---|
| The category is not in the plan, or is not overspent by `isOverspent` | `coverView` returns null |
| `deficit` | `-balance` |
| `sources` | READY if `toBudget > 0`, then each other category with `balance > 0`, in plan order. For each: `covers = min(deficit, has)`, `enough = has >= deficit`, `bite = bite({ name, balance: has }, covers)` |
| `defaultSource` | READY if it is enough; else the first source that is enough; else the source with the largest `has` (first wins a tie); null with no sources |
| `selected` not among the sources | treated as `defaultSource` |
| `target` | `gain({ id, name, has: balance }, covers of the selected source)`; with nothing selected, amount 0 |
| `button` | `Cover {deficit}` when the selected source is enough; `Cover {covers} of {deficit}` when it is not; `Nothing to cover with` and `canSave: false` with no sources |
| `title` | `Cover {category name}` |

**Behaviour: the category screen**

| Function | Rule |
|---|---|
| `detailRows` | In this order: `Budgeted` (the budgeted amount, plain); `Spent` (`spent`, shown as it is, negative; plain); `Carried in` (`balance − budgeted − spent`; left out when it is 0; `over` tone when negative, else plain); `Left` (the balance; `over` tone when `isOverspent`, `mute` when negative but rolling over, else plain) |
| `activityTotal` | The sum of the rows' amounts |
| `activityDateLabel` | `Today`, `Yesterday`, otherwise `Tue 17 Nov`; reuse quick add's `dateLabel` if it already does exactly this |

**Behaviour: the buttons**

| Function | Rule |
|---|---|
| `canChange` | True when the month is the current month or later |
| `heroAction` | Null when `!canChange`. `{ label: 'Assign', href: '/move?from=to-budget' }` when `toBudget > 0`. `{ label: 'Fix', href: '/move?to=to-budget&amount={-toBudget}' }` when `toBudget < 0`. Null at exactly 0 |
| `noticeAction` | Null when `!canChange` or nothing is overspent by `isOverspent`. Otherwise `{ label: 'Cover', href: '/cover?category={id}' }` for the first overspent category in plan order |
| `categoryAction` | Null when `!canChange` or the category is not in the plan. `Cover` → `/cover?category={id}` when it is overspent by `isOverspent`. Otherwise `Move money` → `/move?from={id}` when its balance is above zero, and `/move?to={id}` when it is zero or below |

**Decision 11, in `categoryView.ts`:** in a future month, a category with `budgeted === 0` and `balance > 0` says `{formatMoney(balance)} carried in` (status `ok`); the plan-screen plan's rule table gets a row for it.

- [ ] **Step 1: Write the failing tests**, one per row of each table, plus: `gain` at the 4% floor and across zero; `defaultSource` for each of its three branches and the tie; a cover where READY has money but not enough and a category has enough (the category is the default; READY is still listed first); `coverView` for a rollover category (null); `moveView` when from is READY and the amount is more than Ready to budget (over, cannot save); `heroAction` hrefs exactly; `categoryAction` in a past month (null).
- [ ] **Step 2: Run, see them fail; implement; see them pass.**
- [ ] **Step 3: `npm test`, `npm run typecheck`; commit.**

```bash
git add -A
git commit -m "Moving money: pots, the move and cover sheets and the category screen, as pure functions"
```

---

### Task 3: The pieces

**Files:**
- Create in `app/src/features/move/`: `PotCard.tsx`, `SourceRow.tsx`, `DetailRows.tsx`, `ActivityList.tsx`, each with a `.test.tsx`
- Modify: `app/src/features/quickAdd/BiteBar.tsx` (a gain), `PickerList.tsx` (a disabled row), `app/src/features/plan/HeroCard.tsx`, `Notice.tsx`, `CategoryTile.tsx` (a button, a press), with their tests; `app/src/theme/tokens.ts`

**Interfaces (props are the contract for Task 4):**

```ts
PotCard:      { label: 'From' | 'To'; name: string | null; bar: Bite | Gain | null; onPress(): void }
SourceRow:    { source: Source; selected: boolean; onPress(): void }
DetailRows:   { rows: DetailRow[] }
ActivityList: { rows: ActivityRow[]; today: Date; empty: string }
BiteBar:      gains { gained?: number }            // a gain draws its hatched part in the funded colour
PickerList:   rows may carry { disabled?: boolean }
HeroCard:     gains { action?: { label: string; onPress(): void } }
Notice:       gains { action?: { label: string; onPress(): void } }
CategoryTile: gains { onPress?(): void }
```

As built (Task 3): `BiteBar` takes either a bite (`kept`, `taken`, `state`) or a gain (`kept`, `gained`); a gain that does not fill the bar leaves the rest as the empty track. `PotCard` also takes `density?` as quick add's card does. `Keypad` leaves out the `+/−` key (its cell stays empty) with `sign={false}`; shown (the default) it requires `onToggleSign`, and the types refuse either mismatch. `saveLabel?: string` puts a word on Save instead of the tick. Accessibility labels come from the logic layer: `potCardLabel` in `pots.ts`, `sourceLabel` in `cover.ts`. The `action` on `HeroCard` and `Notice` is `CardAction` from `features/plan/ActionPill.tsx`. `Source` carries `has`.

**What each shows and does**

| Component | Requirement |
|---|---|
| `PotCard` | As the design's FROM and TO cards: a small caps label, the pot's name, `Change ›` at the right, the bar, and `before` at the left with `after` at the right (coral when a bite is over, mint for a gain or a bite that fits). With no pot: `Choose ›` and no bar. A warning line from a `Bite` sits under the card, as quick add's card does. One accessibility label reading the whole card. Reuse quick add's `CategoryCard` internals where that is cleaner than a second copy; do not change how quick add looks |
| `SourceRow` | As the design's cover sources: the pot's name, its bar with the bite, `before` and `after`, and a round check mark at the right, filled when selected; the selected row has the mint edge. A source that is not enough says `not enough for all of it` under its amounts and is still pressable. `accessibilityRole="radio"` with its checked state |
| `DetailRows` | A glass card of label and amount rows; amounts drawn with `Money` at the size of body text, coloured by tone; the last row (`Left`) is separated by a hairline and set a size larger |
| `ActivityList` | One row per transaction: the payee (or `No payee`), under it the date label and the account in mute text, and the amount at the right with `Money` (money in is mint with a `+`). The `empty` text when there are none. Not virtualised, at any length: it sits inside the category screen's single scroll view, and one category's transactions in one month are few. Rows are keyed by transaction id. What each row says (payee text, the date-and-account line, the amount, its tone, the accessibility label) comes from `activityLines` in `categoryDetail.ts`; the component only maps tone to colour |
| `BiteBar` with a gain | Solid `kept`, then hatching in the funded colour for `gained`; an empty bar when both are 0 |
| `PickerList` disabled row | Dimmed, not pressable, `accessibilityState.disabled` |
| `HeroCard` action | A small pill button at the top right of the card, as the design's `Assign`. Absent with no action |
| `Notice` action | A small button at the right of the notice. Absent with no action |
| `CategoryTile` press | The whole tile is pressable with press feedback when `onPress` is given, `accessibilityRole="button"`, and its existing label gains a hint (`Opens {name}`) |

- [ ] **Step 1: Write the failing tests:** each component shows what its props say and calls its callbacks; `PotCard`'s four states (no pot, a bite that fits, a bite that is over with the warning, a gain); `SourceRow` selected and not, enough and not; `BiteBar`'s gain parts follow `kept` and `gained`; the disabled picker row does not call `onPick`; `HeroCard`, `Notice` and `CategoryTile` are unchanged in what they render without the new props (the existing tests still pass untouched).
- [ ] **Step 2: Run, see them fail; implement; see them pass.**
- [ ] **Step 3: `npm test`, `npm run typecheck`, `npx expo export --platform ios --output-dir /tmp/accrual-export-check` (delete the output afterwards); commit.**

```bash
git add -A
git commit -m "Moving money: pot card, source row, detail rows, activity list, and buttons on the Plan"
```

---

### Task 4: The screens

**Files:**
- Create: `app/src/app/category/[id].tsx`, `app/src/app/move.tsx`, `app/src/app/cover.tsx`, hooks in `app/src/features/move/` as needed, `app/src/app-tests/category.test.tsx`, `move.test.tsx`, `cover.test.tsx`
- Modify: `app/src/app/_layout.tsx`, `app/src/app/index.tsx`, `app/src/features/plan/quickAddSignal.ts` (rename it if its name no longer fits what it carries), `app/src/app-tests/plan.test.tsx`

**Behaviour**

| Situation | What happens |
|---|---|
| A tile is pressed | `/category/{id}` opens (a normal push, not a modal) for the month the Plan is showing |
| The category screen | A back control and the category's name; the month; the balance large with its bar and note (as the tile says it); `DetailRows`; the action button from `categoryAction` when there is one; then `ActivityList` for that month under the heading `This month` (or the month's name when it is not the current month), with `Nothing spent here yet.` when empty. It scrolls as one page. A read failure shows `Could not read this category.` with `Try again` |
| The category is not in this month's plan (hidden, deleted, or a bad link) | `This category is not in this budget.` with a way back |
| `/move` opens | With `from`, `to` and `amount` from its link, validated against the plan (an unknown pot id is ignored). Header: `Cancel` and the title from `moveView`. The amount (`AmountDisplay`, no sign), the From card, a swap control between the cards, the To card, and the keypad (no `+/−` key: pass what `Keypad` needs to hide it, with a test). The compact layout applies on short screens as on quick add |
| A pot card is pressed | A picker of `fromChoices` or `toChoices` |
| The Save key | Enabled by `moveView.canSave`, coral when `over`; calls `engine.moveMoney(toMove(...))`; then the sheet closes and the Plan and any category screen under it re-read; the sync follows in the background |
| `/cover?category={id}` opens | Title from `coverView`; the target's card with its gain; `Take {deficit} from` and the sources; the preselected source; a full-width button with `coverView.button` at the bottom above the safe-area inset. No keypad |
| A source is pressed | It becomes the selected one; the target's gain and the button follow |
| The cover button | Calls `engine.coverOverspending({ month, category, from: selected, amount: covers })`; then as for a move |
| A write rejects | The sheet stays, with `Could not do that. Try again.` Nothing typed or chosen is lost |
| A sheet is opened for a past month, with no engine, with no Plan mounted, or (`/cover`) for a category that is not overspent | It redirects back (to `/`) without showing a form |
| A save is in flight | Cancel is disabled; a second press does nothing; if the sheet is dismissed by gesture first, the Plan is still told and nothing navigates (as quick add) |
| The Plan | The top card shows the button from `heroAction` and the notice the one from `noticeAction`; each navigates to its `href`. Tiles are pressable. Nothing is shown for a past month |

The month a sheet acts on is the month the Plan is showing when the sheet opens, passed the way "today" already reaches quick add.

- [ ] **Step 1: Write the failing tests** with the fake engine. `plan.test.tsx`: pressing a tile navigates to its category; the top card's `Assign` navigates to `/move?from=to-budget`; the notice's `Cover` navigates to the first overspent category's cover link; none of the three is offered in a past month. `category.test.tsx`: the rows, the note, the action for an overspent and a healthy category, the transactions and the empty text, the not-in-budget message. `move.test.tsx`: opening from a link sets the pots and amount; swap; picking the same pot for both clears the other; typing more than the From pot has shows the warning and Save does nothing; a valid move calls `moveMoney` with the whole expected object and goes back; the Plan's fake month shows the new balances after; a rejected write keeps the form. `cover.test.tsx`: the default source; choosing another updates the button; a partial cover's button text; the call's whole object; redirect when the category is not overspent.
- [ ] **Step 2: Run, see them fail; implement; see them pass.**
- [ ] **Step 3: `npm test`, `npm run typecheck`, the export check; commit.**

```bash
git add -A
git commit -m "Moving money: the category screen, the move and cover sheets, and the way in from the Plan"
```

---

### Task 5: On devices, and the record

**Files:**
- Modify: `app/README.md`, `README.md`, `docs/plan.md`, `docs/superpowers/plans/2026-11-19-phase-1-roadmap.md`, `design/README.md`

- [ ] **Step 1: Run on the Android emulator** (`emulator-5560` only), test server on 5007, developer check off (move `app/.env.local` aside; put it back). Open "Spike Small" and do each of these, with a screenshot you look at each time:

1. The top card shows `Assign`; the notice shows `Cover`; neither is there in a past month.
2. Tapping a tile opens its screen: the rows add up (`Budgeted + Spent + Carried in = Left`, by hand from the screenshot), the transactions' total equals `Spent`, and the reference client agrees with the figures.
3. `Assign`: type an amount, choose a category; the From bar shows the bite from Ready to budget and the To bar the gain; Save; the Plan's Ready to budget fell and the category rose by that amount; the reference client agrees after the sync.
4. Typing more than Ready to budget has turns the bar coral, shows the line, and Save does nothing.
5. `Move money` from a category screen to another category; swap works; both tiles change by the amount.
6. `Cover` from the notice: the preselected source is the one the rule says (work it out by hand); choose another and the button and bars follow; cover; the category is at zero and no longer in the notice, which now names the next one or has gone.
7. A partial cover: arrange a deficit larger than any pot (the reference client's `edit` can set budgeted amounts), and the button reads `Cover X of Y`; after it the category is still over by the difference.
8. `Fix` when overbudgeted: assign more than is there via the reference client so Ready to budget goes negative; the top card says `Fix`; the sheet opens with the amount filled; taking it from a category brings Ready to budget to zero.
9. With the server stopped, a move still works and the Plan shows `Offline`; after the server is back and a pull, the reference client sees it.
10. Light and dark, three-button navigation, the largest text size, and a 360×640 screen: nothing cut off, the cover button clear of the navigation bar.
11. The category screen for a past month has no button; a deep link to `/move` in a past month goes back to the Plan.

Look at each screen with a designer's eye against the design and list everything that looks wrong. Fix what is contained (layout, tokens, an inset) with a test where one can express it; record the rest.

- [ ] **Step 2: Run on the iOS simulator.** Build with Xcode 26.6, install and launch. Nothing on this machine can tap the simulator, so this verifies only that the app builds and its first screen renders. Report it as exactly that.

- [ ] **Step 3: Write it down.**

- `app/README.md`: the layout block; a "What works" table for these eleven checks by platform.
- `README.md`: Status.
- `docs/plan.md`: tick or annotate the category detail line and the overspending banner line, with the platforms verified; the activity list is read-only.
- The roadmap: mark plan 4 as built; move the three plan-4 rows out of "Still open" (two settled as decision 11 says; the last-month difference stays open, reassigned to plan 6, unless you found its cause); add anything new.
- `design/README.md`: under round 3, how the built sheets differ on purpose (assigning is a move from Ready to budget, with no suggested split; one sheet for move and assign; a source that is not enough can still be chosen) and why.

- [ ] **Step 4: Commit.**

```bash
git add -A
git commit -m "Moving money: device run and docs"
```

---

## Done when

- `npm test`, `npm run typecheck` and `npm run engine:verify` pass in `app/`, and CI is green.
- All eleven checks in Task 5 pass on the Android emulator, or each one that does not is reported with its reason.
- Nothing in `src/features/move/*.tsx`, `src/app/category/[id].tsx`, `src/app/move.tsx` or `src/app/cover.tsx` does arithmetic on amounts, builds a status string or decides whether a button is live.
- No write path computes a budgeted amount in the app.
- No new entry in `app/package.json`.

## Not in this plan

Setting a category's budgeted amount directly, goals and templates, holding money for next month, rollover switches, covering from quick add's sheet, editing or deleting transactions and opening one from the activity list (plan 5), changing a past month, the suggested split on Assign, haptics and the motion spec (plan 6).
