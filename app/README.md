# Accrual app

The Expo app. It runs Actual's engine on the phone and syncs with the user's own Actual server.

**Fake data only.** Everything here runs against the throwaway server in `tools/test-server`
on port 5007. Never point it at a real server or a real budget.

## Layout

After the [foundation plan](../docs/superpowers/plans/2026-11-19-foundation.md) and plan 2 (the
Plan screen), with what each file is for:

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
                                   bounds, opening offline) and paths updated for the move
  modules/accrual-sqlite-functions/   unchanged
  src/
    app/                           Expo Router routes (screens only, no logic)
      _layout.tsx                  fonts, splash screen, session provider, Stack
      index.tsx                    the Plan: month switcher, top card, notice, groups of tiles,
                                   pull to refresh, Offline chip; redirects when not ready, or
                                   to dev-check when the scripted run is on
      connect.tsx                  server address, password, budget list
      opening.tsx                  first-download and reopen progress; opens the copy on the
                                   phone when the server cannot be reached
      dev-check.tsx                developer route for the scripted check (dev/autorun.ts);
                                   the one place a literal colour is allowed
    app-tests/                     screen tests: Expo Router bundles every file under src/app
                                   as a route, so tests cannot live there (a test checks this)
    engine/
      types.ts                     Engine, RemoteBudget, PlanMonth, MonthBounds, OpenStage,
                                   EngineError
      adapter.ts                   createEngine(): the only file that touches the bundle
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
        usePlanMonth.ts            loads a month, refresh, offline and month bounds
        CategoryTile.tsx           one category: two to a row, or a full-width row at large text
        HeroCard.tsx               Ready to budget, the spent / set aside / free bar
        Notice.tsx                 "3 categories are $551.52 over" (informs only, no button)
        GroupHeader.tsx            group name and what its categories have left
        MonthSwitcher.tsx          previous and next month, stopping at the budget's ends
        AccountMenu.tsx            the budget's name and Sign out
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
    lib/
      money.ts                     splitMoney(), formatMoney(), formatWholeMoney()
      month.ts                     currentMonth(), addMonths(), monthLabel(), daysLeftInMonth()
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

