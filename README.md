# Accrual

A native mobile client for [Actual Budget](https://actualbudget.org), with a calm, card-based
envelope-budgeting UI. Built by Longarm Software.

> Unofficial. Not affiliated with or endorsed by the Actual Budget project.

## What it is

- A native iPhone and Android app that works with **your own** Actual server.
- The budget engine runs **on your phone**. It syncs directly with your server, so there is no
  Longarm backend and no account with us. Your financial data never touches our servers.
- A budget screen built for phones: category cards, progress bars, one "Available" pill per
  category, and plain-English labels like "Fully spent" or "$40 needed by Dec 5".

## Status

Phase 0 spike done: the engine runs on the iOS simulator and an Android emulator. Phase 1 is next. See [docs/spike-results.md](docs/spike-results.md)
and [docs/plan.md](docs/plan.md).

## Docs

| Doc | What's in it |
|---|---|
| [docs/plan.md](docs/plan.md) | Goals, phases, and the first spike |
| [docs/architecture.md](docs/architecture.md) | How the app talks to Actual, and the fallback plan |
| [docs/business.md](docs/business.md) | Open source plus paid App Store build, naming, licensing |
| [docs/spike-results.md](docs/spike-results.md) | What the Phase 0 spike found |
| [docs/decisions/](docs/decisions/) | Architecture decision records |

## What never goes in this repo

This repo is public. Never commit:

- Real budgets, exports, SQLite files, or screenshots and logs showing real transactions
- Server URLs, passwords, tokens, signing keys, certificates or provisioning profiles
- Personal notes or anything about a specific person's finances

Use generated fake data for fixtures and screenshots. Keep secrets in the OS keychain or CI
secrets, never in files.

Every commit is scanned for secrets with [gitleaks](https://github.com/gitleaks/gitleaks), locally
and in CI. After cloning, enable the hook once:

```sh
brew install gitleaks
git config core.hooksPath .githooks
```

## License

MIT. Bundled Actual Budget code keeps its own MIT notice (see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)).
