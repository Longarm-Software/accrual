# Design

Mockups for Accrual's phone UI. Everything here is drawn with made-up data
([`src/data.mjs`](src/data.mjs)); nothing comes from a real budget.

## Round 1: three directions

**Status:** waiting for a direction to be picked. Nothing here is final and none of it is built.

The same three screens in each direction, on the same fake household, so they can be compared
like for like: the **Plan** screen (the month's budget), a **Category** screen, and **Quick add**
for a transaction. Each board also shows Plan in the other colour scheme.

### A · Ledger

![A · Ledger](previews/round-1/ledger.png)

Paper, ink and serif figures. No cards: each category is a line on a page and the rule under it
is its progress bar. The calmest of the three, and the closest to "a private bank's statement".

- **For it:** the most restrained and the hardest to mistake for another finance app. Type does
  the work, so it costs little to draw and animates cheaply on any phone.
- **Against it:** the 2-pixel bars are the quietest progress signal of the three, so a month in
  trouble does not stand out much. A serif for figures is a strong taste; some will find it
  old-fashioned.

### B · Aurora

![B · Aurora](previews/round-1/aurora.png)

Dark first, frosted-glass tiles over a slow gradient, two categories to a row. Colour carries
the state: mint is funded, amber needs money, coral is overspent.

- **For it:** the densest (two categories per row) and the most "native 2026" look. State is
  readable from colour alone.
- **Against it:** the least original. Dark glass with a mint gradient is where most finance apps
  already are. Real-time blur is expensive on mid-range Android phones, and a two-column grid
  truncates long category names.

### C · Meter

![C · Meter](previews/round-1/meter.png)

Every row is a fuel gauge: the card fills with what is left and drains as you spend. Black,
white and one lime, with vermilion only when something is wrong. A hatched section shows money
a target still needs.

- **For it:** the fastest to read. One glance down the screen shows how full every category is,
  with no separate bar to look for. The same gauge is reused everywhere: the category screen
  marks where an even pace would be, and Quick add shows the bite a purchase takes before you
  save it. It is the one idea here another app does not already have.
- **Against it:** the loudest. Lime on black is a strong brand statement and less "calm" than
  the README promises. Text sits on top of a coloured fill, so contrast needs care.

### Recommendation

**Build on C · Meter's structure, and decide the tone separately.** The row-as-gauge is the part
worth owning: it is what makes the Plan screen readable in a second, which is the job the
official app's three-column table does worst. Its colour and type are a separate choice. If lime
feels too loud, the same structure works in Ledger's paper, ink and evergreen, and round 2 can
show that side by side.

## What the designs were planned from

- **The official app.** Upstream's mobile app (v26.11.0, a WebView around the web app) was built
  from source and run against the test server. Its budget screen stacks three warning banners
  and then shows three number columns per category; adding a transaction is a web form with a
  custom keypad. Each direction answers those screens directly: one number per category, one
  notice, and the amount first when adding.
- **[`docs/plan.md`](../docs/plan.md).** The Phase 1 screens: month switcher, To Budget, category
  groups, cards with progress and a single "Available" figure, a target status, covering
  overspending, quick add.
- **[`docs/business.md`](../docs/business.md).** The bar is "obviously better than the official
  app within the first minute".
- **How Actual works.** The figures shown are ones the engine already provides for each
  category: budgeted, spent and balance, plus To Budget for the month.

## Assumptions and things not yet checked

- **Target labels** ("$40 needed by 5 Dec", "64% of $10,000") rely on Actual's goal templates,
  which are an experimental feature a user has to turn on. Categories without one would show a
  plainer label. How common templates are among real users has not been checked.
- **Pace** ("$17.30 a day", "even pace") is our own sum from balance and days left. It is not an
  Actual feature.
- **Contrast and Dynamic Type have not been tested** in any direction. Small grey notes and text
  over Meter's fill are the likeliest failures.
- **iPhone frame only.** No Android-specific navigation, and no tablet layout.
- **Three screens each.** Not drawn yet: accounts and the register, moving money, covering
  overspending, assigning To Budget, server setup, empty and error states.
- **Fonts** are loaded from Google Fonts when a board is opened (Instrument Serif, Bricolage
  Grotesque, Schibsted Grotesk, Geist, Geist Mono; all under the Open Font License). None is
  bundled yet.

## Rebuilding

Node 20+, no dependencies. Needs Chrome for the PNGs.

```sh
node design/src/build.mjs              # writes design/boards/*.html (gitignored)
node design/src/export.mjs round-1     # renders them to design/previews/round-1/*.png
```

Open a board in a browser to see it at full size: `open design/boards/meter.html`.

| Path | Contents |
|---|---|
| `src/data.mjs` | The fake household every direction draws |
| `src/lib.mjs` | Phone frame, icons, money formatting, page shell |
| `src/ledger.mjs`, `src/aurora.mjs`, `src/meter.mjs` | One direction each: its styles and three screens |
| `previews/` | PNG exports, one folder per round |
