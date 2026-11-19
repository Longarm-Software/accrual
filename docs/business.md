# Business model

## Open source plus paid store builds

- **Code:** MIT on GitHub, owned by Longarm Software Inc. Anyone can build and sideload it for
  free.
- **App Store and Play Store:** about $3–5 one-time (a final price is still to decide). People pay
  for the convenience of signed builds, automatic updates and supporting development.
- **No subscriptions, ads, accounts or tracking.** That suits the self-hosting audience.
- Optional tip jar or GitHub Sponsors later.

Plenty of self-hosting apps use this model successfully. It builds trust with this audience,
and the store price covers the time spent on updates.

## Audience

People who already run, or are willing to run, an Actual server, especially those who moved from
paid budgeting apps but miss a polished mobile experience. The audience is small but
enthusiastic and well connected (Actual's Discord, GitHub, r/selfhosted, r/ynab and r/personalfinance).

## Upstream's own mobile app

Actual is building an official mobile app, so Accrual will not be the only way to get Actual
from an app store.

**What it is (as of November 2026):**

- `packages/mobile-client` in the Actual repo, present in v26.11.0. It is a
  [Capacitor](https://capacitorjs.com) wrapper: the existing web app running in a WebView. Its
  Android app ID is `org.actualbudget`; the iOS build's bundle ID is `com.actualbudget.actual`.
  The scaffolding was merged in July 2026
  ([PR #8387](https://github.com/actualbudget/actual/pull/8387)).
- Status is experimental. An iOS TestFlight beta is tracked in
  [issue #9440](https://github.com/actualbudget/actual/issues/9440), opened 5 November 2026,
  with App Store listing work still open. Android builds exist in the repo, but we found no
  Play Store plan and no published roadmap or release date.
- Price is not stated. Assume it will be free, like the rest of Actual.

**Our position:**

Longarm's way of working is beautiful UI and excellent UX. The official app is the web app in a
WebView, and going by the web experience on a phone today, we expect to do clearly better. The
official app is a reason to hold Accrual to that standard, not a reason to hesitate.

**What it means for Accrual:**

- Accrual competes on design and experience, not on being the way to get Actual on a phone.
  Store copy and screenshots lead with the native UI: category cards, quick add, widgets, and
  the platform's own look and feel.
- The quality bar is "obviously better than the official app within the first minute". Anything
  merely equal to a WebView is not worth shipping.
- Both apps run the same engine against the same server, so people can use them side by side.
  Accrual leaves reports, rules and imports to the official app, which matches the v1 non-goals
  in plan.md.
- The official app shows there is demand, and its beta testers are the people Accrual is for.
- Open question: the official app will probably be free. People do pay for a better-designed
  app over a free one, but check the $3–5 price against it before launch.

**What to do:**

- Done, without TestFlight: v26.11.0 was built from source and run on the iOS simulator and an
  Android emulator in November 2026. What it showed is in
  [`design/README.md`](../design/README.md). Try each new release the same way.
- Keep clear of its identity: its app IDs are `org.actualbudget` (Android) and
  `com.actualbudget.actual` (iOS), and its name is "Actual Budget".
  The naming rules below already cover this.
- Talk to the maintainers earlier than "before the public launch". They have their own app now,
  so it is better that they hear about Accrual from us, framed as a complement.
- Re-check issue #9440 at the start of each phase, so we always know what we are being
  compared with.

## Naming and branding

- Name: **Accrual**. Before launch, check App Store, Play Store, domain and trademark
  availability.
- Describe it as "for Actual Budget" only. Don't use Actual's name or logo as the app's identity,
  and include an "unofficial, not affiliated" note in the README and store listing.
- It may be worth contacting the Actual maintainers before the public launch. Goodwill there is
  the best marketing.

## Licensing and compliance

- Actual is MIT-licensed. Keep its copyright notice in `THIRD_PARTY_NOTICES.md` and in the app's
  About and Licenses screen.
- Privacy policy: "This app does not collect any data. It connects only to the server you
  configure." The App Store privacy label is "Data Not Collected".
- Encryption export compliance: the app uses standard HTTPS and OS crypto. Answer the App Store
  questionnaire accordingly.

## Launch checklist (later)

- [ ] Icon and domain
- [ ] Public GitHub repo with README, screenshots and contributing guide
- [ ] TestFlight and Play internal beta with 10–20 Actual users
- [ ] Store listings, privacy policy page and support email
- [ ] Announcement posts in the Actual community
