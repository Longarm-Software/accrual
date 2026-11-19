# Plan

## Goals

1. **Daily driver first.** It has to be good enough to check and run a real budget on a phone
   every day before anything else matters.
2. **Open source from day one.** There are no secrets, personal data or hard-coded servers in the
   repo. All server details are entered in the app.
3. **Ship it.** Free on GitHub, and a few dollars on the App Store and Play Store for the signed
   build.

## Non-goals (for v1)

- Replacing Actual's desktop and web app. Reports, rules editing, imports and bank-sync setup
  stay there.
- Any hosted Longarm service, accounts or analytics that collect financial data.
- Supporting Actual servers older than the version we pin to.

## Phases

### Phase 0: Spike (1–2 sessions)
Prove the core idea: can Actual's engine (`loot-core`) run inside a React Native/Expo app?

Exit criteria, all of which must pass against a **copy** of a real budget:
- [x] The engine loads in an Expo dev build on an iPhone and an Android emulator.
      *(iOS simulator, Android emulator, and a physical Android phone. Not yet a physical iPhone.)*
- [x] Sign in to an Actual server and download a budget.
- [x] Read this month's categories, budgeted, spent and balance amounts, and confirm they match the
      web app to the cent.
- [x] Add a transaction on the phone, sync it, and see it in the web app.
- [x] Make an edit in the web app and see it on the phone after a sync.
- [x] Measure cold start and sync time on a large budget (10,000+ transactions).
      *(On a Galaxy S24 Ultra: cold start about 0.3 s, first download 1.3 s. One flagship phone.)*

The ticked items passed on the iOS simulator, an Android emulator, a physical Android phone and
in Node, with fake budgets
and `@actual-app/api` standing in for the web app. Details and caveats are in [spike-results.md](spike-results.md).

If the spike fails, use the fallback in [architecture.md](architecture.md#fallback-self-hosted-bridge)
and record the decision in `docs/decisions/`.

### Phase 1: Personal MVP
- [x] Server setup screen (URL and password). The password is not stored: only the session
  token the server returns is kept, in Keychain/Keystore.
- [x] Budget picker.
      *(Both verified end to end on an Android emulator in the
      [foundation plan](superpowers/plans/2026-11-19-foundation.md). On the iOS simulator only the
      Connect screen was seen; the iOS checks are still pending.)*
- [x] **Plan screen:** month switcher, To Budget banner, category groups, and category cards with a
  progress bar, an Available pill and a target status.
      *(Verified on an Android emulator. On the iOS simulator the app was only built and opened
      to its first screen. The cards show a note from the category's own numbers when it has no
      goal template, and a daily pace in the current month. See "What works" in
      [app/README.md](../app/README.md#what-works).)*
- **Category detail:** activity list, target, and moving money in or out (cover overspending).
- **Transactions:** account list, register, quick add (payee, category, amount, account) and
  categorize uncategorized items.
- [x] Pull-to-refresh sync, plus a sync on launch.
      *(Pull to refresh verified on an Android emulator, including going offline and back. The
      sync on launch is not a background sync: the opening screen runs it in the foreground,
      before the Plan appears; without a connection the app opens the copy on the phone instead.
      A sync when the app returns to the foreground is plan 3. Not checked on the iOS
      simulator.)*
- Overspending alert banner ("2 categories overspent. Cover them?").
      *(The banner is built and shows on the Plan, without the "Cover them?" button: covering
      overspending arrives with category detail in plan 4.)*

### Phase 2: Polish and public beta
- Home-screen widgets: "Left this week" for chosen categories and the To Budget amount.
- Offline-first queue with clear sync status.
- Light and dark themes.
- Support for end-to-end encrypted budgets.
- Accessibility pass (Dynamic Type, VoiceOver and TalkBack, contrast).
- TestFlight and Play internal testing, and a public GitHub repo.

### Phase 3: Store launch
- App Store and Play Store listings, screenshots and a privacy policy ("we collect nothing").
- A launch post in the Actual community (Discord, GitHub Discussions, Reddit).
- A release process that tracks Actual's monthly releases (see Risks).

## Risks

| Risk | Mitigation |
|---|---|
| `loot-core` depends on browser or Node APIs that React Native lacks (filesystem, SQLite, workers, crypto) | The spike finds these early. Write a thin platform-shim layer, and use the fallback bridge if it's too deep. |
| Actual's sync protocol or schema changes each month | Pin to one Actual version, run CI against a dockerized `actual-server` of that version, and bump deliberately. |
| Performance on big budgets | Measure in the spike, then use lazy queries and a month-scoped cache. |
| Users with encrypted budgets | Phase 2 feature. Show a clear "not supported yet" message until then. |
| Trademark confusion | Use our own name and icon, and describe the app as "for Actual Budget". |
| Data loss bugs | Develop only against budget copies, write integration tests, and never auto-resolve conflicts silently. |

## Dev environment notes

- Develop against a **local test server** (`docker run actualbudget/actual-server`) and a test
  budget, never a live one.
- No real financial data goes in the repo, test fixtures, screenshots or issues. Generate fake
  budgets instead.
