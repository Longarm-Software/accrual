# 0001: Run Actual's engine inside the app

- **Status:** Accepted (2026-11-18). The Phase 0 spike passed on the iOS simulator and an Android
  emulator (see [spike results](../spike-results.md))
- **Date:** 2026-11-18

## Context
Actual's budget logic lives in its client engine (`loot-core`), not in the server. A mobile
client has three options: re-implement the engine, run it on a server, or run it on the device.

## Decision
Run `loot-core` inside a React Native/Expo app, behind a typed engine adapter, and sync directly
with the user's own Actual server.

## Consequences
- Good: no Longarm backend or hosting costs, offline use, strong privacy story, and iPhone plus
  Android from one codebase.
- Bad: platform shims are needed, and we have to keep up with Actual's monthly releases.
- If the spike fails, use the self-hosted bridge (see architecture.md) and supersede this record.

## Spike findings (2026-11-18)
- `loot-core` is on npm as `@actual-app/core`. It bundles for Hermes unmodified, behind thirteen
  small shim files (about 500 lines) built on expo-sqlite, expo-file-system, `expo/fetch` and
  expo-crypto. No fork and no vendored copy.
- Run in Node with stand-in native modules, the bundle matches `@actual-app/api` to the cent
  and syncs both ways with a 26.11.0 server.
- Run on the iOS simulator (debug and release builds) and an Android emulator (debug build), the
  same checks pass: numbers match to the cent, search works, and sync works both ways. Getting
  there took five small fixes that the Node run had not shown.
- A release build passes the same checks on a physical Android phone (Galaxy S24 Ultra): cold
  start about 0.3 s on a 12,400-transaction budget, first download 1.3 s. No iPhone yet.
- loot-core's five custom SQL functions are provided by a native SQLite extension
  (`accrual-sqlite-functions`), which builds and works on both platforms.
- Known follow-up work: `react-native-quick-crypto` for encrypted budgets.

## Alternatives considered
- **Re-implement in Swift/Kotlin:** months of work, and too much risk of drifting from Actual's
  real behaviour.
- **Hosted BaaS or Longarm server:** privacy and liability problems, and it's a full server, not
  a BaaS.
- **Self-hosted bridge:** a workable fallback, kept in reserve.
- **Embedded Node thread (nodejs-mobile):** how the original Actual mobile app ran the engine.
  Not needed, since the engine runs directly on Hermes.
- **WebView wrapper around the web app:** what upstream's experimental Capacitor app does. It
  gives the web UI, not the native UI that is the point of Accrual.
