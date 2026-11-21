# Accrual app

The Expo app. It runs Actual's engine on the phone and syncs with the user's own Actual server.

**Fake data only.** Everything here runs against the throwaway server in `tools/test-server`
on port 5007. Never point it at a real server or a real budget.

## Layout

After the [foundation plan](../docs/superpowers/plans/2026-11-19-foundation.md), plan 2 (the
Plan screen), plan 3 ([quick add](../docs/superpowers/plans/2026-11-19-quick-add.md)) and plan 4
([moving money](../docs/superpowers/plans/2026-11-21-moving-money.md)), with what each file is
for:

```
app/                               (was spike/app)
  app.json                         Expo config: name Accrual, id software.longarm.accrual
  package.json                     scripts: test, typecheck, engine:build, engine:verify, sqlfn:*
  tsconfig.json                    typecheck program for app code (no Jest or Node globals)
  tsconfig.test.json               typecheck program for tests (Jest and Node types)
  jest.setup.ts                    Reanimated and SecureStore mocks for Jest
  engine/                          unchanged from the spike, except:
    entry.ts                       + getSessionToken(), onBudgetLoaded()
    shims/async-storage.ts         header comment only: what is kept in memory, what on disk
  harness/                         unchanged, except verify.ts (new checks: plan month, month
                                   bounds, opening offline; quick-add lists, adding a transaction
                                   with a new or existing payee, the sync time bound; a category's
                                   transactions in this month and the last, moving, covering and
                                   assigning against the reference client, and the writes'
                                   refusals) and paths updated for the move
  modules/accrual-sqlite-functions/   unchanged
  src/
    app/                           Expo Router routes (screens only, no logic)
      _layout.tsx                  fonts, splash screen, session provider, Stack (quick add, move
                                   and cover as modals, a category pushed), Android navigation
                                   bar style following the theme
      index.tsx                    the Plan: month switcher, top card, notice, groups of tiles,
                                   pull to refresh, Offline chip, the + button; re-reads today
                                   and syncs on returning to the foreground; redirects when not
                                   ready, or to dev-check when the scripted run is on
      add.tsx                      quick add: amount, payee, category with the bite, account,
                                   date, keypad; the keypad gives way to the keyboard for the payee
      category/[id].tsx            one category in the Plan's month: what it has, budgeted / spent /
                                   carried in / left, its transactions (read-only), and Move money
                                   or Cover (no button in a past month)
      move.tsx                     the move sheet (also Assign and Fix): amount, From and To pots
                                   with the bite and the gain, swap, keypad with Move or Assign
      cover.tsx                    the cover sheet: the overspent category filling in, the pots
                                   that could pay with what each would take, one chosen, Cover
      connect.tsx                  server address, password, budget list
      opening.tsx                  first-download and reopen progress; opens the copy on the
                                   phone when the server cannot be reached
      dev-check.tsx                developer route for the scripted check (dev/autorun.ts);
                                   the one place a literal colour is allowed
    app-tests/                     screen tests: Expo Router bundles every file under src/app
                                   as a route, so tests cannot live there (a test checks this)
    engine/
      types.ts                     Engine, RemoteBudget, PlanMonth, MonthBounds, OpenStage,
                                   QuickAddLists, NewTransaction, ActivityRow, the move and cover
                                   requests, EngineError (incl. 'stale' and 'invalid-move')
      adapter.ts                   createEngine(): the only file that touches the bundle;
                                   a sync gives up after 15 seconds; moves and covers call
                                   Actual's own budget actions after checking the month as it is
      writeRules.ts                what a write must satisfy (a YYYY-MM month in the budget, a
                                   positive whole amount, a real pot, enough in it)
      recentUse.ts                 recent payees, each one's last category, the newest
                                   transaction's account (pure; the adapter supplies the rows)
    session/
      serverUrl.ts                 normalizeServerUrl()
      storage.ts                   load/save/clear the saved session in SecureStore
      SessionProvider.tsx          context: status, engine, connect/choose/open/signOut
      fakeEngine.ts                an in-memory Engine for tests
    features/
      connect/errors.ts            engine error code -> sentence for a person
      opening/stageCopy.ts         OpenStage -> the line shown on the progress screen
      plan/                        the Plan screen's parts
        categoryView.ts            what a tile says: status, note ("$17 a day for 12 days"), fill
        planSummary.ts             the top card, the overspent notice, a group's total
        tile.ts                    status -> colour, a tile's screen-reader label
        usePlanMonth.ts            loads a month, refresh, offline and month bounds; one sync at
                                   a time, and a save made during one is owed another
        foreground.ts              what returning to the app changes: a new day, a new month
        useReturnToForeground.ts   calls back when the app comes back from the background
        planSignal.ts              what the Plan shares with the sheets and the category screen:
                                   today, the month shown with its read, and "a save happened"
        planActions.ts             which button the top card, the notice and a category screen
                                   get (Assign, Fix, Cover, Move money), and the links they open
        ActionPill.tsx             the small Assign / Fix / Cover pill
        AddButton.tsx              the round + above the navigation bar
        CategoryTile.tsx           one category: two to a row, or a full-width row at large text
        HeroCard.tsx               Ready to budget, the spent / set aside / free bar, Assign or Fix
        Notice.tsx                 "3 categories are $551.52 over", with Cover
        GroupHeader.tsx            group name and what its categories have left
        MonthSwitcher.tsx          previous and next month, stopping at the budget's ends
        AccountMenu.tsx            the budget's name and Sign out
      quickAdd/                    the quick-add sheet's parts
        amountEntry.ts             keypad keys -> the amount, as digit strings, then cents; what
                                   to draw for it as typed ("−$18.4")
        sheetLayout.ts             regular or compact sheet from the window height and text size;
                                   whether the form runs on below its fade
        bite.ts                    what an expense does to a category: kept, taken, after, warning
        draft.ts                   the draft transaction: payee, suggested category, account, date
        payees.ts                  payee matches for typed text; the exact match
        useQuickAdd.ts             reads the lists and the month, holds the draft, saves
        AmountDisplay.tsx          the amount as typed at the hero size, one height, one line
        Keypad.tsx                 1-9, ".", 0, 00, delete (held: repeats), +/−, the tall Save
        PayeeField.tsx             the payee field and up to six matches
        CategoryCard.tsx           the category, Suggested or Change, the bite bar, what is left
        BiteBar.tsx                the bar: solid what stays, hatched what this takes
        DateStepper.tsx            ‹ Today ›, a day at a time, never past today
        PickerList.tsx             the category and account lists (and the pots, for moving)
      move/                        the category screen and the move and cover sheets
        pots.ts                    what can be a pot (categories and Ready to budget, never hidden
                                   or income), what each has, the choices for From and To
        moveDraft.ts               the move sheet's state: pots, amount, bite and gain, the button
        cover.ts                   the cover sheet: the sources, what each would take, which one
                                   is chosen first, "Cover $X" or "Cover $X of $Y"
        categoryDetail.ts          the category screen's rows and headings
        writeFailure.ts            a refused write -> the sentence shown
        useMoveSheet.ts            reads the month, holds the draft, moves
        useCoverSheet.ts           reads the month, holds the choice, covers
        useSheetWrite.ts           the write, the re-read when it was 'stale', the sync after
        useCategoryActivity.ts     a category's transactions in a month, read again after a save
        PotCard.tsx                From or To: the pot, Change, the bar, now and after
        SourceRow.tsx              one pot that could pay a cover, with its ring
        DetailRows.tsx             Budgeted, Spent, Carried in, Left
        ActivityList.tsx           the month's transactions, newest first
    theme/
      tokens.ts                    Aurora colours (dark, light), radii, spacing, type
      contrast.ts                  WCAG contrast ratio
      useTheme.ts                  picks dark or light from the system
    ui/
      AuroraBackground.tsx         the gradient page background
      Glass.tsx                    frosted tile on iOS, solid tile on Android
      Text.tsx                     Body, Label, Display
      Money.tsx                    "$207" with a smaller ".62"
      Button.tsx                   primary (gradient) and quiet (glass); grows for a long label
      SheetHeader.tsx              a sheet's Cancel and title
      BackToPlan.tsx               leaves a screen with nothing to show for the Plan under it
      Centre.tsx                   a centred message and its button
      Chip.tsx                     a small status pill ("Offline")
      ProgressBar.tsx              a tile's bar
      Spinner.tsx                  a ring that turns on the native thread
      BottomFade.tsx               a fade behind Android's navigation bar
      Chevron.tsx, Tick.tsx        the ›, ‹ and ✓ marks, drawn with Views
    lib/
      money.ts                     splitMoney(), formatMoney(), formatWholeMoney()
      month.ts                     currentMonth(), addMonths(), monthLabel(), daysLeftInMonth()
      clock.ts                     the phone's clock, the one place the time is read
    dev/
      autorun.ts, digest.ts        the spike's scripted on-device run, kept for regression
tools/test-server/                 (was spike/server)
```

## Run the checks (no phone needed)

```sh
cd tools/test-server && npm install
npm run server          # 127.0.0.1:5007, data in tools/test-server/data (gitignored); leave running
npm run seed            # in a second terminal: fake "Spike Small" and "Spike Large" budgets

cd ../../app && npm install
npm run sqlfn:build     # compiles the SQLite extension for this machine (needs a C compiler)
npm run sqlfn:test      # checks it against loot-core's JavaScript functions
npm run engine:build    # bundles loot-core into engine/dist
npm run engine:verify   # compares the engine with @actual-app/api, tests sync both ways
npm run engine:verify -- cold   # cold start on the already-downloaded large budget
```

The first `npm run server` or `npm run seed` writes a random test password to
`tools/test-server/.env` (gitignored).

## Run on a device

Needs a dev build, not Expo Go (expo-sqlite, expo-file-system, expo-crypto and the local
`accrual-sqlite-functions` module are native).

```sh
cd app
npm run engine:build
npx expo run:ios        # or: npx expo run:android
```

Building needs:

- **iOS:** Xcode 26.x. Xcode 27.0 fails in expo-dev-launcher 58.0.21 (`cannot find 'axisBehavior'
  in scope`). If 27.0 is your default, point at an older one for the build:
  `DEVELOPER_DIR=/Applications/Xcode-26.6.0.app/Contents/Developer npx expo run:ios`.
- **Android:** JDK 17 in `JAVA_HOME`, the SDK in `ANDROID_HOME`, and a running emulator.

The test server's address from the app:

- iOS simulator: `http://127.0.0.1:5007`
- Android emulator: `http://10.0.2.2:5007`

When `app/.env.local` sets `EXPO_PUBLIC_SPIKE_AUTORUN=1`, Home hands over to the scripted run
below instead of the app. To use the app itself, move that file aside and restart Metro with
`--clear` so the change is picked up.

## What works

### Moving money (plan 4)

The eleven checks from plan 4, run by hand on 2026-11-21 on the Android emulator (1080 × 2400,
gesture navigation and the light theme unless the check says otherwise) against the test server,
with the fake budget "Spike Small", in a debug build. The emulator's date was Saturday 21 November
2026. Server-side figures were read back with `@actual-app/api`, as
`tools/test-server/scripts/reference.mjs` does; states were arranged with it too (well-formed
months and amounts only).

| # | Check | iOS simulator | Android emulator |
|---|---|---|---|
| 1 | The top card shows `Assign` and the notice `Cover`; neither in a past month | Not run | Passed |
| 2 | A tile opens its category: Budgeted + Spent + Carried in = Left, the transactions add up to Spent, and the server agrees | Not run | Passed |
| 3 | `Assign`: amount, category, the bite and the gain; Ready to budget falls and the category rises by the amount, on the phone and the server | Not run | Passed |
| 4 | More than Ready to budget has: coral bar, the line, and the button does nothing | Not run | Passed |
| 5 | `Move money` from a category screen to another category; swap; both tiles change by the amount | Not run | Passed |
| 6 | `Cover` from the notice: the preselected source follows the rule; choosing another moves the button and bars; after it the category is at zero and the notice names the next | Not run | Passed |
| 7 | A deficit larger than any pot: the button reads `Cover X of Y`, and the category stays over by the difference | Not run | Passed |
| 8 | Overbudgeted: `Fix` opens the sheet with the shortfall filled in; taking it from a category brings Ready to budget to zero | Not run | Passed |
| 9 | With the server stopped a move still works and the Plan says Offline; with it back and a pull, the server has it | Not run | Passed |
| 10 | Light and dark, three-button navigation, the largest text size, a 360 × 640 screen: nothing cut off, the cover button clear of the navigation bar | Not run | Passed, after fixes (below); see what was left |
| 11 | A past month's category screen has no button; a link to `/move` in a past month goes back to the Plan | Not run | Passed, after fixes (below) |

**iOS:** built with Xcode 26.6, installed on the simulator and launched; one screenshot of its first
screen (Connect). Nothing on the build machine can tap the simulator, so none of the eleven checks
was run there.

What was entered and seen on Android (fake figures throughout):

- **1:** November: `Assign` on the top card ($7,106.86), and "2 categories are $546.61 over" with
  `Cover`. October: no pill and no `Cover`.
- **2:** Water: $92.94 − $230.39 + $166.40 = $28.95, and its four transactions add up to $230.39;
  Pets: $73.90 − $385.25 + $361.19 = $49.84. The reference client listed the same transactions in
  the same order.
- **3:** $25.00 to Pets: "$7,081.86 after" on From, "$74.84 after" on To; afterwards Ready to
  budget $7,081.86 and Pets $74.84, and the server the same.
- **4:** $8,000 against $7,081.86: "−$918.14 after" and "That is $918.14 more than Ready to budget
  has".
- **5:** $30.50 from Coffee ($204.81) to Water ($28.95); swapped, Water could not pay it (coral,
  "$1.55 more than Water has"); swapped back and moved: Coffee $174.31, Water $59.45. Actual wrote
  its own note on the month ("Reassigned 30.50 from Coffee → Water").
- **6:** Electricity −$298.80 with Ready to budget at $7,081.86, so Ready to budget was
  preselected. Choosing Water ($59.45) changed the button to "Cover $59.45 of $298.80"; Phone
  covered it all. Electricity $0.00, Phone $908.23, and the notice said "Subscriptions is $247.81
  over".
- **7:** a $9,000 expense added to Subscriptions on the server: "Cover $7,081.86 of $9,247.81",
  Ready to budget preselected as the pot with the most. After it Subscriptions was $2,165.95 over
  and Ready to budget $0.00.
- **8:** $500 more budgeted to Water on the server: "Overbudgeted −$500.00" with `Fix`; the sheet
  opened as "Fix overbudgeting" with $500.00 and To Ready to budget; from Water, "Every dollar has
  a job".
- **9:** $100 from Insurance to Ready to budget with the server stopped: the Plan showed $100.00
  and Offline; after restarting it and pulling, the server had it.
- **10:** dark with three-button navigation; font scale 2.0 (Android 16's largest); 360 × 640
  points at 2.0 and at 1.0; light at 2.0. The emulator was put back to 1080 × 2400, 420 dpi, light,
  gesture navigation and font scale 1.0 afterwards.
- **11:** Water in October: Budgeted, Spent, Left and October's three transactions, no button.
  With the Plan on October, `adb shell am start -a android.intent.action.VIEW -d "accrual://move"`
  left the same Plan on October, and Back then left the app. A link to `/cover` for a category
  that is not overspent did the same.
- **A move after the budget changed elsewhere:** with a move sheet open, the from pot's budgeted
  amount was lowered with the reference client, the app was sent to the background and brought
  back (which syncs), and Move pressed: "That changed while you were here. Check the numbers and
  try again." with the new figures; a smaller amount then went through. Without a sync in between
  the app cannot know: the move went through on the figures it had, and, being the later change,
  replaced the other one, as Actual's own apps do.

Fixed during the run, each with a test:

- **A past month's category screen listed every later month's transactions too.** The query gave
  the date both bounds in one condition, and Actual's query language keeps only one of them.
  `engine:verify` now checks last month's lists against the reference client.
- **Leaving a sheet with nothing to show stacked a second Plan** (check 11): it replaced itself
  with a new Plan, in the current month, over the one already there. It now goes back down to
  that Plan, or, opened by a link with nothing under it, puts the Plan in its place.
- **A refused move's or cover's message was out of sight**, at the end of the form under the
  keypad, or below the list of sources. It now sits just above the keypad or the button.
- **At the largest text size a long label was cut off inside the cover button**; buttons now grow
  for it. **A long sheet title squeezed Cancel into three lines**; Cancel keeps its width and the
  title gets smaller to fit.
- **The top card's amount sat lower when it had a pill** (about 13 points at normal text), so it
  jumped between months; the label's line is now the pill's height either way.

Seen and not changed:

- On a 360 × 640 screen the move sheet shows only the From card above the keypad (To needs a
  scroll), as quick add's form does at that size; at the largest text the sheet shows about one
  card at a time.
- At the largest text size on a 360 × 640 screen the `+` sits over the notice's `Cover` when the
  Plan is at the top: a tap there opened quick add. The month switcher also runs past the right
  edge at that size.
- Each change of the system text size (Android) restarts the screen and, in this debug build,
  logs "Looks like you have configured linking in multiple places" once.
- With the largest text, a long sheet title ("Cover Subscriptions") is drawn smaller than Cancel.
- In a past month the notice has no button, so it is shorter and the tiles start higher than in
  the current month.
- The swap control is a small glass circle with two chevrons; in the dark theme it is faint.
- Debug build only: expo-dev-menu's "Tools" gear floats at the top right, over the Account button
  and, at the largest text size, over the month switcher's next arrow.

### Quick add (plan 3)

The eleven checks from plan 3, run by hand on 2026-11-19 on the Android emulator (a Pixel-sized
1080 × 2400 screen, Android's gesture navigation unless the check says otherwise) against the test
server, with the fake budget "Spike Small". A debug build. The emulator's date was Thursday 19
November 2026. Each server-side result was read back with `@actual-app/api`, the same library
`tools/test-server/scripts/reference.mjs` uses.

| # | Check | iOS simulator | Android emulator |
|---|---|---|---|
| 1 | The `+` sits clear of the navigation bar, in gesture and three-button navigation, light and dark | Not run | Passed |
| 2 | The sheet opens with the keypad; `18.40` shows `−$18.40`; delete and `00` follow the table | Not run | Passed |
| 3 | Typing a payee's first letters lists matches; picking one fills its last category, marked Suggested, and the bite shows the right "after" | Not run | Passed, after a fix (below) |
| 4 | More than the category has: the bar turns coral and a line says by how much | Not run | Passed |
| 5 | Category, account and date can each be changed; the date's forward arrow does nothing on Today | Not run | Passed |
| 6 | Save returns to the Plan with the new balance, and the server has the transaction as entered | Not run | Passed |
| 7 | A new payee name is created once; using it again creates no second payee | Not run | Passed, after a fix (below) |
| 8 | With the server stopped, Save works and the Plan shows the new balance and **Offline**; with it back, pull to refresh sends the transaction up | Not run | Passed |
| 9 | Income: `+/−`, an income category, Save; Ready to budget goes up by the amount | Not run | Passed |
| 10 | At the largest text size nothing on the sheet is cut off or overlapping | Not run | Passed; the account name is shortened with "…" |
| 10b | On a small screen (360 × 640 points, normal text) the amount, payee, category card with its bite, and the account and date sit above the keypad; with the over-budget warning the form scrolls and a fade shows there is more | Not run | Passed, after a fix (below) |
| 11 | Leaving the app and coming back: no error, no spinner, the Plan as it was | Not run | Passed |

**iOS:** built with Xcode 26.6, installed on the simulator and launched; one screenshot of its first
screen. Nothing on the build machine can tap the simulator, so it never reached the sheet: none of
the eleven checks was run there.

What was entered and seen on Android (fake figures throughout):

- **3, 4:** Corner Grocer suggested Phone, whose tile showed $1,207.03. $18.40 left
  $1,207.03 − $18.40 = $1,188.63, which the card said. $1,250.00 was over:
  $1,250.00 − $1,207.03 = $42.97, shown as "−$42.97 after" and "That is $42.97 more than Phone has".
- **5, 6:** Coffee, Cash Wallet, two days back (Tue 17 Nov), $18.40. Coffee's tile went from
  $204.81 to $186.41, and the server held one transaction dated 2026-11-17 for −1,840 cents with
  payee Corner Grocer, category Coffee, account Cash Wallet.
- **7:** a new payee typed in full, saved; the same name typed again in lower case, saved; then
  picked from the matches, saved. The server had three transactions and one payee of that name.
- **8:** $12.34 to Pets with the server stopped: Pets went from $74.84 to $62.50 and the Plan
  said Offline. After restarting the server and pulling to refresh, Offline went away and the
  server had the transaction.
- **9:** $100.00 of income to the Income category: Ready to budget went from $7,006.86 to
  $7,106.86, on the phone and on the server.
- **10:** font scale 1.3 (`adb shell settings put system font_scale 1.3`, put back to 1.0 after).
  The amount, payee, category card, warning line, account and date all fit above the keypad.
- **11:** Home, eight seconds, then the app again: the Plan came back at the same scroll position
  with the same figures, and no spinner in screenshots taken 0.7 and 4 seconds after.
- **10b** (same day, after the final review's fixes): `adb shell wm size 1080x1920` and
  `wm density 480` (360 × 640 points), put back with `wm size reset` and `wm density reset`
  after. Empty, and with $18.40 against Coffee ($186.41, "$168.01 after"), everything down to
  the account and date fits above the keypad (seen in light; the empty and over-budget cases were also seen in dark). Against Electricity (−$298.80)
  the warning line pushes the account and date under a fade; scrolling brings them up and the
  fade goes. At 1080 × 2400 the sheet was unchanged. Typing 1, 8, ".", 4 showed `−$1`, `−$18`,
  `−$18.` and `−$18.4`, the dollars not moving. The category list drew Electricity, Groceries
  and Subscriptions coral, the three the Plan's notice counts ("3 categories are $800.24 over"),
  and no scrollbar.

Fixed during the run, each with a test:

- **The payee's matches went under the keyboard** (check 3). Android draws the app edge to edge,
  so its window no longer shrinks for the keyboard, and the sheet only moved its form clear of the
  keyboard on iOS. It now does on both, and the sixth match can be scrolled to.
- **Android's Back closed the keyboard but left the keypad hidden** (check 7). The field kept
  its focus, and the keypad, with Save, only comes back when the field is left; a new payee's
  name has no match to tap, so the only way on was the keyboard's own tick. The keyboard closing
  now counts as leaving the field.
- **In the light theme the keys were nearly invisible**: white faces on a near-white page, with
  a white edge. The keys now have a faint dark edge in the light theme (a `keyEdge` token).

Fixed after the final review, each with a test:

- **On a small screen the category card ran under the keypad** (check 10b). Below about 780
  points of height (more with larger text) the sheet is now compact: 48-point keys, a smaller
  amount, tighter gaps, all from the `sheet` tokens. What still does not fit scrolls, with a fade.
- **The amount always showed two decimals**, so "." and deleting a trailing digit changed nothing
  on screen. It now shows what was typed; a screen reader still hears the full amount.
- **A sheet left open past midnight kept the old day**: it said "Today" and saved yesterday's
  date. It now follows the Plan's day; the draft keeps its date, which then reads "Yesterday".
- **The category list drew overspent balances grey**; they are coral by the Plan's own rule, so a
  category with rollover overspending stays quiet. The list's scrollbar, drawn inside the card's
  rounded edge, is gone.

Seen and not changed:

- Changing the system text size while the sheet is open (Android) closes it and loses what was
  typed: Android restarts the screen. Changing dark mode does not.
- The bite's spring was still moving a second after the last key in this debug build.
- The account name is cut short ("Everyday Ch…") on a 360-point-wide screen at normal text.

### The Plan (plan 2)

The nine checks from plan 2 (the Plan screen), run by hand on 2026-11-19 against the test
server, with the fake budget "Spike Small". The emulator's date was 19 November 2026.

| # | Check | iOS simulator | Android emulator |
|---|---|---|---|
| 1 | The Plan shows the top card, group headers and two columns of tiles, in the Aurora style | Not run | Passed |
| 2 | Ready to budget and three categories' balances match the reference client for the month | Not run | Passed |
| 3 | Previous and next month change the month name and the numbers, and stop at the budget's first and last month | Not run | Passed |
| 4 | Pull to refresh shows a budget change made by another client | Not run | Passed |
| 5 | With the server stopped, pull to refresh shows **Offline** and the tiles stay | Not run | Passed |
| 6 | With the server still stopped, closing and reopening the app opens the Plan with **Offline** | Not run | Passed |
| 7 | With the server back, pull to refresh removes **Offline** | Not run | Passed |
| 8 | At the largest system text size the tiles go one to a row, with nothing cut off | Not run | Passed, after a fix (below) |
| 9 | **Account**, then **Sign out**, returns to Connect | Not run | Passed |

**iOS:** the app was built with Xcode 26.6, installed and launched on the simulator, and its
first screen (Connect) was seen in a screenshot. That is all: checks 1 to 9 were not run, because
nothing on the build machine can tap or type on the simulator, so it never reached the Plan.

**Android:** numbers were compared with the reference client in `tools/test-server`
(`scripts/reference.mjs months`): Ready to budget, and the balances of Water, Phone, Electricity
(overspent), Groceries (overspent) and Coffee, all to the cent. One pace note was worked by hand
(Water: $28.95 left, 12 days left including the 19th, $2.41 a day, shown as "$2 a day for 12
days"). For check 4 the reference client's `edit` command raised Water's budget by $100.00, and
after pulling to refresh Water and Ready to budget had both moved by $100.00. For check 6 the app
was stopped with `adb shell am force-stop`. For check 8 the font scale was set with
`adb shell settings put system font_scale 1.3` and put back to 1.0 afterwards.

Check 8 failed at first: at 1.3 the tiles stayed two to a row. Android keeps the font scale as a
32-bit float, so 1.3 reaches the app as 1.2999999523, just under the 1.3 the screen tested for.
The threshold is now 1.29, and a test covers that value.

The first and last months are the budget's own bounds. On the emulator they were May 2026 and
November 2027; the reference client's copy of the same budget ends at October 2027, one month
earlier.

### Scripted run

The app can run the checks by itself and have the host compare the results with
`@actual-app/api`, which is how the simulator and emulator runs in
[spike-results.md](../docs/spike-results.md) were done. Create `app/.env.local`
(gitignored) with the test server's password:

```sh
EXPO_PUBLIC_SPIKE_AUTORUN=1
EXPO_PUBLIC_SPIKE_PASSWORD=<SPIKE_SERVER_PASSWORD from tools/test-server/.env>
# EXPO_PUBLIC_SPIKE_SERVER_URL=http://192.168.x.x:5007   # only for a physical phone
```

Expo builds these values into the app's JavaScript, so use this only with the throwaway server,
and never share a build made this way.

**A full run needs the app's data cleared first.** The scripted run shares the app's id and
therefore its storage, and opening a budget reopens the local copy whenever one exists. So if the
app (or an earlier run) has already opened "Spike Small" or "Spike Large", the "download + open"
steps would time a reopen instead of a download. The run checks for this and stops with an error
saying a local copy already exists. Clear the app's data before a full run:

```sh
# iOS simulator: uninstall (or delete the app's data container), then install the app again
xcrun simctl uninstall <device> software.longarm.accrual
# Android emulator: keeps the app installed, deletes its data
adb shell pm clear software.longarm.accrual
```

Start the app. It downloads both budgets, adds transactions, searches, and then waits. Copy its
event log to the host and check it, twice:

```sh
# iOS simulator
cp "$(xcrun simctl get_app_container booted software.longarm.accrual data)/Documents/spike-events.jsonl" /tmp/events.jsonl
# Android emulator
adb shell run-as software.longarm.accrual cat files/spike-events.jsonl > /tmp/events.jsonl

npx tsx --env-file=../tools/test-server/.env harness/device-check.ts /tmp/events.jsonl
```

The first check compares what the app read, then edits the large budget as a second client.
When the app shows "full run done", copy the log again and run the check again to confirm the
edit arrived. After that, each launch does a cold start (open the local copy and sync) and logs
its timings and open stages. To start over, clear the app's data as above.

On a **physical Android phone**, forward the server's port and point the app at it:

```sh
adb reverse tcp:5007 tcp:5007      # again after the phone has slept
# in .env.local: EXPO_PUBLIC_SPIKE_SERVER_URL=http://127.0.0.1:5007
npx expo run:android --variant release
```

Keep the phone unlocked with the app in front. A release build cannot be read with `run-as`, and
`adb logcat` cuts the longer result lines short, so to get the full results file install the
debug build over it (`adb install -r android/app/build/outputs/apk/debug/app-debug.apk`; the data
is kept) and then use the `run-as` line above.

### On a real phone

On 2026-11-19 a release build was installed on a Samsung Galaxy S24 Ultra and used against its
owner's own Actual 26.11.0 server, reached over HTTPS through Tailscale. This is the first run
against a real server and the first over HTTPS. Reported by the owner, not measured by a script:

- Connecting, choosing a budget and opening it worked. The download was too fast to notice.
- Ready to budget matched what Actual's web app showed for the month.
- After closing and reopening the app it went straight back in without asking for the password.

One trap when copying a password out of a terminal: zsh prints a `%` after output that does not
end in a newline, and it is easy to copy that with the password. The Connect screen's Show
button and its character count make this visible.

