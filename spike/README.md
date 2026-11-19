# Phase 0 spike: loot-core in Expo

Throwaway code that answers one question: can Actual's engine run inside an Expo app and sync
with an Actual server? Results are in [docs/spike-results.md](../docs/spike-results.md).

**Fake data only.** Everything here runs against a throwaway server on port 5007. Never point
it at a real server or a real budget.

## Layout

| Path | What |
|---|---|
| `server/` | Throwaway Actual 26.11.0 server, fake-data seeder, and a reference client (`@actual-app/api`) |
| `app/engine/` | esbuild script that bundles `@actual-app/core`, plus the React Native platform shims |
| `app/src/engine/adapter.ts` | The typed engine adapter the UI talks to |
| `app/modules/accrual-sqlite-functions/` | Native SQLite extension with the SQL functions loot-core needs |
| `app/harness/` | Runs the engine bundle in Node with stand-in native modules and checks it; also checks a scripted on-device run |
| `app/App.tsx` | Bare on-device screen: connect, open a budget, add a transaction, sync, timings |
| `app/src/autorun.ts` | Scripted version of the on-device checks, off by default |

## Run the checks (no phone needed)

```sh
cd spike/server && npm install
npm run server          # 127.0.0.1:5007, data in server/data (gitignored); leave running
npm run seed            # in a second terminal: fake "Spike Small" and "Spike Large" budgets

cd ../app && npm install
npm run sqlfn:build     # compiles the SQLite extension for this machine (needs a C compiler)
npm run sqlfn:test      # checks it against loot-core's JavaScript functions
npm run engine:build    # bundles loot-core into engine/dist
npm run engine:verify   # compares the engine with @actual-app/api, tests sync both ways
npm run engine:verify -- cold   # cold start on the already-downloaded large budget
```

The first `npm run server` or `npm run seed` writes a random test password to `server/.env`
(gitignored).

## Run on a device

Needs a dev build, not Expo Go (expo-sqlite, expo-file-system, expo-crypto and the local
`accrual-sqlite-functions` module are native).

```sh
cd spike/app
npm run engine:build
npx expo run:ios        # or: npx expo run:android
```

Building needs:

- **iOS:** Xcode 26.x. Xcode 27.0 fails in expo-dev-launcher 58.0.21 (`cannot find 'axisBehavior'
  in scope`). If 27.0 is your default, point at an older one for the build:
  `DEVELOPER_DIR=/Applications/Xcode-26.6.0.app/Contents/Developer npx expo run:ios`.
- **Android:** JDK 17 in `JAVA_HOME`, the SDK in `ANDROID_HOME`, and a running emulator.

In the app, enter the test server URL and the password from `server/.env`:

- iOS simulator: `http://127.0.0.1:5007`
- Android emulator: `http://10.0.2.2:5007`

Tap **Connect**, open a budget, then **Add transaction + sync**. The log shows timings.
To check the other direction, change something from another client (the web UI at
`http://127.0.0.1:5007`), then tap **Sync**.

### Scripted run

The app can run the checks by itself and have the host compare the results with
`@actual-app/api`, which is how the simulator and emulator runs in
[spike-results.md](../docs/spike-results.md) were done. Create `spike/app/.env.local`
(gitignored) with the test server's password:

```sh
EXPO_PUBLIC_SPIKE_AUTORUN=1
EXPO_PUBLIC_SPIKE_PASSWORD=<SPIKE_SERVER_PASSWORD from server/.env>
# EXPO_PUBLIC_SPIKE_SERVER_URL=http://192.168.x.x:5007   # only for a physical phone
```

Expo builds these values into the app's JavaScript, so use this only with the throwaway server,
and never share a build made this way.

Start the app. It downloads both budgets, adds transactions, searches, and then waits. Copy its
event log to the host and check it, twice:

```sh
# iOS simulator
cp "$(xcrun simctl get_app_container booted software.longarm.accrual.spike data)/Documents/spike-events.jsonl" /tmp/events.jsonl
# Android emulator
adb shell run-as software.longarm.accrual.spike cat files/spike-events.jsonl > /tmp/events.jsonl

npx tsx --env-file=../server/.env harness/device-check.ts /tmp/events.jsonl
```

The first check compares what the app read, then edits the large budget as a second client.
When the app shows "full run done", copy the log again and run the check again to confirm the
edit arrived. After that, each launch does a cold start (open the local copy and sync) and logs
its timings. To start over, delete the app's data.
