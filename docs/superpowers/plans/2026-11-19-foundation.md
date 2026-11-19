# Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Phase 0 spike into the real Accrual app: connect to an Actual server, pick a budget, watch it download, and land on a screen showing this month's Ready to budget.

**Architecture:** The spike's app is promoted to `app/` and keeps its engine bundle, shims, native SQL module and Node harness unchanged. The UI talks only to a typed engine adapter, which gains session-token sign-in and a staged open so the first download can show its progress (ADR 0002). Screens are Expo Router routes; a session context decides which one shows.

**Tech Stack:** Expo SDK 58, React Native 0.88 (Hermes), TypeScript 6, Expo Router, Reanimated 4, expo-secure-store, expo-blur, expo-linear-gradient, expo-font with Bricolage Grotesque and Geist, Jest with jest-expo and React Native Testing Library. Actual 26.11.0 (`@actual-app/core`).

This is plan 1 of 6. See the [Phase 1 roadmap](2026-11-19-phase-1-roadmap.md).

## Global Constraints

- **Fake data only.** This repo is public. No real budgets, server URLs, passwords, tokens or screenshots of real transactions, in code, tests, fixtures or commit messages. The test server is the throwaway one on port 5007. Never point anything at port 5006.
- **Never store the password.** Only the session token, and only in expo-secure-store. Neither may appear in logs, error messages or analytics.
- **All amounts are integer cents**, as in Actual. Convert to a string only when displaying.
- **The UI never imports the engine bundle.** UI code imports types from `src/engine/types.ts` and gets an `Engine` from context. Only `src/engine/adapter.ts` requires `engine/dist/loot-core.rn.js`.
- **Install Expo packages with `npx expo install <name>`**, never `npm install <name>`, so versions match SDK 58.
- **Expo APIs change between SDKs.** Before using one, read its page under `https://docs.expo.dev/versions/v58.0.0/`. The UI code in this plan was written without compiling it. If an Expo or Reanimated call does not match the v58 docs, follow the docs and keep the interfaces named in each task's **Produces** block.
- **Colours come from `src/theme/tokens.ts`.** No hex values in screens or components.
- **Xcode 27.0 cannot build expo-dev-launcher 58.0.21.** Build iOS with `DEVELOPER_DIR=/Applications/Xcode-26.6.0.app/Contents/Developer`.
- **Commits** are scanned by gitleaks (`git config core.hooksPath .githooks`). Never use `--no-verify`.
- **Run from `app/`** unless a step says otherwise. Before a task is done: `npm run typecheck` and `npm test` pass.

## File Structure

After this plan, with what each file is for:

```
app/                               (was spike/app)
  app.json                         Expo config: name Accrual, id software.longarm.accrual
  package.json                     scripts: test, typecheck, engine:build, engine:verify, sqlfn:*
  jest.setup.ts                    Reanimated and SecureStore mocks for Jest
  engine/                          unchanged from the spike, except entry.ts
    entry.ts                       + getSessionToken()
  harness/                         unchanged, except verify.ts (new checks)
  modules/accrual-sqlite-functions/   unchanged
  src/
    app/                           Expo Router routes (screens only, no logic)
      _layout.tsx                  fonts, theme, session provider, Stack
      index.tsx                    Home: Ready to budget; redirects when not ready
      connect.tsx                  server address, password, budget list
      opening.tsx                  first-download and reopen progress
    engine/
      types.ts                     Engine, RemoteBudget, BudgetMonth, OpenStage, EngineError
      adapter.ts                   createEngine(): the only file that touches the bundle
    session/
      serverUrl.ts                 normalizeServerUrl()
      storage.ts                   load/save/clear the saved session in SecureStore
      SessionProvider.tsx          context: status, engine, connect/choose/open/signOut
      fakeEngine.ts                an in-memory Engine for tests
    features/
      connect/errors.ts            engine error code -> sentence for a person
      opening/stageCopy.ts         OpenStage -> the line shown on the progress screen
    theme/
      tokens.ts                    Aurora colours (dark, light), radii, spacing, type
      contrast.ts                  WCAG contrast ratio
      useTheme.ts                  picks dark or light from the system
    ui/
      AuroraBackground.tsx         the gradient page background
      Glass.tsx                    frosted tile on iOS, solid tile on Android
      Text.tsx                     Body, Label, Display
      Money.tsx                    "$207" with a smaller ".62"
      Button.tsx                   primary (gradient) and quiet (glass)
      Spinner.tsx                  a ring that turns on the native thread
    lib/
      money.ts                     splitMoney(), formatMoney()
      month.ts                     currentMonth()
    dev/
      autorun.ts, digest.ts        the spike's scripted on-device run, kept for regression
tools/test-server/                 (was spike/server)
```

---

### Task 1: Promote the spike to `app/`

Moves the spike into place, renames the app, and removes the spike screen. Nothing new is built; the proof is that the existing checks still pass from the new paths.

**Files:**
- Move: `spike/app` → `app`, `spike/server` → `tools/test-server`
- Move: `app/src/autorun.ts` → `app/src/dev/autorun.ts`, `app/src/digest.ts` → `app/src/dev/digest.ts`
- Delete: `app/App.tsx`, `app/index.ts`, `spike/README.md`
- Create: `app/README.md`, `app/src/app/_layout.tsx`, `app/src/app/index.tsx`, `app/src/app/dev-check.tsx`
- Modify: `app/app.json`, `app/package.json`, `app/tsconfig.json`, `app/harness/verify.ts`, `app/harness/device-check.ts`, `.github/workflows/engine.yml`, `.gitignore`, `README.md`, `docs/spike-results.md`, `docs/plan.md`, `docs/architecture.md`, `docs/decisions/0001-engine-in-app.md`, `THIRD_PARTY_NOTICES.md`, `design/README.md`

**Interfaces:**
- Consumes: nothing.
- Produces: the app at `app/`; the test server at `tools/test-server/`; `npm run engine:verify` reading `../tools/test-server/.env`; Expo Router with routes in `app/src/app/`.

- [ ] **Step 1: Move the directories**

From the repo root:

```bash
git mv spike/app app
mkdir -p tools
git mv spike/server tools/test-server
mkdir -p app/src/dev
git mv app/src/autorun.ts app/src/dev/autorun.ts
git mv app/src/digest.ts app/src/dev/digest.ts
git rm -q app/App.tsx app/index.ts
```

Untracked build output does not move with `git mv`. Move it by hand so nothing has to be rebuilt:

```bash
for d in node_modules android ios .expo engine/dist engine/generated harness/data .env.local; do
  [ -e "spike/app/$d" ] && mkdir -p "app/$(dirname "$d")" && mv "spike/app/$d" "app/$d"
done
for d in node_modules data .env; do [ -e "spike/server/$d" ] && mv "spike/server/$d" "tools/test-server/$d"; done
```

- [ ] **Step 2: Fix the paths that moved**

Find every reference:

```bash
grep -rn "spike/" --include='*.md' --include='*.yml' --include='*.ts' --include='*.mjs' --include='*.json' --include='*.cjs' . \
  --exclude-dir=node_modules --exclude-dir=android --exclude-dir=ios --exclude-dir=boards
grep -rn "\.\./server" app/package.json app/harness
```

Change them as follows:

| File | Change |
|---|---|
| `app/package.json` | `"engine:verify": "tsx --env-file=../tools/test-server/.env harness/verify.ts"` |
| `app/harness/verify.ts` | `const serverDir = path.join(here, '..', '..', 'tools', 'test-server');` |
| `app/harness/device-check.ts` | `const serverDir = path.join(__dirname, '..', '..', 'tools', 'test-server');` and the usage comment's `--env-file=../tools/test-server/.env`; its import becomes `import { digest } from '../src/dev/digest';` |
| `app/src/dev/autorun.ts` | `import type { Engine } from '../engine/adapter';` (it was `./engine/adapter`) |
| `.github/workflows/engine.yml` | every `spike/server` → `tools/test-server`, every `spike/app` → `app` |
| `.gitignore` and `app/.gitignore` | any `spike/` prefix → the new path |
| Markdown files listed above | links and paths `spike/app/…` → `app/…`, `spike/server/…` → `tools/test-server/…`, `spike/README.md` → `app/README.md` |

- [ ] **Step 3: Write `app/README.md`**

Start from `spike/README.md` (`git show HEAD:spike/README.md`), then delete it with `git rm -q spike/README.md`. Keep its sections "Run the checks", "Run on a device", "Scripted run" and the physical-phone notes, with the paths updated and `cd spike/server` → `cd tools/test-server`, `cd ../app` → `cd ../../app`. Replace the title and first paragraph with:

```markdown
# Accrual app

The Expo app. It runs Actual's engine on the phone and syncs with the user's own Actual server.

**Fake data only.** Everything here runs against the throwaway server in `tools/test-server`
on port 5007. Never point it at a real server or a real budget.
```

Replace the "Layout" table with the File Structure block from this plan.

- [ ] **Step 4: Rename the app**

In `app/app.json` set:

```json
"name": "Accrual",
"slug": "accrual",
"scheme": "accrual",
"userInterfaceStyle": "automatic",
```

and `"bundleIdentifier": "software.longarm.accrual"`, `"package": "software.longarm.accrual"`. Add `"expo-router"` as the first entry of `"plugins"`.

In `app/package.json` set `"name": "accrual"` and `"main": "expo-router/entry"`.

- [ ] **Step 5: Install the router and regenerate the native projects**

```bash
cd app
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants
rm -rf ios android
```

`ios/` and `android/` are generated and gitignored; they are rebuilt with the new app id on the next `npx expo run:ios`.

- [ ] **Step 6: Add a placeholder route so the app starts**

`app/src/app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

`app/src/app/index.tsx`:

```tsx
import { Redirect } from 'expo-router';
import { Text, View } from 'react-native';

import { autorunConfig } from '../dev/autorun';

export default function Home() {
  // The scripted on-device check takes over when .env.local turns it on (app/README.md).
  if (autorunConfig) return <Redirect href="/dev-check" />;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Accrual</Text>
    </View>
  );
}
```

`app/src/app/dev-check.tsx` keeps the spike's scripted run reachable, since `App.tsx` is gone:

```tsx
// The scripted on-device engine check (src/dev/autorun.ts). Only reachable when
// .env.local sets EXPO_PUBLIC_SPIKE_AUTORUN=1; see "Scripted run" in app/README.md.
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text } from 'react-native';

import { autorun, autorunConfig } from '../dev/autorun';

export default function DevCheck() {
  const [log, setLog] = useState<string[]>([]);
  useEffect(() => {
    if (autorunConfig) void autorun(line => setLog(lines => [...lines, line]));
  }, []);
  if (!autorunConfig) return <Redirect href="/" />;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={{ padding: 16, paddingTop: 64, gap: 8 }}>
      {log.map((line, i) => (
        <Text key={i} selectable style={{ fontSize: 13 }}>{line}</Text>
      ))}
    </ScrollView>
  );
}
```

This screen is a developer tool, so it is the one place a literal colour is allowed.

- [ ] **Step 7: Run the checks from the new paths**

In one terminal:

```bash
cd tools/test-server && npm run server
```

In another:

```bash
cd tools/test-server && npm run seed
cd ../../app
npm run sqlfn:build && npm run sqlfn:test
npm run engine:build && npm run typecheck && npm run engine:verify
```

Expected: `183819 of 183819 comparisons identical`, no typecheck output, and `All checks passed`.

- [ ] **Step 8: Start the app on the simulator**

```bash
DEVELOPER_DIR=/Applications/Xcode-26.6.0.app/Contents/Developer npx expo run:ios
```

Expected: the app is called "Accrual" on the home screen. With no `.env.local` it shows the word "Accrual". With the `.env.local` from "Scripted run" it shows the check's log, ending in "waiting for the reference client".

- [ ] **Step 9: Commit**

```bash
cd ..
git add -A
git commit -m "Promote the spike to app/ and the test server to tools/test-server"
```

---

### Task 2: Jest, and money formatting

Sets up the test runner with the first real unit: splitting cents into the parts the design draws ("$207" large, ".62" small).

**Files:**
- Create: `app/jest.setup.ts`, `app/src/lib/money.ts`, `app/src/lib/money.test.ts`, `app/src/lib/month.ts`, `app/src/lib/month.test.ts`
- Modify: `app/package.json`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `splitMoney(cents: number): { sign: '' | '−'; dollars: string; cents: string }`
  - `formatMoney(cents: number): string`, for example `"−$1,204.55"`
  - `currentMonth(now?: Date): string`, for example `"2026-11"`
  - `npm test`

- [ ] **Step 1: Install the test tools**

```bash
npx expo install jest-expo jest @types/jest --dev
npm install --save-dev @testing-library/react-native
```

In `app/package.json` add:

```json
"scripts": { "test": "jest" },
"jest": {
  "preset": "jest-expo",
  "setupFilesAfterEnv": ["<rootDir>/jest.setup.ts"],
  "testPathIgnorePatterns": ["/node_modules/", "/modules/", "/harness/", "/engine/"]
}
```

Create `app/jest.setup.ts` with one line for now:

```ts
// Shared Jest setup. Mocks for native modules are added here as tasks need them.
export {};
```

- [ ] **Step 2: Write the failing tests**

`app/src/lib/money.test.ts`:

```ts
import { formatMoney, splitMoney } from './money';

describe('splitMoney', () => {
  it('splits dollars and cents', () => {
    expect(splitMoney(20762)).toEqual({ sign: '', dollars: '$207', cents: '62' });
  });
  it('groups thousands', () => {
    expect(splitMoney(4825000)).toEqual({ sign: '', dollars: '$48,250', cents: '00' });
  });
  it('uses a real minus sign for negative amounts', () => {
    expect(splitMoney(-120455)).toEqual({ sign: '−', dollars: '$1,204', cents: '55' });
  });
  it('pads cents', () => {
    expect(splitMoney(5)).toEqual({ sign: '', dollars: '$0', cents: '05' });
  });
  it('treats negative zero as zero', () => {
    expect(splitMoney(-0).sign).toBe('');
  });
});

describe('formatMoney', () => {
  it('joins the parts', () => {
    expect(formatMoney(-120455)).toBe('−$1,204.55');
    expect(formatMoney(31200)).toBe('$312.00');
  });
});
```

`app/src/lib/month.test.ts`:

```ts
import { currentMonth } from './month';

it('formats a date as YYYY-MM in local time', () => {
  expect(currentMonth(new Date(2026, 10, 19))).toBe('2026-11');
  expect(currentMonth(new Date(2027, 0, 1))).toBe('2027-01');
});
```

- [ ] **Step 3: Run them and watch them fail**

Run: `npm test`
Expected: FAIL, `Cannot find module './money'` and `Cannot find module './month'`.

- [ ] **Step 4: Implement**

`app/src/lib/money.ts`:

```ts
// Amounts are integer cents everywhere, as in Actual. These turn them into text.

export type MoneyParts = { sign: '' | '−'; dollars: string; cents: string };

/** The parts the design sets at different sizes: "−", "$1,204" and "55". */
export function splitMoney(cents: number): MoneyParts {
  const abs = Math.abs(Math.round(cents));
  return {
    sign: cents < 0 && abs !== 0 ? '−' : '',
    dollars: `$${Math.floor(abs / 100).toLocaleString('en-US')}`,
    cents: String(abs % 100).padStart(2, '0'),
  };
}

export function formatMoney(cents: number): string {
  const { sign, dollars, cents: c } = splitMoney(cents);
  return `${sign}${dollars}.${c}`;
}
```

`app/src/lib/month.ts`:

```ts
/** The month Actual calls "YYYY-MM", in the phone's own time zone. */
export function currentMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
```

- [ ] **Step 5: Run them and watch them pass**

Run: `npm test`
Expected: PASS, 7 tests.

- [ ] **Step 6: Add the tests to CI**

In `.github/workflows/engine.yml`, after the "Typecheck" step, add:

```yaml
      - name: Unit tests
        working-directory: app
        run: npm test
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Add Jest, money formatting and the current month"
```

---

### Task 3: Engine adapter: session tokens, staged open, coded errors

The adapter learns to sign in with a saved token, to open a budget step by step, and to fail with a code the UI can turn into a sentence. Tested in the Node harness against the real test server.

**Files:**
- Create: `app/src/engine/types.ts`
- Modify: `app/engine/entry.ts`, `app/src/engine/adapter.ts`, `app/harness/verify.ts`, `app/src/dev/autorun.ts`

**Interfaces:**
- Consumes: the engine bundle built by `npm run engine:build`.
- Produces (all exported from `src/engine/types.ts`, and re-exported from `adapter.ts`):

```ts
export type RemoteBudget = { name: string; groupId: string; cloudFileId: string; encrypted: boolean };
export type MonthCategory = { id: string; name: string; budgeted: number; spent: number; balance: number; carryover: boolean };
export type MonthGroup = { id: string; name: string; is_income: boolean; categories: MonthCategory[] };
export type BudgetMonth = {
  month: string; toBudget: number; totalBudgeted: number; totalSpent: number;
  totalIncome: number; totalBalance: number; categoryGroups: MonthGroup[];
};
export type OpenStage = 'downloading' | 'opening' | 'syncing';
export type Auth = { password: string } | { sessionToken: string };
export class EngineError extends Error { readonly code: string; }
export type Engine = {
  sessionToken(): Promise<string>;
  listBudgets(): Promise<RemoteBudget[]>;
  openBudget(budget: RemoteBudget, onStage?: (stage: OpenStage) => void | Promise<void>): Promise<void>;
  getMonth(month: string): Promise<BudgetMonth>;
  sync(): Promise<void>;
  close(): Promise<void>;
  // kept from the spike, used by the harness and the scripted run:
  getAccounts(): Promise<{ id: string; name: string; offbudget: boolean; closed: boolean }[]>;
  getTransactions(accountId: string, startDate: string, endDate: string): Promise<any[]>;
  searchTransactions(text: string): Promise<{ id: string; date: string; amount: number; notes: string | null }[]>;
  addTransaction(accountId: string, transaction: NewTransaction): Promise<void>;
};
export function createEngine(config: { serverURL: string; dataDir?: string } & Auth): Promise<Engine>;
```

Error codes the UI relies on: `invalid-password`, `network-failure`, `token-expired`. Any other code is shown as a generic failure.

- [ ] **Step 1: Write the failing harness checks**

There is one engine per process: `createEngine` signs in again and replaces whatever session was there. So these checks go **before** the line `const engine = await timed('init + sign in', …)`, which then signs in afresh for the rest of the run. Add, just above that line:

```ts
  // Session tokens: the app stores this, never the password.
  const first = await createEngine({ serverURL, password, dataDir });
  const token = await first.sessionToken();
  check('sign-in yields a session token', typeof token === 'string' && token.length > 10);
  const byToken = await createEngine({ serverURL, sessionToken: token, dataDir });
  check('a saved token signs in without the password', (await byToken.listBudgets()).length === budgetsExpected);

  // Errors carry a code the UI can explain.
  const failure = await createEngine({ serverURL, password: 'not-the-password', dataDir }).catch((e: any) => e);
  check('a wrong password fails with code invalid-password', failure?.code === 'invalid-password', `(${failure?.code})`);
  const expired = await createEngine({ serverURL, sessionToken: 'not-a-token', dataDir }).catch((e: any) => e);
  check('a bad token fails with code token-expired', expired?.code === 'token-expired', `(${expired?.code})`);
```

Define `const budgetsExpected = 2;` beside the other constants at the top (the seeder makes "Spike Small" and "Spike Large").

These four checks also prove something the app needs: a failed sign-in followed by a good one in the same process. That is exactly what happens when someone mistypes their password and tries again.

Change both `engine.openBudget(…groupId)` calls in the full run to pass the budget and record the stages. For the small budget:

```ts
  const stages: string[] = [];
  await timed('small: download + open', () => engine.openBudget(small, s => void stages.push(s)));
  check('first open reports downloading, opening, syncing', stages.join(' ') === 'downloading opening syncing', `(${stages.join(' ')})`);
```

For the large budget: `engine.openBudget(large)`. In the `cold` branch: 

```ts
    const stages: string[] = [];
    await timed('large: open local copy + sync', () => engine.openBudget(large, s => void stages.push(s)));
    check('reopening skips the download', stages.join(' ') === 'opening syncing', `(${stages.join(' ')})`);
```

- [ ] **Step 2: Run the harness and watch it fail**

Run: `npm run engine:verify` (test server running)
Expected: FAIL. TypeScript is not checked by `tsx`, so the first failure is at run time: `engine.sessionToken is not a function`.

- [ ] **Step 3: Expose the token from the bundle**

Replace `app/engine/entry.ts` with:

```ts
// Entry point of the pre-built engine bundle (see build.mjs).
import './shims/globals';

import * as asyncStorage from './shims/async-storage';

export { init, lib } from '@actual-app/core/server/main';
export { load as loadGlobalStore } from './shims/async-storage';
export { defaultDocumentDir } from './shims/fs';

/** The session token loot-core holds after signing in. The app keeps it in the Keychain. */
export const getSessionToken = (): Promise<string | undefined> => asyncStorage.getItem('user-token');
```

- [ ] **Step 4: Write the types**

Create `app/src/engine/types.ts` with exactly the types in this task's **Produces** block, plus:

```ts
export type NewTransaction = {
  date: string; // YYYY-MM-DD
  amount: number;
  payee_name?: string;
  category?: string;
  notes?: string;
  cleared?: boolean;
};

/** An engine failure with a short code the UI can turn into a sentence. */
export class EngineError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'EngineError';
    this.code = code;
  }
}
```

Write `EngineError` as this class (not the one-line declaration in the Produces block, which only shows its shape).

- [ ] **Step 5: Rewrite the adapter**

Replace `app/src/engine/adapter.ts` with:

```ts
// The engine adapter: the only file that touches Actual's engine (loot-core).
// UI code imports types from ./types and receives an Engine from context.
// All amounts are integers in cents, as in Actual.
//
// There is one engine per process. Calling createEngine again signs in afresh and
// replaces the previous session; an Engine returned earlier must not be used after that.
import { EngineError } from './types';
import type { Auth, Engine, RemoteBudget } from './types';

export * from './types';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const core = require('../../engine/dist/loot-core.rn.js') as {
  init(config: { dataDir: string; serverURL: string; password?: string; sessionToken?: string }): Promise<Lib>;
  defaultDocumentDir(): string;
  getSessionToken(): Promise<string | undefined>;
};
type Lib = { send(name: string, args?: unknown): Promise<any>; q(table: string): any };

const fail = (code: unknown, message: string) =>
  new EngineError(typeof code === 'string' && code ? code : 'internal', message);

export async function createEngine(config: { serverURL: string; dataDir?: string } & Auth): Promise<Engine> {
  let lib: Lib;
  try {
    lib = await core.init({ dataDir: config.dataDir ?? core.defaultDocumentDir(), ...config });
  } catch (e: any) {
    // loot-core attaches a slug: 'invalid-password', 'network-failure', 'token-expired'.
    throw fail(e?.code, 'Could not sign in');
  }

  return {
    async sessionToken() {
      const token = await core.getSessionToken();
      if (!token) throw fail('token-expired', 'Not signed in');
      return token;
    },
    async listBudgets() {
      const files = await lib.send('get-remote-files');
      if (!files) throw fail('network-failure', 'Could not list budgets');
      return files
        .filter((f: any) => !f.deleted)
        .map((f: any): RemoteBudget => ({
          name: f.name,
          groupId: f.groupId,
          cloudFileId: f.fileId,
          encrypted: Boolean(f.encryptKeyId),
        }));
    },
    // Opens in steps so a screen can say which one is running (ADR 0002). `onStage` is
    // awaited, which lets the caller paint a frame before the next step blocks the thread.
    async openBudget(budget, onStage = () => {}) {
      const local = (await lib.send('get-budgets')).find((b: any) => b.groupId === budget.groupId);
      let id: string | undefined = local?.id;
      if (!id) {
        await onStage('downloading');
        const downloaded = await lib.send('download-budget', { cloudFileId: budget.cloudFileId });
        if (downloaded?.error) throw fail(downloaded.error.reason, 'Could not download the budget');
        id = downloaded.id;
      }
      await onStage('opening');
      const loaded = await lib.send('load-budget', { id });
      if (loaded?.error) throw fail(loaded.error, 'Could not open the budget');
      await onStage('syncing');
      const synced = await lib.send('sync-budget');
      if (synced?.error) throw fail(synced.error.reason, 'Could not sync the budget');
    },
    getMonth: month => lib.send('api/budget-month', { month }),
    getAccounts: () => lib.send('api/accounts-get'),
    getTransactions: (accountId, startDate, endDate) =>
      lib.send('api/transactions-get', { accountId, startDate, endDate }),
    async searchTransactions(text) {
      const like = `%${text}%`;
      const query = lib
        .q('transactions')
        .filter({ $or: [{ 'payee.name': { $like: like } }, { notes: { $like: like } }] })
        .select(['id', 'date', 'amount', 'notes'])
        .orderBy({ date: 'desc' });
      return (await lib.send('api/query', { query: query.serialize() })).data;
    },
    async addTransaction(accountId, transaction) {
      await lib.send('api/transactions-add', { accountId, transactions: [transaction] });
    },
    sync: () => lib.send('api/sync'),
    close: () => lib.send('close-budget'),
  };
}
```

In `app/src/dev/autorun.ts`, change the two `engine.openBudget(x.groupId)` calls to `engine.openBudget(x)` and the cold-start call the same way.

- [ ] **Step 6: Rebuild and run the harness**

Run: `npm run engine:build && npm run typecheck && npm run engine:verify`
Expected: no typecheck output, every line `PASS`, including the five new checks and both `36 months identical` and `4 months identical` lines, then `All checks passed`. Then `npm run engine:verify -- cold`: `PASS  reopening skips the download`.

If a "months identical" check now fails, the staged open differs from `api/download-budget`. Read `handlers['api/download-budget']` in `node_modules/@actual-app/core/src/server/api.ts` and make `openBudget` perform the same handler calls in the same order.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Engine adapter: session tokens, staged open and coded errors"
```

---

### Task 4: Theme tokens, with contrast enforced

Aurora's colours as code, and a test that fails if a text colour drops below WCAG AA or drifts from the design files.

**Files:**
- Create: `app/src/theme/tokens.ts`, `app/src/theme/contrast.ts`, `app/src/theme/useTheme.ts`, `app/src/theme/tokens.test.ts`

**Interfaces:**
- Consumes: `design/src/contrast.mjs` (read as text by the test).
- Produces:
  - `type Theme` and `themes: { dark: Theme; light: Theme }` with `theme.color.{ink, mute, ok, goal, need, over, zero, page, pageGlow, glass, solid, edge, track, sheet, onAccent}`, `theme.gradient: [string, string]`, `theme.isDark: boolean`
  - `radius`, `space`, `font`, `type` constants
  - `contrastRatio(a: string, b: string): number` for `#RRGGBB` strings
  - `useTheme(): Theme`

- [ ] **Step 1: Write the failing test**

`app/src/theme/tokens.test.ts`:

```ts
import fs from 'node:fs';
import path from 'node:path';

import { contrastRatio } from './contrast';
import { themes } from './tokens';

const textColours = ['ink', 'mute', 'ok', 'goal', 'need', 'over', 'zero'] as const;

describe.each(['dark', 'light'] as const)('%s theme', name => {
  const theme = themes[name];

  it.each(textColours)('%s passes WCAG AA on a tile', token => {
    // `solid` is the tile colour where there is no blur (Android), which is the flat worst case.
    expect(contrastRatio(theme.color[token], theme.color.solid)).toBeGreaterThanOrEqual(4.5);
  });

  it('uses the colours the design was checked with', () => {
    const design = fs.readFileSync(path.join(__dirname, '../../../design/src/contrast.mjs'), 'utf8');
    for (const token of textColours) expect(design).toContain(theme.color[token]);
  });
});

it('contrastRatio matches known values', () => {
  expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
  expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 1);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- tokens`
Expected: FAIL, `Cannot find module './contrast'`.

- [ ] **Step 3: Implement**

`app/src/theme/contrast.ts`:

```ts
// WCAG 2 contrast ratio between two #RRGGBB colours.
const channels = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
const luminance = (hex: string) => {
  const [r, g, b] = channels(hex).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
```

`app/src/theme/tokens.ts`:

```ts
// Aurora's design tokens. The text colours are the contrast-checked set from
// design/src/contrast.mjs; tokens.test.ts fails if they drift or stop passing WCAG AA.

export type Theme = {
  isDark: boolean;
  color: {
    ink: string; mute: string;
    ok: string; goal: string; need: string; over: string; zero: string;
    page: string; pageGlow: string;
    glass: string; solid: string; edge: string; track: string; sheet: string;
    onAccent: string;
  };
  /** Mint to blue: buttons, progress, the logo. */
  gradient: [string, string];
};

export const themes: { dark: Theme; light: Theme } = {
  dark: {
    isDark: true,
    color: {
      ink: '#F3F6F8', mute: '#A9B3BF',
      ok: '#62EFC2', goal: '#5CCBF4', need: '#FFC95C', over: '#FF9A8D', zero: '#A2ACB8',
      page: '#07090C', pageGlow: '#0F3231',
      glass: 'rgba(255,255,255,0.065)', solid: '#151B20', edge: 'rgba(255,255,255,0.11)',
      track: 'rgba(255,255,255,0.10)', sheet: '#12171C',
      onAccent: '#04221B',
    },
    gradient: ['#62EFC2', '#5CCBF4'],
  },
  light: {
    isDark: false,
    color: {
      ink: '#0D1418', mute: '#5A6675',
      ok: '#067A5B', goal: '#0B6BA8', need: '#8F5B00', over: '#C0341F', zero: '#677381',
      page: '#F1F4F6', pageGlow: '#CFF3E6',
      glass: 'rgba(255,255,255,0.72)', solid: '#FFFFFF', edge: 'rgba(255,255,255,0.95)',
      track: 'rgba(13,20,24,0.08)', sheet: '#FAFCFD',
      onAccent: '#FFFFFF',
    },
    gradient: ['#067A5B', '#0B6BA8'],
  },
};

export const radius = { tile: 22, card: 30, field: 20, pill: 99 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Font family names as registered in src/app/_layout.tsx. */
export const font = {
  display: 'BricolageGrotesque_600SemiBold',
  body: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
} as const;

export const type = {
  display: { fontFamily: font.display, fontSize: 58, letterSpacing: -2 },
  title: { fontFamily: font.display, fontSize: 36, letterSpacing: -1.2 },
  heading: { fontFamily: font.semibold, fontSize: 16 },
  body: { fontFamily: font.body, fontSize: 15.5, lineHeight: 22 },
  label: { fontFamily: font.medium, fontSize: 13 },
} as const;
```

`app/src/theme/useTheme.ts`:

```ts
import { useColorScheme } from 'react-native';

import { themes } from './tokens';
import type { Theme } from './tokens';

/** Aurora is dark first: dark unless the system is explicitly light. */
export function useTheme(): Theme {
  return useColorScheme() === 'light' ? themes.light : themes.dark;
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npm test -- tokens`
Expected: PASS, 17 tests.

If a contrast case fails, do not change the threshold. Change the colour in `design/src/contrast.mjs` and here together, and rerun `node design/src/contrast.mjs` from the repo root.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Aurora theme tokens, with contrast and design parity tested"
```

---

### Task 5: Fonts and base components

The handful of components every screen in this plan uses.

**Files:**
- Create: `app/src/ui/AuroraBackground.tsx`, `app/src/ui/Glass.tsx`, `app/src/ui/Text.tsx`, `app/src/ui/Money.tsx`, `app/src/ui/Button.tsx`, `app/src/ui/Spinner.tsx`, `app/src/ui/Money.test.tsx`, `app/src/ui/Button.test.tsx`
- Modify: `app/src/app/_layout.tsx`, `app/jest.setup.ts`

**Interfaces:**
- Consumes: `useTheme`, `radius`, `space`, `type`, `font` from Task 4; `splitMoney` from Task 2.
- Produces:
  - `<AuroraBackground>{children}</AuroraBackground>`: fills the screen
  - `<Glass style? radius?>{children}</Glass>`
  - `<Body>`, `<Label>`, `<Display>`, `<Title>`: text in theme colours; all accept `style` and `color`
  - `<Money cents size? color? testID? />`
  - `<Button title onPress variant? disabled? testID? />`, `variant: 'primary' | 'quiet'`
  - `<Spinner size? />`

- [ ] **Step 1: Install**

```bash
npx expo install expo-font expo-splash-screen expo-blur expo-linear-gradient react-native-reanimated react-native-worklets
npx expo install @expo-google-fonts/bricolage-grotesque @expo-google-fonts/geist
```

Check the Reanimated page for SDK 58 for any Babel plugin step, and do what it says.

Add to `app/jest.setup.ts`:

```ts
// Reanimated ships its own Jest mock.
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
```

- [ ] **Step 2: Write the failing tests**

`app/src/ui/Money.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';

import { Money } from './Money';

it('shows dollars and cents as separate pieces', () => {
  render(<Money cents={20762} />);
  expect(screen.getByText('$207')).toBeTruthy();
  expect(screen.getByText('.62')).toBeTruthy();
});

it('reads as one amount to a screen reader', () => {
  render(<Money cents={-120455} testID="m" />);
  expect(screen.getByTestId('m').props.accessibilityLabel).toBe('−$1,204.55');
});
```

`app/src/ui/Button.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from './Button';

it('calls onPress', () => {
  const onPress = jest.fn();
  render(<Button title="Connect" onPress={onPress} />);
  fireEvent.press(screen.getByRole('button', { name: 'Connect' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

it('does nothing when disabled', () => {
  const onPress = jest.fn();
  render(<Button title="Connect" onPress={onPress} disabled />);
  fireEvent.press(screen.getByRole('button', { name: 'Connect' }));
  expect(onPress).not.toHaveBeenCalled();
});
```

- [ ] **Step 3: Run them and watch them fail**

Run: `npm test -- ui`
Expected: FAIL, `Cannot find module './Money'` and `'./Button'`.

- [ ] **Step 4: Implement the components**

`app/src/ui/Text.tsx`:

```tsx
import { Text as RNText } from 'react-native';
import type { TextProps } from 'react-native';

import { type } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

type Props = TextProps & { color?: string };
const make = (base: object, tone: 'ink' | 'mute') =>
  function Styled({ style, color, ...rest }: Props) {
    const theme = useTheme();
    return <RNText {...rest} style={[base, { color: color ?? theme.color[tone] }, style]} />;
  };

export const Body = make(type.body, 'ink');
export const Label = make(type.label, 'mute');
export const Display = make(type.display, 'ink');
export const Title = make(type.title, 'ink');
```

`app/src/ui/Money.tsx`:

```tsx
import { Text } from 'react-native';

import { formatMoney, splitMoney } from '../lib/money';
import { font } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

type Props = { cents: number; size?: number; color?: string; testID?: string };

/** "$207" with a smaller, quieter ".62", as every Aurora screen sets amounts. */
export function Money({ cents, size = 27, color, testID }: Props) {
  const theme = useTheme();
  const parts = splitMoney(cents);
  const ink = color ?? theme.color.ink;
  return (
    <Text
      testID={testID}
      accessible
      accessibilityLabel={formatMoney(cents)}
      style={{ fontFamily: font.display, fontSize: size, letterSpacing: -size * 0.035, color: ink, fontVariant: ['tabular-nums'] }}
    >
      <Text>{parts.sign + parts.dollars}</Text>
      <Text style={{ fontSize: size * 0.5, opacity: 0.6 }}>{'.' + parts.cents}</Text>
    </Text>
  );
}
```

Note: the first inner `Text` renders `"$207"` for a positive amount, which is what the test looks for.

`app/src/ui/AuroraBackground.tsx`:

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/useTheme';

/** The page: a dark (or pale) field with one soft glow from the top-left corner. */
export function AuroraBackground({ children }: { children: ReactNode }) {
  const { color } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: color.page }}>
      <LinearGradient
        colors={[color.pageGlow, color.page]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 0.6 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}
```

`app/src/ui/Glass.tsx`:

```tsx
import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { radius as radii } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

type Props = { children: ReactNode; style?: StyleProp<ViewStyle>; radius?: number };

// Frosted on iOS. Solid on Android, where live blur is costly on mid-range phones
// (design/README.md, "Aurora under stress"). The layout is the same either way.
export function Glass({ children, style, radius = radii.tile }: Props) {
  const theme = useTheme();
  const frosted = Platform.OS === 'ios';
  return (
    <View
      style={[
        { borderRadius: radius, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: theme.color.edge },
        { backgroundColor: frosted ? theme.color.glass : theme.color.solid },
        style,
      ]}
    >
      {frosted && <BlurView intensity={24} tint={theme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
      {children}
    </View>
  );
}
```

`app/src/ui/Button.tsx`:

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text } from 'react-native';

import { font, radius } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

type Props = { title: string; onPress: () => void; variant?: 'primary' | 'quiet'; disabled?: boolean; testID?: string };

export function Button({ title, onPress, variant = 'primary', disabled = false, testID }: Props) {
  const theme = useTheme();
  const primary = variant === 'primary';
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        !primary && { backgroundColor: theme.color.glass, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.color.edge },
        { opacity: disabled ? 0.4 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      {primary && <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}
      <Text style={{ fontFamily: font.semibold, fontSize: 16, color: primary ? theme.color.onAccent : theme.color.ink }}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { height: 56, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
```

`app/src/ui/Spinner.tsx`:

```tsx
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useTheme } from '../theme/useTheme';

// The rotation runs on the native UI thread, so it keeps turning while the engine
// blocks the JavaScript thread during a first download (ADR 0002).
export function Spinner({ size = 64 }: { size?: number }) {
  const theme = useTheme();
  const turn = useSharedValue(0);
  useEffect(() => {
    turn.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.linear }), -1, false);
  }, [turn]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 360}deg` }] }));
  const ring = { width: size, height: size, borderRadius: size / 2, borderWidth: size / 9 };
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Working">
      <View style={[ring, { borderColor: theme.color.track }]} />
      <Animated.View
        style={[ring, { position: 'absolute', borderColor: 'transparent', borderTopColor: theme.gradient[0], borderRightColor: theme.gradient[1] }, style]}
      />
    </View>
  );
}
```

- [ ] **Step 5: Load the fonts in the root layout**

Replace `app/src/app/_layout.tsx` with:

```tsx
import { BricolageGrotesque_600SemiBold } from '@expo-google-fonts/bricolage-grotesque';
import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold } from '@expo-google-fonts/geist';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({ BricolageGrotesque_600SemiBold, Geist_400Regular, Geist_500Medium, Geist_600SemiBold });
  useEffect(() => {
    if (loaded) void SplashScreen.hideAsync();
  }, [loaded]);
  if (!loaded) return null;
  return <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
}
```

The export names of the font packages follow the pattern `<Family>_<weight><Name>`. If an import does not resolve, open the package's `index.d.ts` and use the name it exports for that weight, then make `font` in `tokens.ts` match.

- [ ] **Step 6: Run the tests and typecheck**

Run: `npm test && npm run typecheck`
Expected: all tests PASS, no typecheck output.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Fonts and base components: background, glass, text, money, button, spinner"
```

---

### Task 6: Session: server address, storage, and the provider

Everything about being connected, with no screen attached: validating a server address, keeping the session in the Keychain, and one context that owns the engine.

**Files:**
- Create: `app/src/session/serverUrl.ts`, `app/src/session/serverUrl.test.ts`, `app/src/session/storage.ts`, `app/src/session/storage.test.ts`, `app/src/session/fakeEngine.ts`, `app/src/session/SessionProvider.tsx`, `app/src/session/SessionProvider.test.tsx`
- Modify: `app/jest.setup.ts`, `app/src/app/_layout.tsx`

**Interfaces:**
- Consumes: `Engine`, `RemoteBudget`, `OpenStage`, `EngineError`, `Auth` from `src/engine/types.ts`.
- Produces:

```ts
// serverUrl.ts
export type ServerUrlResult = { ok: true; url: string } | { ok: false; reason: 'empty' | 'invalid' | 'insecure' };
export function normalizeServerUrl(input: string, options?: { allowInsecure?: boolean }): ServerUrlResult;

// storage.ts
export type SavedSession = { serverURL: string; sessionToken: string; budget: RemoteBudget | null };
export function loadSession(): Promise<SavedSession | null>;
export function saveSession(session: SavedSession): Promise<void>;
export function clearSession(): Promise<void>;

// fakeEngine.ts
export function fakeEngine(overrides?: Partial<Engine>): Engine;
export const fakeBudgets: RemoteBudget[]; // Household, and Side business (encrypted)

// SessionProvider.tsx
export type SessionStatus = 'loading' | 'signedOut' | 'needsBudget' | 'closed' | 'open';
export type Session = {
  status: SessionStatus;
  saved: SavedSession | null;
  engine: Engine | null;
  connect(serverURL: string, password: string): Promise<RemoteBudget[]>;
  chooseBudget(budget: RemoteBudget): Promise<void>;
  open(onStage?: (stage: OpenStage) => void | Promise<void>): Promise<void>;
  signOut(): Promise<void>;
};
export function SessionProvider(props: { children: ReactNode; create?: CreateEngine }): JSX.Element;
export function useSession(): Session;
export type CreateEngine = (config: { serverURL: string } & Auth) => Promise<Engine>;
```

`status` meanings: `signedOut` has no saved token; `needsBudget` is signed in with no budget chosen; `closed` has a token and a budget but the budget is not open in this launch; `open` is ready to read.

- [ ] **Step 1: Install and mock SecureStore**

```bash
npx expo install expo-secure-store
```

Add to `app/jest.setup.ts`:

```ts
// An in-memory stand-in for the Keychain.
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => void store.set(key, value)),
    deleteItemAsync: jest.fn(async (key: string) => void store.delete(key)),
    __reset: () => store.clear(),
  };
});
```

- [ ] **Step 2: Write the failing tests for the server address**

`app/src/session/serverUrl.test.ts`:

```ts
import { normalizeServerUrl } from './serverUrl';

it('adds https when no scheme is given', () => {
  expect(normalizeServerUrl('budget.example.com')).toEqual({ ok: true, url: 'https://budget.example.com' });
});
it('trims spaces and trailing slashes', () => {
  expect(normalizeServerUrl('  https://budget.example.com/  ')).toEqual({ ok: true, url: 'https://budget.example.com' });
});
it('keeps a port and a path', () => {
  expect(normalizeServerUrl('https://example.com:8443/actual/')).toEqual({ ok: true, url: 'https://example.com:8443/actual' });
});
it('refuses plain http unless allowed', () => {
  expect(normalizeServerUrl('http://192.168.1.20:5006')).toEqual({ ok: false, reason: 'insecure' });
  expect(normalizeServerUrl('http://192.168.1.20:5006', { allowInsecure: true })).toEqual({ ok: true, url: 'http://192.168.1.20:5006' });
});
it('refuses empty and malformed input', () => {
  expect(normalizeServerUrl('   ')).toEqual({ ok: false, reason: 'empty' });
  expect(normalizeServerUrl('ftp://example.com')).toEqual({ ok: false, reason: 'invalid' });
  expect(normalizeServerUrl('https://')).toEqual({ ok: false, reason: 'invalid' });
});
```

Run: `npm test -- serverUrl`
Expected: FAIL, `Cannot find module './serverUrl'`.

- [ ] **Step 3: Implement the server address**

`app/src/session/serverUrl.ts`:

```ts
export type ServerUrlResult = { ok: true; url: string } | { ok: false; reason: 'empty' | 'invalid' | 'insecure' };

/**
 * Turns what someone typed into the address loot-core wants. HTTPS by default; plain HTTP
 * only when the person has turned on the "I know what I'm doing" switch (architecture.md).
 */
export function normalizeServerUrl(input: string, { allowInsecure = false } = {}): ServerUrlResult {
  const typed = input.trim();
  if (!typed) return { ok: false, reason: 'empty' };
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(typed) ? typed : `https://${typed}`;
  const match = /^(https?):\/\/([^/\s?#]+)([^\s?#]*)$/i.exec(withScheme);
  if (!match) return { ok: false, reason: 'invalid' };
  const [, scheme, host, path] = match;
  if (scheme.toLowerCase() === 'http' && !allowInsecure) return { ok: false, reason: 'insecure' };
  return { ok: true, url: `${scheme.toLowerCase()}://${host.toLowerCase()}${path.replace(/\/+$/, '')}` };
}
```

Run: `npm test -- serverUrl`
Expected: PASS, 5 tests.

- [ ] **Step 4: Write the failing tests for storage**

`app/src/session/storage.test.ts`:

```ts
import * as SecureStore from 'expo-secure-store';

import { clearSession, loadSession, saveSession } from './storage';

const session = {
  serverURL: 'https://budget.example.com',
  sessionToken: 'token-for-tests',
  budget: { name: 'Household', groupId: 'g1', cloudFileId: 'c1', encrypted: false },
};

beforeEach(() => (SecureStore as any).__reset());

it('returns null when nothing is saved', async () => {
  expect(await loadSession()).toBeNull();
});
it('saves and loads a session', async () => {
  await saveSession(session);
  expect(await loadSession()).toEqual(session);
});
it('clears it', async () => {
  await saveSession(session);
  await clearSession();
  expect(await loadSession()).toBeNull();
});
it('treats damaged data as signed out', async () => {
  await SecureStore.setItemAsync('accrual.session', '{not json');
  expect(await loadSession()).toBeNull();
});
```

Run: `npm test -- storage`
Expected: FAIL, `Cannot find module './storage'`.

- [ ] **Step 5: Implement storage**

`app/src/session/storage.ts`:

```ts
// The saved session lives in the Keychain (iOS) or Keystore (Android) and nowhere else.
// It holds a session token, never the password.
import * as SecureStore from 'expo-secure-store';

import type { RemoteBudget } from '../engine/types';

export type SavedSession = { serverURL: string; sessionToken: string; budget: RemoteBudget | null };

const KEY = 'accrual.session';

export async function loadSession(): Promise<SavedSession | null> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return typeof value?.serverURL === 'string' && typeof value?.sessionToken === 'string'
      ? { serverURL: value.serverURL, sessionToken: value.sessionToken, budget: value.budget ?? null }
      : null;
  } catch {
    return null;
  }
}

export const saveSession = (session: SavedSession) => SecureStore.setItemAsync(KEY, JSON.stringify(session));
export const clearSession = () => SecureStore.deleteItemAsync(KEY);
```

Run: `npm test -- storage`
Expected: PASS, 4 tests.

- [ ] **Step 6: Write the fake engine**

`app/src/session/fakeEngine.ts`:

```ts
// An in-memory Engine for component tests. Fake data only.
import type { Engine, RemoteBudget } from '../engine/types';

export const fakeBudgets: RemoteBudget[] = [
  { name: 'Household', groupId: 'g-household', cloudFileId: 'c-household', encrypted: false },
  { name: 'Side business', groupId: 'g-side', cloudFileId: 'c-side', encrypted: true },
];

export function fakeEngine(overrides: Partial<Engine> = {}): Engine {
  return {
    sessionToken: async () => 'token-for-tests',
    listBudgets: async () => fakeBudgets,
    openBudget: async (_budget, onStage = () => {}) => {
      for (const stage of ['downloading', 'opening', 'syncing'] as const) await onStage(stage);
    },
    getMonth: async month => ({
      month, toBudget: 31200, totalBudgeted: 588000, totalSpent: 341617, totalIncome: 619200, totalBalance: 246383,
      categoryGroups: [],
    }),
    sync: async () => {},
    close: async () => {},
    getAccounts: async () => [],
    getTransactions: async () => [],
    searchTransactions: async () => [],
    addTransaction: async () => {},
    ...overrides,
  };
}
```

- [ ] **Step 7: Write the failing tests for the provider**

`app/src/session/SessionProvider.test.tsx`:

```tsx
import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import type { ReactNode } from 'react';

import { EngineError } from '../engine/types';
import { fakeBudgets, fakeEngine } from './fakeEngine';
import { SessionProvider, useSession } from './SessionProvider';
import { loadSession, saveSession } from './storage';

const wrap = (create = jest.fn(async () => fakeEngine())) => ({
  create,
  wrapper: ({ children }: { children: ReactNode }) => <SessionProvider create={create}>{children}</SessionProvider>,
});

beforeEach(() => (SecureStore as any).__reset());

it('starts signed out when nothing is saved', async () => {
  const { result } = renderHook(useSession, wrap());
  await waitFor(() => expect(result.current.status).toBe('signedOut'));
});

it('connect signs in with the password and stores only the token', async () => {
  const { create, wrapper } = wrap();
  const { result } = renderHook(useSession, { wrapper });
  await waitFor(() => expect(result.current.status).toBe('signedOut'));

  let budgets;
  await act(async () => { budgets = await result.current.connect('https://budget.example.com', 'hunter2-for-tests'); });

  expect(budgets).toEqual(fakeBudgets);
  expect(create).toHaveBeenCalledWith({ serverURL: 'https://budget.example.com', password: 'hunter2-for-tests' });
  expect(result.current.status).toBe('needsBudget');
  const saved = JSON.stringify(await loadSession());
  expect(saved).toContain('token-for-tests');
  expect(saved).not.toContain('hunter2-for-tests');
});

it('choosing a budget then opening it reaches open', async () => {
  const { result } = renderHook(useSession, wrap());
  await waitFor(() => expect(result.current.status).toBe('signedOut'));
  await act(async () => { await result.current.connect('https://budget.example.com', 'pw-for-tests'); });
  await act(async () => { await result.current.chooseBudget(fakeBudgets[0]); });
  expect(result.current.status).toBe('closed');

  const stages: string[] = [];
  await act(async () => { await result.current.open(s => void stages.push(s)); });
  expect(stages).toEqual(['downloading', 'opening', 'syncing']);
  expect(result.current.status).toBe('open');
});

it('a saved session starts closed and opens with the token', async () => {
  await saveSession({ serverURL: 'https://budget.example.com', sessionToken: 'token-for-tests', budget: fakeBudgets[0] });
  const { create, wrapper } = wrap();
  const { result } = renderHook(useSession, { wrapper });
  await waitFor(() => expect(result.current.status).toBe('closed'));
  await act(async () => { await result.current.open(); });
  expect(create).toHaveBeenCalledWith({ serverURL: 'https://budget.example.com', sessionToken: 'token-for-tests' });
  expect(result.current.status).toBe('open');
});

it('an expired token signs out and rethrows', async () => {
  await saveSession({ serverURL: 'https://budget.example.com', sessionToken: 'old-token', budget: fakeBudgets[0] });
  const create = jest.fn(async () => { throw new EngineError('token-expired', 'expired'); });
  const { result } = renderHook(useSession, wrap(create));
  await waitFor(() => expect(result.current.status).toBe('closed'));
  await act(async () => { await expect(result.current.open()).rejects.toMatchObject({ code: 'token-expired' }); });
  expect(result.current.status).toBe('signedOut');
  expect(await loadSession()).toBeNull();
});

it('signOut clears everything', async () => {
  const { result } = renderHook(useSession, wrap());
  await waitFor(() => expect(result.current.status).toBe('signedOut'));
  await act(async () => { await result.current.connect('https://budget.example.com', 'pw-for-tests'); });
  await act(async () => { await result.current.signOut(); });
  expect(result.current.status).toBe('signedOut');
  expect(await loadSession()).toBeNull();
});
```

Run: `npm test -- SessionProvider`
Expected: FAIL, `Cannot find module './SessionProvider'`.

- [ ] **Step 8: Implement the provider**

`app/src/session/SessionProvider.tsx`:

```tsx
// Owns the engine and the saved session, and says which screen should show.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { EngineError } from '../engine/types';
import type { Auth, Engine, OpenStage, RemoteBudget } from '../engine/types';
import { clearSession, loadSession, saveSession } from './storage';
import type { SavedSession } from './storage';

export type SessionStatus = 'loading' | 'signedOut' | 'needsBudget' | 'closed' | 'open';
export type CreateEngine = (config: { serverURL: string } & Auth) => Promise<Engine>;
export type Session = {
  status: SessionStatus;
  saved: SavedSession | null;
  engine: Engine | null;
  connect(serverURL: string, password: string): Promise<RemoteBudget[]>;
  chooseBudget(budget: RemoteBudget): Promise<void>;
  open(onStage?: (stage: OpenStage) => void | Promise<void>): Promise<void>;
  signOut(): Promise<void>;
};

const Context = createContext<Session | null>(null);

// Required lazily so tests, which pass their own `create`, never load the engine bundle.
const realCreate: CreateEngine = config => require('../engine/adapter').createEngine(config);

export function SessionProvider({ children, create = realCreate }: { children: ReactNode; create?: CreateEngine }) {
  const [saved, setSaved] = useState<SavedSession | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const engine = useRef<Engine | null>(null);

  useEffect(() => {
    void loadSession().then(session => {
      setSaved(session);
      setLoaded(true);
    });
  }, []);

  const persist = useCallback(async (next: SavedSession | null) => {
    await (next ? saveSession(next) : clearSession());
    setSaved(next);
  }, []);

  const signOut = useCallback(async () => {
    await engine.current?.close().catch(() => {});
    engine.current = null;
    setIsOpen(false);
    await persist(null);
  }, [persist]);

  const connect = useCallback(
    async (serverURL: string, password: string) => {
      const next = await create({ serverURL, password });
      engine.current = next;
      const [sessionToken, budgets] = await Promise.all([next.sessionToken(), next.listBudgets()]);
      await persist({ serverURL, sessionToken, budget: null });
      return budgets;
    },
    [create, persist],
  );

  const chooseBudget = useCallback(
    async (budget: RemoteBudget) => {
      if (!saved) throw new EngineError('token-expired', 'Not signed in');
      setIsOpen(false);
      await persist({ ...saved, budget });
    },
    [saved, persist],
  );

  const open = useCallback(
    async (onStage?: (stage: OpenStage) => void | Promise<void>) => {
      if (!saved?.budget) throw new EngineError('internal', 'No budget chosen');
      try {
        engine.current ??= await create({ serverURL: saved.serverURL, sessionToken: saved.sessionToken });
        await engine.current.openBudget(saved.budget, onStage);
        setIsOpen(true);
      } catch (e) {
        if (e instanceof EngineError && e.code === 'token-expired') await signOut();
        throw e;
      }
    },
    [saved, create, signOut],
  );

  const status: SessionStatus = !loaded ? 'loading' : !saved ? 'signedOut' : !saved.budget ? 'needsBudget' : isOpen ? 'open' : 'closed';
  const value = useMemo(
    () => ({ status, saved, engine: engine.current, connect, chooseBudget, open, signOut }),
    [status, saved, connect, chooseBudget, open, signOut],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSession(): Session {
  const session = useContext(Context);
  if (!session) throw new Error('useSession must be used inside <SessionProvider>');
  return session;
}
```

- [ ] **Step 9: Run the tests**

Run: `npm test -- session`
Expected: PASS, 15 tests across the three files.

- [ ] **Step 10: Put the provider at the root**

In `app/src/app/_layout.tsx`, import `SessionProvider` from `'../session/SessionProvider'` and wrap the returned `<Stack …/>` in `<SessionProvider>…</SessionProvider>`.

Run: `npm run typecheck`
Expected: no output.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "Session: server address rules, Keychain storage and the session provider"
```

---

### Task 7: Connect screen

Server address, password, then the budgets on that server. Matches the "Connect" screen in `design/previews/round-2/aurora-screens.png`.

**Files:**
- Create: `app/src/features/connect/errors.ts`, `app/src/features/connect/errors.test.ts`, `app/src/app/connect.tsx`, `app/src/app/connect.test.tsx`

**Interfaces:**
- Consumes: `useSession`, `normalizeServerUrl`, `fakeEngine`, `fakeBudgets`, the `ui/` components, `EngineError`.
- Produces:
  - `connectErrorMessage(code: string): string`
  - route `/connect`. After a budget is chosen it calls `router.replace('/opening')`.

- [ ] **Step 1: Write the failing test for the messages**

`app/src/features/connect/errors.test.ts`:

```ts
import { connectErrorMessage } from './errors';

it.each([
  ['invalid-password', 'That password is not right.'],
  ['network-failure', 'Could not reach that server. Check the address and your connection.'],
  ['token-expired', 'You have been signed out. Sign in again.'],
  ['empty', 'Enter your server’s address.'],
  ['invalid', 'That does not look like a server address.'],
  ['insecure', 'That address is not encrypted (http). Turn on “Allow plain HTTP” if this is a server on your own network.'],
])('%s', (code, message) => {
  expect(connectErrorMessage(code)).toBe(message);
});

it('has a plain fallback that does not leak the code', () => {
  expect(connectErrorMessage('some-internal-slug')).toBe('Something went wrong. Try again.');
});
```

Run: `npm test -- errors`
Expected: FAIL, `Cannot find module './errors'`.

- [ ] **Step 2: Implement the messages**

`app/src/features/connect/errors.ts`:

```ts
// What to tell a person for each failure code. Never show the code, a URL or a password.
const messages: Record<string, string> = {
  'invalid-password': 'That password is not right.',
  'network-failure': 'Could not reach that server. Check the address and your connection.',
  'token-expired': 'You have been signed out. Sign in again.',
  empty: 'Enter your server’s address.',
  invalid: 'That does not look like a server address.',
  insecure: 'That address is not encrypted (http). Turn on “Allow plain HTTP” if this is a server on your own network.',
};

export const connectErrorMessage = (code: string): string => messages[code] ?? 'Something went wrong. Try again.';
```

Run: `npm test -- errors`
Expected: PASS, 7 tests.

- [ ] **Step 3: Write the failing screen tests**

`app/src/app/connect.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';

import { EngineError } from '../engine/types';
import { fakeEngine } from '../session/fakeEngine';
import { SessionProvider } from '../session/SessionProvider';
import type { CreateEngine } from '../session/SessionProvider';
import { loadSession } from '../session/storage';
import Connect from './connect';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ router: { replace: (...args: unknown[]) => mockReplace(...args) } }));

const show = (create: CreateEngine = async () => fakeEngine()) =>
  render(<SessionProvider create={create}><Connect /></SessionProvider>);

const fillAndConnect = async (address: string, password = 'pw-for-tests') => {
  fireEvent.changeText(await screen.findByLabelText('Server address'), address);
  fireEvent.changeText(screen.getByLabelText('Password'), password);
  fireEvent.press(screen.getByRole('button', { name: 'Connect' }));
};

beforeEach(() => {
  (SecureStore as any).__reset();
  mockReplace.mockClear();
});

it('lists the budgets after connecting', async () => {
  show();
  await fillAndConnect('budget.example.com');
  expect(await screen.findByText('Household')).toBeTruthy();
  expect(screen.getByText('Side business')).toBeTruthy();
});

it('explains a wrong password', async () => {
  show(async () => { throw new EngineError('invalid-password', 'x'); });
  await fillAndConnect('budget.example.com');
  expect(await screen.findByText('That password is not right.')).toBeTruthy();
});

it('refuses plain http until it is allowed', async () => {
  const create = jest.fn(async () => fakeEngine());
  show(create);
  await fillAndConnect('http://192.168.1.20:5006');
  expect(await screen.findByText(/not encrypted/)).toBeTruthy();
  expect(create).not.toHaveBeenCalled();

  fireEvent(screen.getByLabelText('Allow plain HTTP'), 'valueChange', true);
  fireEvent.press(screen.getByRole('button', { name: 'Connect' }));
  await waitFor(() => expect(create).toHaveBeenCalledWith({ serverURL: 'http://192.168.1.20:5006', password: 'pw-for-tests' }));
});

it('opens the chosen budget', async () => {
  show();
  await fillAndConnect('budget.example.com');
  fireEvent.press(await screen.findByText('Household'));
  fireEvent.press(screen.getByRole('button', { name: 'Open Household' }));
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/opening'));
  expect((await loadSession())?.budget?.name).toBe('Household');
});

it('will not open an encrypted budget', async () => {
  show();
  await fillAndConnect('budget.example.com');
  expect(await screen.findByText('Encrypted budgets are not supported yet')).toBeTruthy();
});
```

Run: `npm test -- connect`
Expected: FAIL, `Cannot find module './connect'`.

- [ ] **Step 4: Implement the screen**

`app/src/app/connect.tsx`:

```tsx
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EngineError } from '../engine/types';
import type { RemoteBudget } from '../engine/types';
import { connectErrorMessage } from '../features/connect/errors';
import { normalizeServerUrl } from '../session/serverUrl';
import { useSession } from '../session/SessionProvider';
import { font, radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { AuroraBackground } from '../ui/AuroraBackground';
import { Button } from '../ui/Button';
import { Glass } from '../ui/Glass';
import { Body, Label, Title } from '../ui/Text';

export default function Connect() {
  const theme = useTheme();
  const session = useSession();
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [allowInsecure, setAllowInsecure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [budgets, setBudgets] = useState<RemoteBudget[] | null>(null);
  const [chosen, setChosen] = useState<RemoteBudget | null>(null);

  async function connect() {
    const result = normalizeServerUrl(address, { allowInsecure });
    if (!result.ok) return setError(connectErrorMessage(result.reason));
    setBusy(true);
    setError(null);
    try {
      const found = await session.connect(result.url, password);
      setBudgets(found);
      setChosen(found.find(b => !b.encrypted) ?? null);
      setPassword('');
    } catch (e) {
      setError(connectErrorMessage(e instanceof EngineError ? e.code : 'internal'));
    } finally {
      setBusy(false);
    }
  }

  async function open() {
    if (!chosen) return;
    await session.chooseBudget(chosen);
    router.replace('/opening');
  }

  const input = { fontFamily: font.semibold, fontSize: 16.5, color: theme.color.ink, paddingVertical: 2 };

  return (
    <AuroraBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Title style={{ marginTop: space.xxl }}>Connect to your Actual server</Title>
          <Body color={theme.color.mute} style={{ marginTop: space.md, marginBottom: space.xl }}>
            Accrual talks to your server directly. Your budget never passes through us.
          </Body>

          <Glass radius={radius.field} style={styles.field}>
            <Label>Server address</Label>
            <TextInput
              accessibilityLabel="Server address"
              value={address}
              onChangeText={setAddress}
              placeholder="budget.example.com"
              placeholderTextColor={theme.color.mute}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={input}
            />
          </Glass>
          <Glass radius={radius.field} style={styles.field}>
            <Label>Password</Label>
            <TextInput
              accessibilityLabel="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={input}
            />
          </Glass>
          <View style={styles.toggle}>
            <Label>Allow plain HTTP (for a server on your own network)</Label>
            <Switch accessibilityLabel="Allow plain HTTP" value={allowInsecure} onValueChange={setAllowInsecure} />
          </View>

          {error && <Body color={theme.color.over} style={{ marginTop: space.md }}>{error}</Body>}

          {budgets && (
            <>
              <Label style={{ marginTop: space.xl, marginBottom: space.sm }}>Budgets on this server</Label>
              <Glass>
                {budgets.map(budget => (
                  <Pressable
                    key={budget.groupId}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: chosen?.groupId === budget.groupId, disabled: budget.encrypted }}
                    disabled={budget.encrypted}
                    onPress={() => setChosen(budget)}
                    style={[styles.option, { opacity: budget.encrypted ? 0.5 : 1 }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Body style={{ fontFamily: font.semibold }}>{budget.name}</Body>
                      {budget.encrypted && <Label>Encrypted budgets are not supported yet</Label>}
                    </View>
                    <View
                      style={[
                        styles.radio,
                        { borderColor: theme.color.track, backgroundColor: chosen?.groupId === budget.groupId ? theme.color.ok : 'transparent' },
                      ]}
                    />
                  </Pressable>
                ))}
              </Glass>
            </>
          )}
        </ScrollView>

        <View style={styles.bottom}>
          {budgets ? (
            <Button title={chosen ? `Open ${chosen.name}` : 'Choose a budget'} onPress={open} disabled={!chosen} />
          ) : (
            <Button title="Connect" onPress={connect} disabled={busy} />
          )}
          <Label style={{ textAlign: 'center', marginTop: space.md }}>Your password is never stored on this phone.</Label>
        </View>
      </SafeAreaView>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.xl, paddingBottom: space.xl },
  field: { paddingHorizontal: space.lg, paddingVertical: space.md, marginTop: space.sm },
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.md, gap: space.md },
  option: { flexDirection: 'row', alignItems: 'center', padding: space.lg, gap: space.md },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2 },
});
```

The design's fine print said "Password stays in your phone's keychain". That is wrong for this build: only the token is stored. The line above says what is true.

- [ ] **Step 5: Run the tests**

Run: `npm test -- connect && npm run typecheck`
Expected: PASS, 5 screen tests and 7 message tests; no typecheck output.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Connect screen: server address, password, budget list"
```

---

### Task 8: Opening screen (first download and reopen)

The screen from ADR 0002. It runs `session.open()`, names the step in progress, and keeps moving while the thread is blocked.

**Files:**
- Create: `app/src/features/opening/stageCopy.ts`, `app/src/features/opening/stageCopy.test.ts`, `app/src/app/opening.tsx`, `app/src/app/opening.test.tsx`

**Interfaces:**
- Consumes: `useSession`, `OpenStage`, `EngineError`, `connectErrorMessage`, `Spinner`, the `ui/` components.
- Produces:
  - `stageCopy(stage: OpenStage | null, budgetName: string): { title: string; detail: string }`
  - route `/opening`. On success it calls `router.replace('/')`. On `token-expired` it calls `router.replace('/connect')`.

- [ ] **Step 1: Write the failing test for the copy**

`app/src/features/opening/stageCopy.test.ts`:

```ts
import { stageCopy } from './stageCopy';

it('names each step', () => {
  expect(stageCopy(null, 'Household').title).toBe('Opening Household');
  expect(stageCopy('downloading', 'Household')).toEqual({
    title: 'Downloading Household',
    detail: 'This happens once on this phone.',
  });
  expect(stageCopy('opening', 'Household')).toEqual({
    title: 'Opening Household',
    detail: 'Working through your budget. A large one can take a few seconds.',
  });
  expect(stageCopy('syncing', 'Household')).toEqual({
    title: 'Syncing Household',
    detail: 'Checking your server for changes.',
  });
});
```

Run: `npm test -- stageCopy`
Expected: FAIL, `Cannot find module './stageCopy'`.

- [ ] **Step 2: Implement the copy**

`app/src/features/opening/stageCopy.ts`:

```ts
import type { OpenStage } from '../../engine/types';

const copy: Record<OpenStage, { verb: string; detail: string }> = {
  downloading: { verb: 'Downloading', detail: 'This happens once on this phone.' },
  opening: { verb: 'Opening', detail: 'Working through your budget. A large one can take a few seconds.' },
  syncing: { verb: 'Syncing', detail: 'Checking your server for changes.' },
};

/** What the opening screen says. `null` is the moment before the first step is known. */
export function stageCopy(stage: OpenStage | null, budgetName: string): { title: string; detail: string } {
  if (!stage) return { title: `Opening ${budgetName}`, detail: '' };
  return { title: `${copy[stage].verb} ${budgetName}`, detail: copy[stage].detail };
}
```

Run: `npm test -- stageCopy`
Expected: PASS.

- [ ] **Step 3: Write the failing screen tests**

`app/src/app/opening.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';

import { EngineError } from '../engine/types';
import type { OpenStage } from '../engine/types';
import { fakeBudgets, fakeEngine } from '../session/fakeEngine';
import { SessionProvider } from '../session/SessionProvider';
import type { CreateEngine } from '../session/SessionProvider';
import { saveSession } from '../session/storage';
import Opening from './opening';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ router: { replace: (...args: unknown[]) => mockReplace(...args) } }));

const show = async (create: CreateEngine) => {
  await saveSession({ serverURL: 'https://budget.example.com', sessionToken: 'token-for-tests', budget: fakeBudgets[0] });
  render(<SessionProvider create={create}><Opening /></SessionProvider>);
};

beforeEach(() => {
  (SecureStore as any).__reset();
  mockReplace.mockClear();
});

it('goes home once the budget is open', async () => {
  await show(async () => fakeEngine());
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
});

it('shows the step in progress', async () => {
  let release!: () => void;
  const held = new Promise<void>(resolve => (release = resolve));
  await show(async () =>
    fakeEngine({
      openBudget: async (_b, onStage = () => {}) => {
        await onStage('downloading' as OpenStage);
        await held;
      },
    }),
  );
  expect(await screen.findByText('Downloading Household')).toBeTruthy();
  expect(screen.getByText('This happens once on this phone.')).toBeTruthy();
  release();
});

it('returns to Connect when the token has expired', async () => {
  await show(async () => { throw new EngineError('token-expired', 'x'); });
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/connect'));
});

it('offers a retry when the server cannot be reached', async () => {
  await show(async () => { throw new EngineError('network-failure', 'x'); });
  expect(await screen.findByText('Could not reach that server. Check the address and your connection.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  expect(mockReplace).not.toHaveBeenCalled();
});
```

Run: `npm test -- opening`
Expected: FAIL, `Cannot find module './opening'`.

- [ ] **Step 4: Implement the screen**

`app/src/app/opening.tsx`:

```tsx
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { EngineError } from '../engine/types';
import type { OpenStage } from '../engine/types';
import { connectErrorMessage } from '../features/connect/errors';
import { stageCopy } from '../features/opening/stageCopy';
import { useSession } from '../session/SessionProvider';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { AuroraBackground } from '../ui/AuroraBackground';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { Body, Title } from '../ui/Text';

// Two frames: one for React to commit the new text, one for it to reach the screen. The
// next step may block the JavaScript thread, and text that has not been painted would
// otherwise never appear.
const painted = () =>
  new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

export default function Opening() {
  const theme = useTheme();
  const session = useSession();
  const [stage, setStage] = useState<OpenStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const run = useCallback(async () => {
    setError(null);
    try {
      await session.open(async next => {
        setStage(next);
        await painted();
      });
      router.replace('/');
    } catch (e) {
      const code = e instanceof EngineError ? e.code : 'internal';
      if (code === 'token-expired') return router.replace('/connect');
      setError(connectErrorMessage(code));
    }
  }, [session]);

  // Start once, as soon as the saved session has loaded.
  useEffect(() => {
    if (session.status === 'closed' && !started.current) {
      started.current = true;
      void run();
    }
    if (session.status === 'signedOut' || session.status === 'needsBudget') router.replace('/connect');
  }, [session.status, run]);

  const copy = stageCopy(stage, session.saved?.budget?.name ?? 'your budget');
  return (
    <AuroraBackground>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.lg }}>
        {error ? (
          <>
            <Body color={theme.color.over} style={{ textAlign: 'center' }}>{error}</Body>
            <View style={{ alignSelf: 'stretch' }}><Button title="Try again" onPress={() => void run()} /></View>
          </>
        ) : (
          <>
            <Spinner />
            <Title style={{ textAlign: 'center', fontSize: 28 }}>{copy.title}</Title>
            <Body color={theme.color.mute} style={{ textAlign: 'center' }}>{copy.detail}</Body>
          </>
        )}
      </View>
    </AuroraBackground>
  );
}
```

In Jest, `requestAnimationFrame` exists and fires on fake or real timers. If the "goes home" test times out, the two-frame wait is not resolving in the test environment: add `global.requestAnimationFrame = cb => setTimeout(cb, 0) as unknown as number;` to `jest.setup.ts`.

- [ ] **Step 5: Run the tests**

Run: `npm test -- opening stageCopy && npm run typecheck`
Expected: PASS, 5 tests; no typecheck output.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Opening screen: staged progress for the first download and reopen"
```

---

### Task 9: Home, routing, and the run on devices

The last piece: a home screen that proves the whole path by showing a real number from the engine, and the routing that sends each session state to the right screen.

**Files:**
- Create: `app/src/app/index.test.tsx`
- Modify: `app/src/app/index.tsx`, `app/jest.setup.ts`, `app/README.md`, `README.md`, `docs/plan.md`

**Interfaces:**
- Consumes: `useSession`, `currentMonth`, `Money`, `fakeEngine`, `fakeBudgets`.
- Produces: route `/`. Redirects: `signedOut` and `needsBudget` → `/connect`; `closed` → `/opening`; `open` shows Ready to budget.

- [ ] **Step 1: Write the failing tests**

`app/src/app/index.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { useEffect } from 'react';

import { fakeBudgets, fakeEngine } from '../session/fakeEngine';
import { SessionProvider, useSession } from '../session/SessionProvider';
import { saveSession } from '../session/storage';
import Home from './index';

const mockRedirect = jest.fn();
jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    mockRedirect(href);
    return null;
  },
  router: { replace: jest.fn() },
}));

beforeEach(() => {
  (SecureStore as any).__reset();
  mockRedirect.mockClear();
});

it('sends a signed-out person to Connect', async () => {
  render(<SessionProvider create={async () => fakeEngine()}><Home /></SessionProvider>);
  await waitFor(() => expect(mockRedirect).toHaveBeenCalledWith('/connect'));
});

it('sends a saved session to Opening', async () => {
  await saveSession({ serverURL: 'https://budget.example.com', sessionToken: 'token-for-tests', budget: fakeBudgets[0] });
  render(<SessionProvider create={async () => fakeEngine()}><Home /></SessionProvider>);
  await waitFor(() => expect(mockRedirect).toHaveBeenCalledWith('/opening'));
});

it('shows Ready to budget once the budget is open', async () => {
  await saveSession({ serverURL: 'https://budget.example.com', sessionToken: 'token-for-tests', budget: fakeBudgets[0] });
  // Stands in for the Opening screen: opens the budget, then Home takes over.
  function OpenThenHome() {
    const session = useSession();
    useEffect(() => {
      if (session.status === 'closed') void session.open();
    }, [session]);
    return <Home />;
  }
  render(<SessionProvider create={async () => fakeEngine()}><OpenThenHome /></SessionProvider>);
  expect(await screen.findByText('Household')).toBeTruthy();
  expect(await screen.findByText('$312')).toBeTruthy();
  expect(screen.getByText('Ready to budget')).toBeTruthy();
});
```

The scripted check must stay off in tests. Add to `app/jest.setup.ts`:

```ts
// Home redirects to the developer check when this is set; tests want the real screen.
delete process.env.EXPO_PUBLIC_SPIKE_AUTORUN;
```

Run: `npm test -- index`
Expected: FAIL. The placeholder Home shows "Accrual" and never redirects.

- [ ] **Step 2: Implement Home**

Replace `app/src/app/index.tsx` with:

```tsx
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { autorunConfig } from '../dev/autorun';
import type { BudgetMonth } from '../engine/types';
import { currentMonth } from '../lib/month';
import { useSession } from '../session/SessionProvider';
import { radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { AuroraBackground } from '../ui/AuroraBackground';
import { Button } from '../ui/Button';
import { Glass } from '../ui/Glass';
import { Money } from '../ui/Money';
import { Body, Label, Title } from '../ui/Text';

// Plan 2 replaces this with the real Plan screen. For now it proves the whole path:
// a number read from the engine, on the phone, for the chosen budget.
export default function Home() {
  const theme = useTheme();
  const session = useSession();
  const [month, setMonth] = useState<BudgetMonth | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (session.status !== 'open' || !session.engine) return;
    let current = true;
    session.engine
      .getMonth(currentMonth())
      .then(result => current && setMonth(result))
      .catch(() => current && setFailed(true));
    return () => {
      current = false;
    };
  }, [session.status, session.engine]);

  if (autorunConfig) return <Redirect href="/dev-check" />;
  if (session.status === 'loading') return <AuroraBackground>{null}</AuroraBackground>;
  if (session.status === 'signedOut' || session.status === 'needsBudget') return <Redirect href="/connect" />;
  if (session.status === 'closed') return <Redirect href="/opening" />;

  return (
    <AuroraBackground>
      <SafeAreaView style={{ flex: 1, padding: space.lg, gap: space.lg }}>
        <Title style={{ fontSize: 28 }}>{session.saved?.budget?.name}</Title>
        <Glass radius={radius.card} style={{ padding: space.xl, gap: space.sm }}>
          <Label>Ready to budget</Label>
          {month ? (
            <Money cents={month.toBudget} size={58} color={month.toBudget < 0 ? theme.color.over : undefined} />
          ) : (
            <Body color={theme.color.mute}>{failed ? 'Could not read this month.' : ' '}</Body>
          )}
        </Glass>
        <View style={{ flex: 1 }} />
        <Button title="Sign out" variant="quiet" onPress={() => void session.signOut()} />
      </SafeAreaView>
    </AuroraBackground>
  );
}
```

- [ ] **Step 3: Run every test**

Run: `npm test && npm run typecheck`
Expected: every test PASSES, no typecheck output.

- [ ] **Step 4: Run it on the iOS simulator**

Start the test server (`cd tools/test-server && npm run server`), then:

```bash
cd app && npm run engine:build
DEVELOPER_DIR=/Applications/Xcode-26.6.0.app/Contents/Developer npx expo run:ios
```

Do each of these by hand and confirm what you see:

1. First launch shows **Connect to your Actual server**.
2. Enter `http://127.0.0.1:5007` and the password from `tools/test-server/.env`, tap **Connect**: a message says the address is not encrypted.
3. Turn on **Allow plain HTTP**, tap **Connect**: "Spike Small" and "Spike Large" are listed.
4. Enter a wrong password instead: "That password is not right."
5. Choose **Spike Large**, tap **Open Spike Large**: the opening screen shows "Downloading", then "Opening", then "Syncing", and the ring keeps turning throughout.
6. Home shows "Spike Large" and a Ready to budget amount. Compare it with the web app at `http://127.0.0.1:5007` for the same month: they match to the cent.
7. Close the app from the app switcher and open it again: it goes through "Opening" and "Syncing" (no "Downloading") and returns to Home without asking for the password.
8. Tap **Sign out**: back to Connect. Reopen the app: still Connect.

- [ ] **Step 5: Run it on an Android emulator**

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@17 ANDROID_HOME=~/Library/Android/sdk
npx expo run:android
```

Repeat the eight checks with `http://10.0.2.2:5007` as the address. Tiles are solid instead of frosted; everything else is the same.

- [ ] **Step 6: Record what was and was not run**

In `app/README.md`, add a section "What works" listing the eight checks and, for each platform, whether it was run and passed. Say plainly if a platform or a check was not run.

In `README.md`, change the Status paragraph to:

```markdown
Phase 1 is under way. The app connects to a server, downloads a budget and shows this month's
Ready to budget. See [the roadmap](docs/superpowers/plans/2026-11-19-phase-1-roadmap.md).
```

In `docs/plan.md`, under "Phase 1: Personal MVP", tick or annotate the first two bullets (server setup screen, budget picker) and note that the password is not stored: the session token is.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Home and routing: connect, open and read Ready to budget end to end"
```

---

## Done when

- `npm test`, `npm run typecheck` and `npm run engine:verify` pass in `app/`, and CI is green.
- On the iOS simulator and an Android emulator, all eight checks in Task 9 pass.
- The password appears nowhere on disk: `loadSession()` returns a token and no password, and the test in Task 6 that asserts this passes.
- `spike/` no longer exists.

## Not in this plan

The Plan screen proper (tiles, notice, month switcher), Quick add, moving money, accounts and transactions, light-theme polish, motion and haptics. Each is its own plan in the [roadmap](2026-11-19-phase-1-roadmap.md).
