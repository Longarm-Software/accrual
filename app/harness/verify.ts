// Runs the React Native engine bundle + shims in Node (native modules replaced
// by harness/mocks) against the throwaway server, and checks it against the
// official @actual-app/api client. Usage:
//   npm run engine:verify            full check (fresh download of both budgets)
//   npm run engine:verify -- cold    cold start on already-downloaded budgets
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { usesBundledGlobals, nativeFormatToParts } = require('./register.cjs');

const here = __dirname;
const serverDir = path.join(here, '..', '..', 'tools', 'test-server');
const serverURL = process.env.SPIKE_SERVER_URL ?? 'http://127.0.0.1:5007';
const password = process.env.SPIKE_SERVER_PASSWORD;
if (!password) throw new Error('SPIKE_SERVER_PASSWORD is not set (see app/README.md)');
if (/:5006\b/.test(serverURL)) throw new Error('Refusing to run against port 5006');

const mode = process.argv[2] ?? 'full';
const budgetsExpected = 2;
const dataDir = path.join(here, 'data', 'engine');
if (mode === 'full') fs.rmSync(dataDir, { recursive: true, force: true });
fs.mkdirSync(dataDir, { recursive: true });
process.env.HARNESS_DOCUMENT_DIR = dataDir;

const reference = (...args: string[]) =>
  JSON.parse(
    execFileSync(process.execPath, [path.join(serverDir, 'scripts', 'reference.mjs'), ...args], {
      env: { ...process.env, SPIKE_SERVER_PASSWORD: password },
      maxBuffer: 256 * 1024 * 1024,
    }).toString(),
  );

const timings: Record<string, number> = {};
async function timed<T>(label: string, fn: () => Promise<T> | T): Promise<T> {
  const t0 = performance.now();
  const result = await fn();
  timings[label] = Math.round(performance.now() - t0);
  return result;
}
let failures = 0;
function check(label: string, ok: boolean, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
  if (!ok) failures++;
}

const pad = (n: number) => String(n).padStart(2, '0');
function monthsBack(count: number) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
  });
}
const today = new Date().toISOString().slice(0, 10);

async function compareMonths(engine: any, groupId: string, months: string[], label: string) {
  const expected = reference('months', groupId, months.join(','));
  let cells = 0;
  let mismatches = 0;
  for (const [i, month] of months.entries()) {
    const actual = await engine.getMonth(month);
    for (const group of actual.categoryGroups) cells += group.categories.length * 3;
    if (!isDeepStrictEqual(JSON.parse(JSON.stringify(actual)), expected[i])) {
      mismatches++;
      console.log(`  mismatch in ${month}`);
    }
  }
  check(`${label}: ${months.length} months identical to @actual-app/api`, mismatches === 0,
    `(${cells} budgeted/spent/balance cells)`);
}

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createEngine } = await timed('load bundle', () => require('../src/engine/adapter'));
  check('globals come from the bundle, not Node', usesBundledGlobals());
  // Hermes on iOS has no formatToParts; the bundle's stand-in must agree with the real one.
  const locales = ['en-US', 'de-DE', 'fr-FR', 'de-CH', 'en-IN', 'sv-SE', 'pt-BR', 'ja-JP', 'es-ES', 'ar-EG', 'hi-IN'];
  const separators = (parts: { type: string; value: string }[]) =>
    parts.filter(p => p.type === 'group' || p.type === 'decimal').map(p => `${p.type}:${p.value}`).join(' ');
  const wrong = locales.filter(locale => {
    const format = new Intl.NumberFormat(locale);
    return [1000000.23, 1234, 0.5, -98765.4].some(
      n => separators(format.formatToParts(n)) !== separators(nativeFormatToParts.call(format, n)));
  });
  check('formatToParts stand-in finds the same separators as the real one',
    Intl.NumberFormat.prototype.formatToParts !== nativeFormatToParts && wrong.length === 0,
    wrong.length ? `(differ: ${wrong.join(', ')})` : `(${locales.length} locales)`);

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

  const engine = await timed('init + sign in', () => createEngine({ serverURL, password, dataDir }));
  const budgets = await engine.listBudgets();
  const small = budgets.find((b: any) => b.name === 'Spike Small');
  const large = budgets.find((b: any) => b.name === 'Spike Large');
  check('signed in and listed budgets', Boolean(small && large), budgets.map((b: any) => b.name).join(', '));

  if (mode === 'cold') {
    const stages: string[] = [];
    await timed('large: open local copy + sync', () => engine.openBudget(large, s => void stages.push(s)));
    check('reopening skips the download', stages.join(' ') === 'opening syncing', `(${stages.join(' ')})`);
    await timed('large: read current month', () => engine.getMonth(monthsBack(1)[0]));
    await timed('large: sync (nothing new)', () => engine.sync());
    await engine.close();
    console.table(timings);
    return;
  }

  // --- Small budget: correctness and two-way sync
  const stages: string[] = [];
  await timed('small: download + open', () => engine.openBudget(small, s => void stages.push(s)));
  check('first open reports downloading, opening, syncing', stages.join(' ') === 'downloading opening syncing', `(${stages.join(' ')})`);
  await compareMonths(engine, small.groupId, monthsBack(4), 'small');

  const accounts = await engine.getAccounts();
  const checking = accounts.find((a: any) => a.name === 'Everyday Checking');
  const month = monthsBack(1)[0];
  const groceries = (await engine.getMonth(month)).categoryGroups
    .flatMap((g: any) => g.categories).find((c: any) => c.name === 'Groceries');

  const tag = `spike-${Date.now()}`;
  await engine.addTransaction(checking.id, {
    date: today, amount: -1234, payee_name: 'Zoë’s Bakery', category: groceries.id, notes: `${tag}-phone`,
  });
  await timed('small: sync after adding 1 transaction', () => engine.sync());
  const seen = reference('find', small.groupId, checking.id, today, `${tag}-phone`);
  check('engine -> server: transaction added in the engine reaches another client',
    seen.length === 1 && seen[0].amount === -1234 && seen[0].category === groceries.id);

  reference('edit', small.groupId, checking.id, today, '-4321', `${tag}-web`, month, groceries.id, '55555');
  await engine.sync();
  const mine = (await engine.getTransactions(checking.id, today, today)).filter((t: any) => t.notes === `${tag}-web`);
  const after = (await engine.getMonth(month)).categoryGroups
    .flatMap((g: any) => g.categories).find((c: any) => c.id === groceries.id);
  check('server -> engine: transaction and budget edit from another client arrive',
    mine.length === 1 && mine[0].amount === -4321 && after.budgeted === 55555);
  await compareMonths(engine, small.groupId, monthsBack(4), 'small, after two-way sync');
  // Text search and payee matching go through the native SQL functions.
  await engine.addTransaction(checking.id, {
    date: today, amount: -999, payee_name: 'ZOË’S BAKERY', notes: `${tag}-upper`,
  });
  await engine.sync();
  for (const text of ['ZOE', 'zoë', 'Grocer', 'TRIP', 'no-such-payee', '100%']) {
    const expected = reference('search', small.groupId, text);
    const found = await engine.searchTransactions(text);
    check(`search "${text}" returns the same transactions as @actual-app/api`,
      isDeepStrictEqual(found.map((t: any) => t.id).sort(), [...expected.ids].sort()), `(${found.length})`);
    if (text === 'ZOE') {
      check('payee matched case-insensitively across non-ASCII (no duplicate payee)',
        expected.bakeryPayees.length === 1, `(${expected.bakeryPayees.join(', ')})`);
    }
  }
  const payeeCount = (await engine.getTransactions(checking.id, today, today))
    .filter((t: any) => t.notes === `${tag}-phone`).length;
  check('added transaction stored once', payeeCount === 1);

  // --- Large budget: correctness and timing
  await timed('large: download + open', () => engine.openBudget(large));
  await timed('large: read current month', () => engine.getMonth(month));
  await compareMonths(engine, large.groupId, monthsBack(36), 'large');
  const largeChecking = (await engine.getAccounts()).find((a: any) => a.name === 'Everyday Checking');
  const count = (await engine.getTransactions(undefined as any, '2000-01-01', today)).length;
  check('large budget has 10,000+ transactions', count >= 10000, `(${count})`);
  await engine.addTransaction(largeChecking.id, { date: today, amount: -100, notes: `${tag}-timing` });
  await timed('large: sync after adding 1 transaction', () => engine.sync());
  await timed('large: sync (nothing new)', () => engine.sync());
  await engine.close();

  console.table(timings);
  if (failures) {
    console.log(`${failures} check(s) FAILED`);
    process.exit(1);
  }
  console.log('All checks passed');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
