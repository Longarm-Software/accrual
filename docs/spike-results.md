# Phase 0 spike results: loot-core in Expo

- **Date:** 2026-11-18 (off-device and on-device runs)
- **Versions:** Actual 26.11.0 (`@actual-app/core`, `@actual-app/api`, `@actual-app/sync-server`),
  Expo SDK 58, React Native 0.88.1 (Hermes), expo-sqlite 58
- **Code:** [`spike/`](../spike/README.md)

## Verdict

**The approach works, on both platforms.** Actual's engine, unmodified from npm, bundles for
Hermes behind thirteen small shim files (about 500 lines). In a dev build on the iOS simulator and on an Android
emulator it signs in, downloads budgets, produces month numbers identical to the official
client, searches through the native SQL extension, and syncs in both directions.

The first part of the spike ran in a Linux container with no simulator, so the engine was only
exercised in Node. The on-device run was done afterwards on a Mac. It found five problems, all
small and all fixed (see [On-device run](#on-device-run)).

It has since run on a real phone as well: a release build on a Samsung Galaxy S24 Ultra passes
every check, and gives the first real timings (see [On a real phone](#on-a-real-phone)). That is
a flagship. A mid-range Android phone and any iPhone are still untested.

**Recommendation:** ADR 0001 (engine in the app) is Accepted. Do not build the bridge fallback.

## Exit criteria

| Criterion (plan.md) | Result |
|---|---|
| Engine loads in an Expo dev build on iPhone and Android emulator | **Pass** on the iOS simulator (iPhone 17 Pro, iOS 26.5) and an Android emulator (API 36, arm64). A release build also passes on a physical Android phone (Galaxy S24 Ultra, Android 17). Not run on a physical iPhone. |
| Sign in to a server and download a budget | **Pass** (iOS simulator, Android emulator, Node harness) |
| Month's categories, budgeted, spent and balance match to the cent | **Pass** on all three: 40 months across two budgets, 3,000 category cells plus all month totals, identical to `@actual-app/api` |
| Add a transaction, sync, see it elsewhere | **Pass** on all three: a second client (`@actual-app/api`) sees it |
| Edit elsewhere, see it after a sync | **Pass** on all three: a transaction and a budget amount changed by the second client arrive |
| Cold start and sync time on 10,000+ transactions | **Measured** on one physical phone (Galaxy S24 Ultra), the iOS simulator and the Android emulator (see [Timings](#timings)). A slower phone would be a useful second data point. |

Two differences from the wording in plan.md:

- "The web app" was stood in for by `@actual-app/api`. It runs the same engine code as the web
  app, and it could be driven from a script.
- The criteria ask for a copy of a real budget. Only generated fake budgets were used, because
  this repo is public. The large one has 12,384 transactions over 36 months, 23 categories,
  5 accounts, split transactions, transfers and rollover.

## On-device run

Done on a Mac with `npx expo run:ios` and `npx expo run:android`, against the throwaway server
and the two fake budgets. The app ran a scripted version of the checks (`src/autorun.ts`) and
the host compared what it read with `@actual-app/api` (`harness/device-check.ts`). See
"Scripted run" in [`spike/README.md`](../spike/README.md).

All checks pass on the iOS simulator (debug and release builds) and the Android emulator (debug
build): the same checks as the Node harness, on both budgets, including text search and
accent-insensitive payee matching through the native SQL extension.

It took five fixes to get there. The Node harness passed with every one of these bugs present,
so each fix also makes the harness stricter where that was possible.

| Problem | Seen on | Fix |
|---|---|---|
| The engine bundle would not load. `lru-cache` has an optional `import('node:diagnostics_channel')`, which esbuild leaves in place and Metro turns into an error at load time. | iOS | New shim, and `engine:build` now fails if the bundle imports anything other than the app's native modules. That check also caught an optional `require('stream')` in `sax`, now shimmed too. |
| The app crashed while saving a downloaded budget. loot-core passes Node-style `Buffer`s; expo-file-system on iOS only accepts the built-in typed arrays and aborts on anything else. | iOS | `shims/fs.ts` converts to a plain `Uint8Array`. The file-system stand-in now rejects a `Buffer`. |
| Opening any budget threw. Hermes on iOS has no `Intl.NumberFormat.formatToParts`, and loot-core calls it on every open, not only in formula cells as gap 4 assumed. | iOS | `shims/intl.ts` supplies it from `format()`. The harness removes Node's version and checks the stand-in against it in 11 locales. |
| The large budget's first sync was rejected ("invalid fileId"). `File.write()` in expo-file-system is asynchronous; the shim did not wait for it, so the rename that followed could move the file first and leave stale budget metadata. | iOS (a race, so it could hit either platform) | `shims/fs.ts` uses `writeSync()`. The stand-in's `write()` now finishes late, as the real one does. |
| The Android build failed to compile. The Kotlin module uses Expo's newer annotation-based module API, which must not also be listed in `expo-module.config.json`. | Android | Removed the `android.modules` entry. |

Two things about the tools rather than the code:

- **Xcode 27.0 cannot build expo-dev-launcher 58.0.21**, which uses an iOS 27.1 API behind a
  compiler-version check. The iOS builds here used Xcode 26.6 (`DEVELOPER_DIR`). This goes away
  with Xcode 27.1 or a fixed expo-dev-launcher.
- The SQL extension needed no changes on either platform. On iOS the automatic-extension
  registration works; on Android `libaccrualsql.so` is packaged and loads by name.

Not covered by this run: the app's manual buttons (the scripted run calls the same engine
adapter the buttons do).

### On a real phone

The same scripted run, as an Android **release** build on a Samsung Galaxy S24 Ultra (SM-S928W,
Android 17), installed over wireless adb. The server ran on the Mac and the phone reached it
through `adb reverse`, with adb itself connected over Tailscale.

Every check passes, with no code changes: 40 months identical to `@actual-app/api`, all six
searches, a transaction from the phone reaching a second client on both budgets, and a
transaction plus a budget edit from a second client arriving on the phone.

Three things to know when repeating it:

- **The device log cuts long lines.** A release build cannot be read with `run-as`, so results
  come from `adb logcat`, which truncates entries at about 4,000 characters. The first event of
  a run is longer than that. To read the full results file, install the debug build over the
  release build (both are signed with the debug key, so the app's data is kept) and use
  `run-as`.
- **`adb reverse` drops when the phone sleeps.** The app then reports "network-failure". Keep the
  phone unlocked with the app in front, and set the forwarding up again before each run.
- **The app pauses while the screen is off**, so a run started on a locked phone does nothing
  until it is unlocked.

## What "Node harness" means

`npm run engine:verify` loads the exact bundle that ships in the app (`engine/dist/loot-core.rn.js`)
into Node, with:

- `expo-sqlite`, `expo-file-system`, `expo-crypto` and `expo/fetch` replaced by small stand-ins
  (`harness/mocks/`) that copy the parts of each module's API the shims use. The SQLite stand-in,
  like expo-sqlite, registers no custom SQL functions; it loads the same C extension the app uses.
- Node's `Buffer`, `crypto` and `setImmediate` globals deleted first, so the bundle has to supply
  its own, as it must on Hermes.

It proves the engine and shim logic. It does not prove the real native modules, Hermes runtime
behaviour, or phone performance: the on-device run found five problems it had missed. It is
still the fast check to run first, and it is now stricter in the places those problems showed.

## How loot-core is packaged

- loot-core is published to npm as **`@actual-app/core`** (TypeScript source, with the migrations
  and the default database). Nothing needs to be vendored or forked.
- It selects platform code through package.json `imports` conditions: `electron`, `api`, and a
  default for the browser. `@actual-app/api` is a Vite bundle of it built with the `api` condition:
  better-sqlite3, Node `fs`, and global `fetch`, all in one process with no worker.
- The browser build uses sql.js (WebAssembly) on IndexedDB via absurd-sql, inside a web worker.
  Hermes has no WebAssembly, so that path is closed.
- The spike builds with the `api` condition and overrides the platform modules
  (`engine/build.mjs`, esbuild). It sets `platform: 'neutral'`, so any Node builtin still
  reachable fails the build instead of failing on the phone.

## What was shimmed

| loot-core module | Normally | In the spike |
|---|---|---|
| `#platform/server/sqlite` | better-sqlite3 | **expo-sqlite** synchronous API (`shims/sqlite.ts`). loot-core's database calls are synchronous, and expo-sqlite supports that. Custom SQL functions come from a native extension (gap 1 below). |
| `#platform/server/fs` | Node `fs` | **expo-file-system** `File`/`Directory` (`shims/fs.ts`). The default database and the SQL migrations are embedded in the bundle and served from a read-only virtual folder. |
| `#platform/server/fs/path-join` | Node `path` | loot-core's own pure-JS version (copied) |
| `#platform/server/fetch` | global `fetch` | **`expo/fetch`**, because sync sends and receives binary bodies |
| `#platform/server/asyncStorage` | JSON file via Node `fs` | JSON file via the fs shim |
| `#platform/server/memory` | `os.freemem()` | returns `null`, as the browser build does |
| `#server/encryption/encryption-internals` | Node `crypto` | random bytes only; encryption **stubbed** (see below) |
| `node:crypto` (`createHash('md5')` in `server/update.ts`) | Node | `js-md5` |
| `node:diagnostics_channel` (optional import in `lru-cache`) | Node | inert channels (`shims/diagnostics-channel.ts`) |
| `Intl.NumberFormat.formatToParts` | Node, browsers, Hermes on Android | derived from `format()` where missing, which is Hermes on iOS (`shims/intl.ts`) |
| Globals: `Buffer`, `process.env`, `crypto.getRandomValues` | Node | `buffer` package, a stub, expo-crypto |
| Third-party: `xml2js` needs `events`, `timers` and (through `sax`, optionally) `stream`; `handlebars` main entry needs `fs` | Node | `events` package, a two-line `timers`, an empty `stream`, and handlebars' browser build |

That is the complete list. The shims total about 500 lines. The engine bundle is 5.0 MB of
JavaScript, mostly date-fns (1.6 MB), hyperformula (1.6 MB) and loot-core itself (1.2 MB).

## Problems and open gaps

1. **Custom SQL functions (solved, and working on both platforms).** loot-core registers
   five JavaScript functions on each connection: `UNICODE_LOWER`, `UNICODE_UPPER`, `UNICODE_LIKE`,
   `REGEXP`, `NORMALISE`. Search, "contains" and "matches" rules, and payee lookup depend on
   them, and neither expo-sqlite nor op-sqlite can register JavaScript functions.

   They are now provided by a native SQLite extension,
   [`accrual-sqlite-functions`](../spike/app/modules/accrual-sqlite-functions/README.md): about
   400 lines of C on top of QuickJS's regular-expression engine and Unicode tables, so results
   match JavaScript exactly. It agrees with loot-core's own functions on all 183,819
   test inputs, and search results match `@actual-app/api` on the iOS simulator and the Android
   emulator as well as in Node.
2. **End-to-end encrypted budgets** need AES-256-GCM and PBKDF2, and Hermes has no
   `crypto.subtle`. Stubbed to throw. `react-native-quick-crypto` offers Node's `crypto` API, so
   loot-core's Electron implementation should port almost unchanged. Already a Phase 2 item.
3. **The engine runs on the JS thread.** Every query blocks the UI while it runs. This looks
   acceptable for reads, going by the timings, but the first download of a large budget took
   0.7 s on the iOS simulator and will take longer on a phone, which is a visible stall. If it does, move the engine to a background JS runtime. The adapter is already
   fully async, so the UI would not change.
4. **`Intl.NumberFormat.formatToParts` is not implemented in Hermes on iOS** (confirmed on the
   simulator). loot-core calls it whenever a budget is opened. Solved with a small stand-in
   (`shims/intl.ts`) that reports the group and decimal separators, which is all loot-core reads.
   It does not label currency, percent or sign parts; use `@formatjs/intl-numberformat` if the
   app's own UI ever needs those.
5. **Session token storage.** The spike signs in with the password on every start and keeps
   nothing. The app should use loot-core's `initApp` path with the token in Keychain/Keystore.
6. **Bank-file import** (OFX, CAMT, QIF) relies on `TextDecoder` with legacy encodings; untested
   on Hermes. Imports are a v1 non-goal.
7. **Metro runs Babel over the 5 MB bundle**, so a cold Metro build takes about 35 s.

Nothing was a dead end. The first build attempt stopped on three Node builtins in third-party
packages (the last row of the shim table); the first verification run in Node passed. The first
run on a simulator did not: see [On-device run](#on-device-run).

## Timings

Large budget (about 12,400 transactions).

### A real phone

Samsung Galaxy S24 Ultra, Android 17, release build. The server was on a Mac, reached through
`adb reverse` over Tailscale, so every step that talks to the server includes that hop and would
differ on a real network. This is a 2024 flagship: expect a mid-range phone to be slower.

| Step | Time |
|---|---|
| Load and evaluate the engine bundle | 22–36 ms |
| Init and sign in | 115–212 ms |
| First download and open of the large budget | 1,312 ms (one run) |
| Cold start: open local copy and sync | 126–178 ms |
| Read a month | 4–6 ms |
| Read 36 months | 109–175 ms |
| Read every transaction | 485–610 ms |
| Sync after adding one transaction | 41–55 ms |
| Sync with nothing new | 15–66 ms |

Cold start figures are from five launches; the rest are from two runs, and the first download
from one. From launch to an open, synced large budget (bundle load, sign in, list, open) took
290–370 ms. The first download is the one slow step: 1.3 s with the JS thread blocked (gap 3).

### Simulator and emulator

**These are not phone numbers.**

Hermes with the real native modules, on an Apple-silicon Mac. A simulator runs at the Mac's
speed, so expect a phone to be slower, and an older Android phone much slower. Debug builds
load unoptimised JavaScript from Metro; the release build is the closest of the three to what
a user would get.

| Step | iOS simulator, release | iOS simulator, debug | Android emulator, debug |
|---|---|---|---|
| Load and evaluate the engine bundle | 22–39 ms | 320–350 ms | 490–960 ms |
| Init and sign in | 60–130 ms | 70–90 ms | 130–860 ms |
| First download and open of the large budget | 686 ms | 1,105 ms | 1,603 ms |
| Cold start: open local copy and sync | 73–76 ms | 144–156 ms | 238–259 ms |
| Read a month | 2 ms | 2–20 ms | 3–7 ms |
| Read 36 months | 98 ms | 123 ms | 175 ms |
| Read every transaction | 268 ms | 464 ms | 688 ms |
| Sync after adding one transaction | 11 ms | 9 ms | 19 ms |
| Sync with nothing new | 4 ms | 5 ms | 15–40 ms |

Cold start figures are from three launches each. From launch to an open, synced large budget
(bundle load, sign in, list, open) is about 0.2 s in the iOS release build, 0.55 s in the iOS
debug build and 1.3–1.6 s in the Android debug build.

### Desktop Node

V8, 4 cores, in the Linux container the first part of the spike ran in.

| Step | Time |
|---|---|
| Load and evaluate the engine bundle | 200–250 ms |
| Init and sign in | ~90 ms |
| First download and open of the large budget | 175 ms |
| Cold start: open local copy and sync | 60–75 ms |
| Read a month | 1–3 ms |
| Sync after adding one transaction | 12 ms |
| Sync with nothing new | 4–6 ms |

A cold start in a new process (bundle load, sign in, open, sync) totals about 0.4 s here.

## Prior art

- **The original Actual mobile app** was React Native (`packages/mobile`). It ran loot-core in an
  embedded Node thread through `nodejs-mobile-react-native` rather than in the RN JS engine. It was
  removed in January 2023 ([PR #443](https://github.com/actualbudget/actual/pull/443)) in favour
  of the responsive web app.
- **Upstream is building its own mobile app.** v26.11.0 contains `packages/mobile-client`, a
  Capacitor wrapper around the web build. An experimental iOS TestFlight beta is tracked in
  [issue #9440](https://github.com/actualbudget/actual/issues/9440). It is the web UI in a
  WebView, not a native UI, but it is an official app and it affects how Accrual is positioned
  (see [business.md](business.md#upstreams-own-mobile-app)).
- **[cubancodepath/actual-expo](https://github.com/cubancodepath/actual-expo)** is a hand port of
  loot-core's sync, CRDT and query code to Expo on expo-sqlite. It is a re-implementation that
  has to track upstream by hand, which this spike shows is avoidable.
- **[Issue #9555](https://github.com/actualbudget/actual/issues/9555)** (November 2026) asked for a
  pluggable SQLite engine in `@actual-app/api` to build an Expo app on op-sqlite. It was
  auto-closed without a maintainer reply.
- No public project was found that runs the unmodified engine on Hermes.

## Next steps

1. **Decide what to do about the first download** (gap 3). It blocks the JS thread for 1.3 s on a
   flagship phone, so it will be worse on a slower one. Either show progress and accept it, since
   it happens once per budget, or move the engine to a background runtime.
2. **Run it on a mid-range Android phone and on an iPhone** when one is available. An iPhone
   needs a signing team.
3. Done: the Node harness runs in CI on every pull request (`.github/workflows/engine.yml`).
