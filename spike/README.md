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
| `app/harness/` | Runs the engine bundle in Node with stand-in native modules and checks it |
| `app/App.tsx` | Bare on-device screen: connect, open a budget, add a transaction, sync, timings |

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

In the app, enter the test server URL and the password from `server/.env`:

- iOS simulator: `http://127.0.0.1:5007`
- Android emulator: `http://10.0.2.2:5007`

Tap **Connect**, open a budget, then **Add transaction + sync**. The log shows timings.
To check the other direction, change something from another client (the web UI at
`http://127.0.0.1:5007`), then tap **Sync**.
