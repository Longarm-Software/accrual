# 0002: Show progress during the first download; keep the engine on the JS thread

- **Status:** Accepted (2026-11-19)
- **Date:** 2026-11-19

## Context

The engine runs on the app's JavaScript thread, so the interface cannot respond while a query
runs. On a Galaxy S24 Ultra every measured step is fast enough not to notice except one: the
first download and open of a 12,400-transaction budget took 1.3 seconds. A slower phone will
take longer. It happens once per budget per device. Opening the same budget afterwards took
126–178 ms. See [spike results](../spike-results.md#a-real-phone).

## Decision

For v1, the engine stays on the JS thread. The first download gets its own screen that names
the step in progress (downloading, opening, syncing) and keeps moving while the thread is
blocked.

## Consequences

- Good: no second JavaScript runtime to build, debug and keep in step with Actual's releases.
- Bad: the screen cannot show a true percentage, and nothing can be tapped during the wait.
- The progress animation must run on the native side (Reanimated), because anything driven
  from JavaScript would freeze along with the thread.
- The engine adapter has to report the steps one by one, so it opens a budget in stages
  instead of with a single call.
- Revisit if the first download passes about 5 seconds on a mid-range phone, or if a step that
  happens often (opening, syncing, reading a month) passes about 300 ms. Those have not been
  measured on a mid-range phone yet.

## Alternatives considered

- **Move the engine to a background runtime:** the UI would stay responsive throughout. It
  costs a second runtime, a message bridge for every query, and more to re-test on each Actual
  release. Not worth it for a wait that happens once.
- **Do nothing:** a 1.3-second freeze with no explanation, on first use, is the wrong first
  impression for an app whose pitch is polish.
