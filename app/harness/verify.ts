// Runs the React Native engine bundle + shims in Node (native modules replaced
// by harness/mocks) against the throwaway server, and checks it against the
// official @actual-app/api client. Usage:
//   npm run engine:verify            full check (fresh download of both budgets)
//   npm run engine:verify -- cold    cold start on already-downloaded budgets
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import { READY } from '../src/engine/types';

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

// getPlanMonth against getMonth (api/budget-month) for the same month: the Plan screen's read
// must show the numbers the reference-checked read shows, minus income and hidden rows.
async function comparePlanMonth(engine: any, month: string, label: string) {
  const plan = await engine.getPlanMonth(month);
  const raw = await engine.getMonth(month);
  const expected = raw.categoryGroups
    .filter((g: any) => !g.is_income && !g.hidden)
    .map((g: any) => ({ id: g.id, categories: g.categories.filter((c: any) => !c.hidden) }));
  const totals = ['toBudget', 'totalIncome', 'totalSpent'].filter(k => plan[k] !== raw[k]);
  // loot-core reports total-budgeted negated; the plan month gives it as a positive amount, never -0.
  if (plan.totalBudgeted !== 0 - raw.totalBudgeted || Object.is(plan.totalBudgeted, -0)) totals.push('totalBudgeted');
  check(`${label}: plan month totals equal getMonth`, plan.month === month && totals.length === 0,
    totals.length ? `(differ: ${totals.join(', ')})` : '');
  check(`${label}: plan month has no income group`,
    !plan.groups.some((g: any) => raw.categoryGroups.find((r: any) => r.id === g.id)?.is_income));
  const order = (groups: any[]) => groups.map(g => `${g.id}:${g.categories.map((c: any) => c.id).join(',')}`).join('|');
  check(`${label}: plan month groups and categories in Actual's order`, order(plan.groups) === order(expected));
  const rawCategories = new Map<string, any>(expected.flatMap((g: any) => g.categories).map((c: any) => [c.id, c]));
  const planCategories = plan.groups.flatMap((g: any) => g.categories);
  const differ = planCategories.filter((c: any) => {
    const r = rawCategories.get(c.id);
    return !r || c.budgeted !== r.budgeted || c.spent !== r.spent || c.balance !== r.balance;
  });
  check(`${label}: plan month budgeted/spent/balance equal getMonth`,
    differ.length === 0 && planCategories.length === rawCategories.size,
    `(${planCategories.length} categories${differ.length ? `, ${differ.length} differ` : ''})`);
  const badGoals = planCategories.filter((c: any) =>
    !(c.goal === null || (Number.isInteger(c.goal) && c.goal > 0)) || typeof c.longGoal !== 'boolean');
  check(`${label}: every goal is null or a positive integer, longGoal a boolean`, badGoals.length === 0);
  return plan;
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
  let resolved = false;
  let syncingDuringCall = false;
  await timed('small: download + open', async () => {
    await engine.openBudget(small, s => {
      stages.push(s);
      if (s === 'syncing') syncingDuringCall = !resolved;
    });
    resolved = true;
  });
  check('first open reports downloading, then syncing', stages.join(' ') === 'downloading syncing', `(${stages.join(' ')})`);
  check('first open reports syncing while the open is still running', syncingDuringCall);
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
  // Seeded by tools/test-server/scripts/seed.mjs: "#template 150" on Insurance, applied to every
  // month the budget had when it ran (up to a year ahead of it).
  const insurance = (await comparePlanMonth(engine, month, 'small')).groups
    .flatMap((g: any) => g.categories).find((c: any) => c.name === 'Insurance');
  check('small: a templated category carries its goal', insurance?.goal === 15000 && insurance?.longGoal === false,
    `(${insurance?.goal}, ${insurance?.longGoal}${insurance?.goal == null ? '; run `npm run seed`' : ''})`);
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

  // Quick add's lists: accounts, payees with their last category, income categories.
  const lists = await engine.getQuickAddLists();
  check('quick add: accounts, payees and income categories are not empty',
    lists.accounts.length > 0 && lists.payees.length > 0 && lists.incomeCategories.length > 0,
    `(${lists.accounts.length} accounts, ${lists.payees.length} payees, ${lists.incomeCategories.length} income)`);
  const allAccounts = await engine.getAccounts();
  const excluded = new Set(allAccounts.filter((a: any) => a.closed || a.offbudget).map((a: any) => a.id));
  check('quick add: no closed or off-budget account is offered',
    lists.accounts.every((a: any) => !excluded.has(a.id)) &&
      lists.accounts.length === allAccounts.length - excluded.size,
    `(${excluded.size} left out)`);
  const newPayee = `Quick Add Payee ${tag}`;
  await engine.addTransaction(checking.id, {
    date: today, amount: -2500, payee_name: newPayee, category: groceries.id, notes: `${tag}-quick`,
  });
  const afterNew = await engine.getQuickAddLists();
  const top = afterNew.payees[0];
  check('quick add: a new payee comes first, with the category it was used with',
    top?.name === newPayee && top?.lastCategoryId === groceries.id, `(${top?.name}, ${top?.lastCategoryId})`);
  check('quick add: the last account is the newest transaction\'s', afterNew.lastAccountId === checking.id,
    `(${afterNew.lastAccountId})`);
  await engine.addTransaction(checking.id, { date: today, amount: -300, payee: top.id, notes: `${tag}-quick-id` });
  const afterId = await engine.getQuickAddLists();
  const named = afterId.payees.filter((p: any) => p.name === newPayee);
  check('quick add: adding with an existing payee id creates no second payee',
    named.length === 1 && named[0].id === top.id && afterId.payees[0].id === top.id, `(${named.length})`);
  await engine.sync();

  // --- A category's transactions, moving money and covering (Spike Small, this month)
  const planNow = await engine.getPlanMonth(month);
  const planCategories: any[] = planNow.groups.flatMap((g: any) => g.categories);
  const referenceActivity = reference('activity', small.groupId, month);
  let activityRows = 0;
  let activityChildren = 0;
  const activityWrong: string[] = [];
  for (const c of planCategories) {
    const rows = await engine.getCategoryActivity(c.id, month);
    const expected = referenceActivity[c.id] ?? { ids: [], children: 0, sum: 0 };
    const sum = rows.reduce((total: number, r: any) => total + r.amount, 0);
    const newestFirst = rows.every((r: any, i: number) => i === 0 || rows[i - 1].date >= r.date);
    const inMonth = rows.every((r: any) => r.date.startsWith(month) && typeof r.account === 'string' && r.account);
    if (!isDeepStrictEqual(rows.map((r: any) => r.id).sort(), [...expected.ids].sort()) ||
        sum !== c.spent || sum !== expected.sum || !newestFirst || !inMonth) activityWrong.push(c.name);
    activityRows += rows.length;
    activityChildren += expected.children;
  }
  check('activity: each category\'s transactions are the reference client\'s, newest first, and add up to spent',
    activityWrong.length === 0 && activityChildren > 0,
    `(${planCategories.length} categories, ${activityRows} rows, ${activityChildren} split children` +
      `${activityWrong.length ? `; wrong: ${activityWrong.join(', ')}` : ''})`);

  const plain = planCategories.filter((c: any) => !c.carryover);
  const fuel = plain.find((c: any) => c.name === 'Fuel');
  const household = plain.find((c: any) => c.name === 'Household');
  const figures = async () => {
    const plan = await engine.getPlanMonth(month);
    const byId = new Map<string, any>(plan.groups.flatMap((g: any) => g.categories).map((c: any) => [c.id, c]));
    return { toBudget: plan.toBudget, of: (id: string) => byId.get(id) };
  };
  const moved = (before: any, after: any, id: string, delta: number) =>
    after.of(id).budgeted === before.of(id).budgeted + delta && after.of(id).balance === before.of(id).balance + delta;

  const f0 = await figures();
  await engine.moveMoney({ month, from: fuel.id, to: household.id, amount: 1234 });
  const f1 = await figures();
  check('move: category to category moves 1234 of budgeted and balance; Ready to budget unchanged',
    moved(f0, f1, fuel.id, -1234) && moved(f0, f1, household.id, 1234) && f1.toBudget === f0.toBudget);
  await engine.moveMoney({ month, from: READY, to: fuel.id, amount: 500 });
  const f2 = await figures();
  check('move: from Ready to budget adds 500 to the category and takes 500 from Ready to budget',
    moved(f1, f2, fuel.id, 500) && f2.toBudget === f1.toBudget - 500, `(to budget ${f1.toBudget} -> ${f2.toBudget})`);
  // While both moves stand, the reference client must read them after a sync.
  await engine.sync();
  await compareMonths(engine, small.groupId, [month], 'move: after a sync, the reference client');
  // Moving from Ready to budget writes no note, so the month's last line is the first move's.
  const note: string = reference('note', small.groupId, month) ?? '';
  const lastLine = note.split('\n').at(-1) ?? '';
  check('move: Actual\'s movement note on the month reaches the reference client',
    new RegExp(`^- Reassigned 12\\.34 from ${fuel.name} → ${household.name} on [A-Z][a-z]+ \\d{2}$`).test(lastLine),
    `(${JSON.stringify(lastLine)})`);
  await engine.moveMoney({ month, from: fuel.id, to: READY, amount: 500 });
  const f3 = await figures();
  check('move: to Ready to budget reverses it', moved(f2, f3, fuel.id, -500) && f3.toBudget === f1.toBudget);
  await engine.moveMoney({ month, from: household.id, to: fuel.id, amount: 1234 });
  const f4 = await figures();
  check('move: moving back leaves the month as it was',
    moved(f0, f4, fuel.id, 0) && moved(f0, f4, household.id, 0) && f4.toBudget === f0.toBudget);

  const invalid = async (move: any) => (await engine.moveMoney(move).then(() => null, (e: any) => e))?.code;
  const codes = [
    await invalid({ month, from: fuel.id, to: household.id, amount: 0 }),
    await invalid({ month, from: fuel.id, to: household.id, amount: -100 }),
    await invalid({ month, from: fuel.id, to: fuel.id, amount: 100 }),
    await invalid({ month, from: READY, to: READY, amount: 100 }),
    await invalid({ month, from: fuel.id, to: household.id, amount: 12.5 }),
    // loot-core would write budget rows for month NaN, which break every client that downloads them.
    await invalid({ month: 'not-a-month', from: fuel.id, to: household.id, amount: 100 }),
    await invalid({ month: '2026-13', from: fuel.id, to: household.id, amount: 100 }),
    (await engine.coverOverspending({ month, category: fuel.id, from: household.id, amount: 0 })
      .then(() => null, (e: any) => e))?.code,
  ];
  const f5 = await figures();
  check('move: zero, negative, fractional, same-pot and bad-month moves, and a zero cover, fail with invalid-move and change nothing',
    codes.every(c => c === 'invalid-move') && moved(f0, f5, fuel.id, 0) && moved(f0, f5, household.id, 0) &&
      f5.toBudget === f0.toBudget, `(${codes.join(', ')})`);

  // Cover: overspend Fuel by a known deficit, cover it from the category with the most left.
  const deficit = 777;
  const source = [...plain].filter((c: any) => c.id !== fuel.id).sort((a: any, b: any) => b.balance - a.balance)[0];
  const overspend = f0.of(fuel.id).balance + deficit;
  await engine.addTransaction(checking.id, {
    date: today, amount: -overspend, payee_name: 'Harness Overspend', category: fuel.id, notes: `${tag}-overspend`,
  });
  const c0 = await figures();
  await engine.coverOverspending({ month, category: fuel.id, from: source.id, amount: deficit });
  const c1 = await figures();
  check('cover: the overspent category is back to 0 and the source fell by the deficit',
    c0.of(fuel.id).balance === -deficit && c1.of(fuel.id).balance === 0 &&
      c1.of(source.id).balance === c0.of(source.id).balance - deficit &&
      c1.of(source.id).budgeted === c0.of(source.id).budgeted - deficit && c1.toBudget === c0.toBudget,
    `(${source.name}: ${c0.of(source.id).balance} -> ${c1.of(source.id).balance})`);
  await engine.sync();
  await compareMonths(engine, small.groupId, [month], 'cover: after a sync, the reference client');
  // Undo it: a refund of the same amount, and the deficit moved back.
  await engine.addTransaction(checking.id, {
    date: today, amount: overspend, payee_name: 'Harness Overspend', category: fuel.id, notes: `${tag}-refund`,
  });
  await engine.moveMoney({ month, from: fuel.id, to: source.id, amount: deficit });
  const c2 = await figures();
  check('cover: undoing it leaves the month as it was',
    moved(f0, c2, fuel.id, 0) && moved(f0, c2, source.id, 0) && c2.toBudget === f0.toBudget);
  await engine.sync();

  // --- Large budget: correctness and timing
  await timed('large: download + open', () => engine.openBudget(large));
  await timed('large: read current month', () => engine.getMonth(month));
  await compareMonths(engine, large.groupId, monthsBack(36), 'large');
  await comparePlanMonth(engine, month, 'large');
  const bounds = await engine.getMonthBounds();
  const isMonth = (m: unknown) => typeof m === 'string' && /^\d{4}-\d{2}$/.test(m);
  check('month bounds are YYYY-MM, in order, and include this month',
    isMonth(bounds.start) && isMonth(bounds.end) && bounds.start <= bounds.end &&
      bounds.start <= month && month <= bounds.end, `(${bounds.start} to ${bounds.end})`);
  const largeChecking = (await engine.getAccounts()).find((a: any) => a.name === 'Everyday Checking');
  const count = (await engine.getTransactions(undefined as any, '2000-01-01', today)).length;
  check('large budget has 10,000+ transactions', count >= 10000, `(${count})`);
  await engine.addTransaction(largeChecking.id, { date: today, amount: -100, notes: `${tag}-timing` });
  await timed('large: sync after adding 1 transaction', () => engine.sync());
  await timed('large: sync (nothing new)', () => engine.sync());
  const savedToken = await engine.sessionToken();
  const onlinePlan = await engine.getPlanMonth(month);
  await engine.close();

  // --- Offline: a saved token and the copies downloaded above, with no server to reach.
  const nowhere = 'http://127.0.0.1:59999';
  const offline = await timed('offline: sign in', () =>
    createEngine({ serverURL: nowhere, sessionToken: savedToken, dataDir }));
  check('offline: a saved token signs in with offline === true', offline.offline === true);
  const offlineStages: string[] = [];
  await timed('offline: open local copy', () => offline.openBudget(large, (s: string) => void offlineStages.push(s)));
  check('offline: opening reports only "opening" and does not sync', offlineStages.join(' ') === 'opening',
    `(${offlineStages.join(' ')})`);
  check('offline: the plan month equals the online one',
    isDeepStrictEqual(await offline.getPlanMonth(month), onlinePlan));
  const syncFailure = await offline.sync().then(() => null, (e: any) => e);
  check('offline: sync fails with code network-failure', syncFailure?.code === 'network-failure',
    `(${syncFailure?.code})`);
  check('offline: the budget still reads after a failed sync',
    isDeepStrictEqual(await offline.getPlanMonth(month), onlinePlan));
  const missing = { name: 'Not on this phone', groupId: 'no-such-group', cloudFileId: 'no-such-file', encrypted: false };
  const openFailure = await offline.openBudget(missing).then(() => null, (e: any) => e);
  check('offline: a budget with no local copy fails with code network-failure',
    openFailure?.code === 'network-failure', `(${openFailure?.code})`);
  await offline.close();

  // A server that accepts the connection and never answers, like an address whose network drops
  // packets: sign-in must give up after its timeout and open offline, not wait for the platform's.
  const sockets = new Set<net.Socket>();
  const silent = net.createServer(socket => void sockets.add(socket));
  await new Promise<void>(resolve => silent.listen(0, '127.0.0.1', resolve));
  const silentURL = `http://127.0.0.1:${(silent.address() as net.AddressInfo).port}`;
  const signInTimeoutMs = 300;
  const syncTimeoutMs = 300;
  const t0 = performance.now();
  const stalled = await createEngine({
    serverURL: silentURL, sessionToken: savedToken, dataDir, signInTimeoutMs, syncTimeoutMs,
  }).catch((e: any) => e);
  const elapsed = Math.round(performance.now() - t0);
  check('a server that never answers: sign-in gives up after its timeout and opens offline',
    stalled?.offline === true && elapsed >= signInTimeoutMs && elapsed < signInTimeoutMs + 2000,
    `(${elapsed} ms, timeout ${signInTimeoutMs} ms)`);
  // The same server and a budget open from the phone's copy: a sync must give up as well.
  await stalled.openBudget(small);
  const t1 = performance.now();
  const syncStall = await stalled.sync().then(() => null, (e: any) => e);
  const syncElapsed = Math.round(performance.now() - t1);
  check('a server that never answers: sync gives up after its timeout with code network-failure',
    syncStall?.code === 'network-failure' && syncElapsed >= syncTimeoutMs && syncElapsed < syncTimeoutMs + 2000,
    `(${syncStall?.code}, ${syncElapsed} ms, timeout ${syncTimeoutMs} ms)`);
  // The abandoned sync is still waiting. A second call joins it (loot-core runs one sync at a
  // time); once the connection drops, both end, and the second reports the real failure.
  const t2 = performance.now();
  const joined = stalled.sync().then(() => null, (e: any) => e);
  for (const socket of sockets) socket.destroy();
  const second = await joined;
  const secondElapsed = Math.round(performance.now() - t2);
  check('a second sync joins the stalled one and fails with it, before its own timeout, when the connection drops',
    second?.code === 'network-failure' && secondElapsed < syncTimeoutMs, `(${second?.code}, ${secondElapsed} ms)`);
  await stalled.close();
  await new Promise<void>(resolve => silent.close(() => resolve()));

  // Back to the real server, so whatever runs next has a working session.
  const again = await createEngine({ serverURL, password, dataDir });
  check('signs in to the server again after the offline checks',
    again.offline === false && (await again.listBudgets()).length === budgetsExpected);

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
