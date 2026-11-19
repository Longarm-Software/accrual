# Accrual app

The Expo app. It runs Actual's engine on the phone and syncs with the user's own Actual server.

**Fake data only.** Everything here runs against the throwaway server in `tools/test-server`
on port 5007. Never point it at a real server or a real budget.

## Layout

After the [foundation plan](../docs/superpowers/plans/2026-11-19-foundation.md), with what each
file is for:

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
  harness/                         unchanged, except verify.ts (new checks) and paths updated
                                   for the move
  modules/accrual-sqlite-functions/   unchanged
  src/
    app/                           Expo Router routes (screens only, no logic)
      _layout.tsx                  fonts, splash screen, session provider, Stack
      index.tsx                    Home: Ready to budget; redirects when not ready, or to
                                   dev-check when the scripted run is on
      connect.tsx                  server address, password, budget list
      opening.tsx                  first-download and reopen progress
      dev-check.tsx                developer route for the scripted check (dev/autorun.ts);
                                   the one place a literal colour is allowed
    app-tests/                     screen tests: Expo Router bundles every file under src/app
                                   as a route, so tests cannot live there (a test checks this)
    engine/
      types.ts                     Engine, RemoteBudget, BudgetMonth, OpenStage, EngineError
      adapter.ts                   createEngine(): the only file that touches the bundle
    session/
      serverUrl.ts                 normalizeServerUrl()
      storage.ts                   load/save/clear the saved session in SecureStore
      SessionProvider.tsx          context: status, engine, connect/choose/open/signOut
      fakeEngine.ts                an in-memory Engine for tests
    features/
      connect/errors.ts            engine error code -> sentence for a person
      opening/stageCopy.ts         OpenStage -> the line shown on the progress screen
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
      Spinner.tsx                  a ring that turns on the native thread
    lib/
      money.ts                     splitMoney(), formatMoney()
      month.ts                     currentMonth()
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

The eight checks from the foundation plan, run by hand on 2026-11-19 against the test server.

| # | Check | iOS simulator | Android emulator |
|---|---|---|---|
| 1 | First launch shows **Connect to your Actual server** | Passed | Passed |
| 2 | An `http://` address without **Allow plain HTTP** says the address is not encrypted | Not run | Passed |
| 3 | With **Allow plain HTTP** on, "Spike Small" and "Spike Large" are listed | Not run | Passed |
| 4 | A wrong password says "That password is not right." | Not run | Passed |
| 5 | **Open Spike Large** shows "Downloading", then "Syncing", with the ring turning | Not run | Passed |
| 6 | Home shows "Spike Large" and Ready to budget, matching `@actual-app/api` to the cent | Not run | Passed |
| 7 | After the app is closed and reopened: "Opening", then "Syncing", then Home, no password | Not run | Passed |
| 8 | **Sign out** returns to Connect, and the app still opens on Connect afterwards | Not run | Passed |

**iOS:** the app was built (Xcode 26.6), installed and launched on the simulator, and check 1
was confirmed from a screenshot. Checks 2 to 8 were not run: nothing on the build machine can tap
or type on the simulator.

**Android:** check 6 was compared with the reference client in `tools/test-server`
(`scripts/reference.mjs months`) rather than the web app. For check 7 the app was stopped with
`adb shell am force-stop`, which ends the process as closing it from the app switcher does.

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
its timings. To start over, delete the app's data.

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
