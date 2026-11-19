// Checks a scripted on-device run (src/autorun.ts) against the official
// @actual-app/api client on the same throwaway server. Usage:
//   tsx --env-file=../server/.env harness/device-check.ts <spike-events.jsonl>
//
// Run it once the app has logged "waiting for the reference client": it checks
// what the app read, then edits the large budget as a second client. Run it
// again after "full run done" to check that the edit reached the app.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import { digest } from '../src/digest';

const serverDir = path.join(__dirname, '..', '..', 'server');
if (!process.env.SPIKE_SERVER_PASSWORD) throw new Error('SPIKE_SERVER_PASSWORD is not set (see spike/README.md)');
const file = process.argv[2];
if (!file) throw new Error('Usage: device-check.ts <spike-events.jsonl>');

const reference = (...args: string[]) =>
  JSON.parse(
    execFileSync(process.execPath, [path.join(serverDir, 'scripts', 'reference.mjs'), ...args], {
      maxBuffer: 256 * 1024 * 1024,
    }).toString(),
  );

let failures = 0;
function check(label: string, ok: boolean, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
  if (!ok) failures++;
}
function compareMonths(label: string, groupId: string, digests: Record<string, string>) {
  const months = Object.keys(digests);
  const expected: any[] = reference('months', groupId, months.join(','));
  const wrong = months.filter((month, i) => digest(expected[i]) !== digests[month]);
  const cells = expected.reduce(
    (n, m) => n + m.categoryGroups.reduce((c: number, g: any) => c + g.categories.length * 3, 0), 0);
  check(`${label}: ${months.length} months identical to @actual-app/api`, wrong.length === 0,
    wrong.length ? `(differ: ${wrong.join(', ')})` : `(${cells} budgeted/spent/balance cells)`);
}

const events: any[] = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
const last = (name: string) => events.filter(e => e.event === name).at(-1);
for (const e of events.filter(e => e.event === 'error')) check('app reported an error', false, e.message);

const small = last('small');
const large = last('large');
const twoWay = last('two-way');
const cold = last('cold');
const platform = events[0]?.platform ?? 'device';

if (twoWay) {
  check(`${platform}: server -> engine: transaction and budget edit from another client arrive`, twoWay.arrived);
  if (twoWay.arrived) compareMonths(`${platform} large, after two-way sync`, twoWay.groupId, twoWay.months);
} else if (small && large) {
  compareMonths(`${platform} small`, small.groupId, small.months);
  const seen = reference('find', small.groupId, small.accountId, small.date, small.phoneNotes);
  check(`${platform}: engine -> server: transaction added on the device reaches another client`,
    seen.length === 1 && seen[0].amount === -1234 && seen[0].category === small.categoryId);
  for (const [text, ids] of Object.entries<string[]>(small.searches)) {
    const expected = reference('search', small.groupId, text);
    check(`${platform}: search "${text}" returns the same transactions as @actual-app/api`,
      isDeepStrictEqual(ids, [...expected.ids].sort()), `(${ids.length})`);
    if (text === 'ZOE') {
      check(`${platform}: payee matched case-insensitively across non-ASCII (no duplicate payee)`,
        expected.bakeryPayees.length === 1, `(${expected.bakeryPayees.join(', ')})`);
    }
  }

  compareMonths(`${platform} large`, large.groupId, large.months);
  check(`${platform}: large budget has 10,000+ transactions`, large.transactionCount >= 10000,
    `(${large.transactionCount})`);
  const seenLarge = reference('find', large.groupId, large.accountId, large.date, large.phoneNotes);
  check(`${platform}: engine -> server on the large budget`, seenLarge.length === 1 && seenLarge[0].amount === -100);

  reference('edit', large.groupId, large.accountId, large.date, String(large.refAmount), large.refNotes,
    large.month, large.categoryId, String(large.refBudgeted));
  console.log('Edited the large budget as a second client. Run this again when the app says "full run done".');
} else if (!cold) {
  check('the app recorded a run', false, `(events: ${events.map(e => e.event).join(', ') || 'none'})`);
}

if (large) console.table(large.timings);
if (cold) console.table(cold.timings);
if (failures) {
  console.log(`${failures} check(s) FAILED`);
  process.exit(1);
}
console.log('All checks passed');
