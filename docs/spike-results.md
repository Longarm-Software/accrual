# Phase 0 spike results: loot-core in Expo

- **Date:** 2026-11-18
- **Versions:** Actual 26.11.0 (`@actual-app/core`, `@actual-app/api`, `@actual-app/sync-server`),
  Expo SDK 58, React Native 0.88.1 (Hermes), expo-sqlite 58
- **Code:** [`spike/`](../spike/README.md)

## Verdict

**The approach works, with one check still open.** Actual's engine, unmodified from npm, bundles
for Hermes behind seven small platform shims. That bundle signs in, downloads budgets, produces
month numbers identical to the official client, and syncs in both directions.

It has **not yet run on a phone or simulator**. The spike ran in a Linux cloud container with no
Xcode and no hardware virtualisation for an Android emulator. The engine was exercised in Node
with stand-ins for the four native modules, and the app was compiled to Hermes bytecode for iOS
and Android. The remaining risk is whether the three Expo native modules behave as their type
definitions say. Closing it takes one `npx expo run:ios` on a Mac (see
[Next steps](#next-steps)).

**Recommendation:** go ahead with ADR 0001 (engine in the app). Do the on-device run first, and
mark the ADR Accepted when it passes. Do not build the bridge fallback.

## Exit criteria

| Criterion (plan.md) | Result |
|---|---|
| Engine loads in an Expo dev build on iPhone and Android emulator | **Not run.** Metro bundles the app and `hermesc` compiles it for both platforms (6.1 MB `.hbc`), and `expo-doctor` passes. No device or simulator was available. |
| Sign in to a server and download a budget | **Pass** (Node harness) |
| Month's categories, budgeted, spent and balance match to the cent | **Pass** (Node harness): 40 months across two budgets, 3,000 category cells plus all month totals, identical to `@actual-app/api` |
| Add a transaction, sync, see it elsewhere | **Pass** (Node harness): a second client (`@actual-app/api`) sees it |
| Edit elsewhere, see it after a sync | **Pass** (Node harness): a transaction and a budget amount changed by the second client arrive |
| Cold start and sync time on 10,000+ transactions | **Measured on desktop only** (see [Timings](#timings)); phone numbers still needed |

Two differences from the wording in plan.md:

- "The web app" was stood in for by `@actual-app/api`. It runs the same engine code as the web
  app, and it could be driven from a script.
- The criteria ask for a copy of a real budget. Only generated fake budgets were used, because
  this repo is public. The large one has 12,384 transactions over 36 months, 23 categories,
  5 accounts, split transactions, transfers and rollover.

## What "Node harness" means

`npm run engine:verify` loads the exact bundle that ships in the app (`engine/dist/loot-core.rn.js`)
into Node, with:

- `expo-sqlite`, `expo-file-system`, `expo-crypto` and `expo/fetch` replaced by small stand-ins
  (`harness/mocks/`) that copy the parts of each module's API the shims use. The SQLite stand-in,
  like expo-sqlite, registers no custom SQL functions.
- Node's `Buffer`, `crypto` and `setImmediate` globals deleted first, so the bundle has to supply
  its own, as it must on Hermes.

It proves the engine and shim logic. It does not prove the real native modules, Hermes runtime
behaviour, or phone performance.

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
| `#platform/server/sqlite` | better-sqlite3 | **expo-sqlite** synchronous API (`shims/sqlite.ts`). loot-core's database calls are synchronous, and expo-sqlite supports that. |
| `#platform/server/fs` | Node `fs` | **expo-file-system** `File`/`Directory` (`shims/fs.ts`). The default database and the SQL migrations are embedded in the bundle and served from a read-only virtual folder. |
| `#platform/server/fs/path-join` | Node `path` | loot-core's own pure-JS version (copied) |
| `#platform/server/fetch` | global `fetch` | **`expo/fetch`**, because sync sends and receives binary bodies |
| `#platform/server/asyncStorage` | JSON file via Node `fs` | JSON file via the fs shim |
| `#platform/server/memory` | `os.freemem()` | returns `null`, as the browser build does |
| `#server/encryption/encryption-internals` | Node `crypto` | random bytes only; encryption **stubbed** (see below) |
| `node:crypto` (`createHash('md5')` in `server/update.ts`) | Node | `js-md5` |
| Globals: `Buffer`, `process.env`, `crypto.getRandomValues` | Node | `buffer` package, a stub, expo-crypto |
| Third-party: `xml2js` needs `events` and `timers`; `handlebars` main entry needs `fs` | Node | `events` package, a two-line `timers`, and handlebars' browser build |

That is the complete list. The shims total about 350 lines. The engine bundle is 5.0 MB of
JavaScript, mostly date-fns (1.6 MB), hyperformula (1.6 MB) and loot-core itself (1.2 MB).

## Problems and open gaps

1. **Custom SQL functions (needs work in Phase 1).** loot-core registers five JavaScript functions
   on each connection: `UNICODE_LOWER`, `UNICODE_UPPER`, `UNICODE_LIKE`, `REGEXP`, `NORMALISE`.
   Neither expo-sqlite nor op-sqlite can register JavaScript functions. In the spike:
   - `UNICODE_LOWER`/`UPPER` are rewritten to SQLite's built-in ASCII-only versions. This is on
     the add-transaction path (payee lookup by name). The effect, expected but not tested: a
     payee whose stored name has a non-ASCII capital, such as "Émile", is not matched
     case-insensitively and could be created twice.
   - `UNICODE_LIKE`, `REGEXP` and `NORMALISE` throw. They are used by text and regex filters:
     transaction search, and rules with "contains" or "matches" conditions.

   Fix: a small native SQLite extension in C that defines the five functions. Both expo-sqlite
   and op-sqlite can load extensions. This is the largest known piece of native work.
2. **End-to-end encrypted budgets** need AES-256-GCM and PBKDF2, and Hermes has no
   `crypto.subtle`. Stubbed to throw. `react-native-quick-crypto` offers Node's `crypto` API, so
   loot-core's Electron implementation should port almost unchanged. Already a Phase 2 item.
3. **The engine runs on the JS thread.** Every query blocks the UI while it runs. This looks
   acceptable for reads, going by the timings, but opening a large budget on a phone may cause a
   visible stall. If it does, move the engine to a background JS runtime. The adapter is already
   fully async, so the UI would not change.
4. **`Intl.NumberFormat.formatToParts` is not implemented in Hermes on iOS** (per Hermes source;
   not tested). loot-core uses it only for locale-aware number parsing in formula cells.
5. **Session token storage.** The spike signs in with the password on every start and keeps
   nothing. The app should use loot-core's `initApp` path with the token in Keychain/Keystore.
6. **Bank-file import** (OFX, CAMT, QIF) relies on `TextDecoder` with legacy encodings; untested
   on Hermes. Imports are a v1 non-goal.
7. **Metro runs Babel over the 5 MB bundle**, so a cold Metro build takes about 35 s.

Nothing was a dead end. The first build attempt stopped on three Node builtins in third-party
packages (the last row of the shim table); the first verification run passed.

## Timings

Desktop Node (V8, 4 cores), server on localhost, large budget (12,384 transactions). **These are
not phone numbers.** Expect Hermes on a phone to be several times slower.

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

1. **On-device run (about 30 minutes, on a Mac).** Follow "Run on a device" in
   [`spike/README.md`](../spike/README.md) for the iOS simulator and an Android emulator. Open
   "Spike Large", add a transaction, sync, and note the timings in the app's log. The likeliest
   failures are path or URI handling in `shims/fs.ts`, opening a database outside expo-sqlite's
   default folder, and binary request bodies in `expo/fetch`. Each is a small fix in one shim.
2. If it passes, set ADR 0001 to Accepted and tick the first box in plan.md.
3. Start Phase 1 with the SQL-function extension (gap 1), since search and rules depend on it.
4. Add the Node harness to CI against a dockerised server. It is a ready-made regression test for
   each monthly Actual release.
