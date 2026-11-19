// Scripted on-device run of the spike, so a simulator or emulator can be checked
// against the reference client without tapping. Off unless app/.env.local
// (gitignored) sets it up; see "Scripted run" in app/README.md.
//
// Each step is recorded as one JSON line in <documents>/spike-events.jsonl,
// which harness/device-check.ts reads on the host. Budget months are recorded
// as digests, so nothing but ids and hashes leaves the app.
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { digest } from './digest';
import type { Engine } from '../engine/adapter';

// Written out in full on purpose: Expo only inlines `process.env.EXPO_PUBLIC_*`
// into a release bundle when it appears literally.
const password = process.env.EXPO_PUBLIC_SPIKE_PASSWORD;
export const autorunConfig =
  process.env.EXPO_PUBLIC_SPIKE_AUTORUN === '1' && password
    ? {
        serverURL:
          process.env.EXPO_PUBLIC_SPIKE_SERVER_URL ??
          (Platform.OS === 'android' ? 'http://10.0.2.2:5007' : 'http://127.0.0.1:5007'),
        password,
      }
    : null;

const eventsFile = () => new File(Paths.document, 'spike-events.jsonl');
const doneMarker = () => new File(Paths.document, 'spike-full-run-done');

function record(event: Record<string, unknown>) {
  const line = JSON.stringify({ platform: Platform.OS, at: new Date().toISOString(), ...event });
  console.log('SPIKE_EVENT ' + line);
  const file = eventsFile();
  const previous = file.exists ? file.textSync() : '';
  if (!file.exists) file.create();
  file.write(previous + line + '\n');
}

const pad = (n: number) => String(n).padStart(2, '0');
function monthsBack(count: number) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
  });
}
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function autorun(say: (line: string) => void) {
  if (!autorunConfig) return;
  const timings: Record<string, number> = {};
  async function timed<T>(label: string, fn: () => Promise<T> | T): Promise<T> {
    const t0 = performance.now();
    const result = await fn();
    timings[label] = Math.round(performance.now() - t0);
    say(`✓ ${label}: ${timings[label]} ms`);
    return result;
  }
  const monthDigests = async (engine: Engine, months: string[]) => {
    const out: Record<string, string> = {};
    for (const month of months) out[month] = digest(await engine.getMonth(month));
    return out;
  };

  try {
    const cold = doneMarker().exists;
    say(`autorun: ${cold ? 'cold start' : 'full run'} against ${autorunConfig.serverURL}`);
    const { createEngine } = await timed('load engine bundle', () => require('../engine/adapter'));
    const engine: Engine = await timed('init + sign in', () => createEngine(autorunConfig!));
    const budgets = await timed('list budgets', () => engine.listBudgets());
    const small = budgets.find(b => b.name === 'Spike Small');
    const large = budgets.find(b => b.name === 'Spike Large');
    if (!small || !large) throw new Error('Seeded budgets not found: ' + budgets.map(b => b.name).join(', '));
    const month = monthsBack(1)[0];
    const today = new Date().toISOString().slice(0, 10);

    if (cold) {
      await timed('large: open local copy + sync', () => engine.openBudget(large.groupId));
      await timed('large: read current month', () => engine.getMonth(month));
      await timed('large: sync (nothing new)', () => engine.sync());
      await engine.close();
      record({ event: 'cold', timings });
      say('autorun: cold start done');
      return;
    }

    const tag = `device-${Platform.OS}-${Date.now()}`;
    const groceriesIn = async () =>
      (await engine.getMonth(month)).categoryGroups.flatMap(g => g.categories).find(c => c.name === 'Groceries')!;
    const checkingIn = async () => (await engine.getAccounts()).find(a => a.name === 'Everyday Checking')!;

    // --- Small budget: numbers, engine -> server, and the native SQL functions
    await timed('small: download + open', () => engine.openBudget(small.groupId));
    const smallChecking = await checkingIn();
    const smallGroceries = await groceriesIn();
    await engine.addTransaction(smallChecking.id, {
      date: today, amount: -1234, payee_name: 'Zoë’s Bakery', category: smallGroceries.id, notes: `${tag}-phone`,
    });
    // Same payee in upper case: must match the existing one through UNICODE_LOWER/NORMALISE.
    await engine.addTransaction(smallChecking.id, {
      date: today, amount: -999, payee_name: 'ZOË’S BAKERY', notes: `${tag}-upper`,
    });
    await timed('small: sync after adding 2 transactions', () => engine.sync());
    const searches: Record<string, string[]> = {};
    for (const text of ['ZOE', 'zoë', 'Grocer', 'TRIP', 'no-such-payee', '100%']) {
      searches[text] = (await engine.searchTransactions(text)).map(t => t.id).sort();
    }
    record({
      event: 'small',
      groupId: small.groupId,
      accountId: smallChecking.id,
      categoryId: smallGroceries.id,
      date: today,
      phoneNotes: `${tag}-phone`,
      months: await monthDigests(engine, monthsBack(4)),
      searches,
    });

    // --- Large budget: timings, numbers, then wait for an edit from another client
    await timed('large: download + open', () => engine.openBudget(large.groupId));
    await timed('large: read current month', () => engine.getMonth(month));
    const largeChecking = await checkingIn();
    const largeGroceries = await groceriesIn();
    const count = (await timed('large: read all transactions', () =>
      engine.getTransactions(undefined as any, '2000-01-01', today))).length;
    await engine.addTransaction(largeChecking.id, { date: today, amount: -100, notes: `${tag}-phone` });
    await timed('large: sync after adding 1 transaction', () => engine.sync());
    await timed('large: sync (nothing new)', () => engine.sync());
    const largeMonths = await timed('large: read 36 months', () => monthDigests(engine, monthsBack(36)));
    const refNotes = `${tag}-web`;
    const refBudgeted = largeGroceries.budgeted + 12345;
    record({
      event: 'large',
      groupId: large.groupId,
      accountId: largeChecking.id,
      categoryId: largeGroceries.id,
      date: today,
      month,
      phoneNotes: `${tag}-phone`,
      refNotes,
      refAmount: -4321,
      refBudgeted,
      transactionCount: count,
      months: largeMonths,
      timings,
    });

    say('autorun: waiting for the reference client to edit the large budget…');
    let arrived = false;
    for (let i = 0; i < 300 && !arrived; i++) {
      await sleep(2000);
      await engine.sync();
      const mine = (await engine.getTransactions(largeChecking.id, today, today)).filter(t => t.notes === refNotes);
      arrived = mine.length === 1 && mine[0].amount === -4321 && (await groceriesIn()).budgeted === refBudgeted;
    }
    record({
      event: 'two-way',
      groupId: large.groupId,
      arrived,
      months: arrived ? await monthDigests(engine, monthsBack(36)) : {},
    });
    await engine.close();
    if (arrived) doneMarker().create();
    say(arrived ? 'autorun: full run done' : '✗ autorun: the reference edit never arrived');
  } catch (err) {
    const message = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
    say(`✗ autorun: ${message}`);
    record({ event: 'error', message, timings });
  }
}
