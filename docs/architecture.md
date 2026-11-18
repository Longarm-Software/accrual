# Architecture

## How Actual works (what matters for us)

- The **Actual server** is a fairly simple sync and storage service. It stores budget files and
  relays a log of CRDT change messages between devices. It also handles auth and bank-sync
  (SimpleFIN or GoCardless).
- All budget logic runs **in the client**, inside Actual's engine, `loot-core`. That includes
  balances, carryover, rules, schedules and target templates. Each client keeps a full SQLite
  copy of the budget and syncs changes as messages.
- Budgets can optionally be end-to-end encrypted with a key the server never sees.

So any real client has to run `loot-core`, or re-implement it. Re-implementing it isn't
realistic.

## Chosen approach: the engine inside the app

```
┌──────────────── Phone ────────────────┐          ┌──────── User's server ────────┐
│  React Native UI (Expo)               │          │                               │
│        │  typed queries & mutations   │  HTTPS   │   actual-server               │
│  Engine adapter (our code)            │ ◄──────► │   (sync messages, files,      │
│        │                              │          │    auth, bank sync)           │
│  loot-core (Actual, MIT, pinned)      │          │                               │
│        │                              │          └───────────────────────────────┘
│  Platform shims: SQLite, fs, crypto   │
└───────────────────────────────────────┘
```

- **UI:** React Native with Expo and TypeScript. It never touches `loot-core` directly.
- **Engine adapter:** a small, typed API for what the UI needs (`getMonth`, `getCategory`,
  `moveMoney`, `addTransaction`, `sync`, …). It's the only code that knows `loot-core`'s
  internals, so version bumps stay contained.
- **loot-core:** vendored or pinned from the Actual repo at a specific release tag.
- **Platform shims:** SQLite through expo-sqlite or op-sqlite, file storage through the app
  sandbox, crypto through native modules. The spike decides exactly what's needed here.

### Why not a hosted backend (BaaS)?
- The server isn't where the logic lives. A hosted service would still have to run `loot-core`
  with a persistent SQLite file for every user, so it would be a full server, not a BaaS.
- Longarm would hold every customer's server credentials and financial history, with the privacy
  and legal exposure that brings. That also contradicts the reason people self-host Actual.
- "Your data never touches our servers" is a core selling point.

## Fallback: self-hosted bridge

If `loot-core` can't run reliably on a phone, use this instead:

```
Phone app ──HTTPS──► bridge (Node + @actual-app/api) ──► actual-server
                     runs next to the user's server, e.g. a Docker container
```

- The bridge provides a small REST API that matches the engine adapter's interface, so the UI
  code stays the same.
- Users run it themselves next to their Actual server. It's still not a Longarm service.
- Trade-offs: no offline use, one more container to run, and harder setup for users.

## Security principles

- The server password goes in iOS Keychain or Android Keystore only. It never appears in logs,
  crash reports or analytics.
- No telemetry by default. If crash reporting is ever added, it's opt-in and strips amounts,
  payees and notes.
- Payee names, notes and imported data are treated as untrusted text and shown as text only.
- Default to HTTPS. Plain HTTP is allowed only with an explicit "I know what I'm doing" toggle
  for LAN or Tailscale setups.
