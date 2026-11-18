# 0001: Run Actual's engine inside the app

- **Status:** Proposed (to be confirmed by the Phase 0 spike)
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

## Alternatives considered
- **Re-implement in Swift/Kotlin:** months of work, and too much risk of drifting from Actual's
  real behaviour.
- **Hosted BaaS or Longarm server:** privacy and liability problems, and it's a full server, not
  a BaaS.
- **Self-hosted bridge:** a workable fallback, kept in reserve.
