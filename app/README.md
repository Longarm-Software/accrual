# Accrual app

The Expo app. It runs Actual's engine on the phone and syncs with the user's own Actual server.

**Fake data only.** Everything here runs against the throwaway server in `tools/test-server`
on port 5007. Never point it at a real server or a real budget.

## Layout

After the [foundation plan](../docs/superpowers/plans/2026-11-19-foundation.md), plan 2 (the
Plan screen) and plan 3 ([quick add](../docs/superpowers/plans/2026-11-19-quick-add.md)), with
what each file is for:

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
                                   with a new or existing payee, the sync time bound) and paths
                                   updated for the move
  modules/accrual-sqlite-functions/   unchanged
  src/
    app/                           Expo Router routes (screens only, no logic)
      _layout.tsx                  fonts, splash screen, session provider, Stack (quick add as a
                                   modal), Android navigation bar style following the theme
      index.tsx                    the Plan: month switcher, top card, notice, groups of tiles,
                                   pull to refresh, Offline chip, the + button; re-reads today
                                   and syncs on returning to the foreground; redirects when not
                                   ready, or to dev-check when the scripted run is on
      add.tsx                      quick add: amount, payee, category with the bite, account,
                                   date, keypad; the keypad gives way to the keyboard for the payee
      connect.tsx                  server address, password, budget list
      opening.tsx                  first-download and reopen progress; opens the copy on the
                                   phone when the server cannot be reached
      dev-check.tsx                developer route for the scripted check (dev/autorun.ts);
                                   the one place a literal colour is allowed
    app-tests/                     screen tests: Expo Router bundles every file under src/app
                                   as a route, so tests cannot live there (a test checks this)
    engine/
      types.ts                     Engine, RemoteBudget, PlanMonth, MonthBounds, OpenStage,
                                   QuickAddLists, NewTransaction, EngineError
      adapter.ts                   createEngine(): the only file that touches the bundle;
                                   a sync gives up after 15 seconds
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
        quickAddSignal.ts          what the Plan and the sheet share: today, and "a save happened"
        AddButton.tsx              the round + above the navigation bar
        CategoryTile.tsx           one category: two to a row, or a full-width row at large text
        HeroCard.tsx               Ready to budget, the spent / set aside / free bar
        Notice.tsx                 "3 categories are $551.52 over" (informs only, no button)
        GroupHeader.tsx            group name and what its categories have left
        MonthSwitcher.tsx          previous and next month, stopping at the budget's ends
        AccountMenu.tsx            the budget's name and Sign out
      quickAdd/                    the quick-add sheet's parts
        amountEntry.ts             keypad keys -> the amount, as digit strings, then cents
        bite.ts                    what an expense does to a category: kept, taken, after, warning
        draft.ts                   the draft transaction: payee, suggested category, account, date
        payees.ts                  payee matches for typed text; the exact match
        useQuickAdd.ts             reads the lists and the month, holds the draft, saves
        AmountDisplay.tsx          "−$18.40" at the hero size, one height, fitted to one line
        Keypad.tsx                 1-9, ".", 0, 00, delete (held: repeats), +/−, the tall Save
        PayeeField.tsx             the payee field and up to six matches
        CategoryCard.tsx           the category, Suggested or Change, the bite bar, what is left
        BiteBar.tsx                the bar: solid what stays, hatched what this takes
        DateStepper.tsx            ‹ Today ›, a day at a time, never past today
        PickerList.tsx             the category and account lists
    theme/
      tokens.ts                    Aurora colours (dark, light), radii, spacing, type
      contrast.ts                  WCAG contrast ratio
      useTheme.ts                  picks dark or light from the system
    ui/
      AuroraBackground.tsx         the gradient page background
      Glass.tsx                    frosted tile on iOS, solid tile on Android
      Text.tsx                     Body, Label, Display
      Money.tsx                    "$207" with a smaller ".62"
      Button.tsx                   primary (gradient) and quiet (glass)
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

Seen and not changed:

- On a small screen (360 × 640 points, a little smaller than the smallest current iPhone's 375 × 667) the category card runs
  under the keypad and the account and date need a scroll. 360 × 800 fits. Making it fit means
  a more compact layout, which is a design decision.
- Changing the system text size while the sheet is open (Android) closes it and loses what was
  typed: Android restarts the screen. Changing dark mode does not.
- The amount always shows two decimals, so deleting the last digit of `18.40` changes nothing
  that can be seen until the next key.
- The bite's spring was still moving a second after the last key in this debug build.

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

