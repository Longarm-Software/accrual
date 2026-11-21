// The adapter's write path against a stand-in for loot-core: which messages it sends, in what
// order, and what it does when the sync before a write fails or never mockAnswers. Fake data only.
import { createEngine, READY } from './adapter';
import type { Engine, MoveRequest } from './types';

type Answer = (args: unknown) => unknown;
const mockSent: string[] = [];
let mockAnswers: Record<string, Answer> = {};

jest.mock('../../engine/dist/loot-core.rn.js', () => ({
  init: async () => ({
    send: async (name: string, args?: unknown) => {
      mockSent.push(name);
      const answer = mockAnswers[name];
      if (!answer) throw new Error(`unexpected message ${name}`);
      return answer(args);
    },
    q: () => {
      throw new Error('no queries here');
    },
  }),
  defaultDocumentDir: () => '/tmp/accrual-adapter-test',
  getSessionToken: async () => 'token-for-tests',
  onBudgetLoaded: () => () => {},
}));

const month = '2026-11';
// One month of envelope cells: Groceries has $207.62, Dining out is $28.10 over, $312.00 is ready.
const cells = [
  { name: 'budget202611!to-budget', value: 31200 },
  { name: 'budget202611!budget-cat-groceries', value: 72000 },
  { name: 'budget202611!sum-amount-cat-groceries', value: -51238 },
  { name: 'budget202611!leftover-cat-groceries', value: 20762 },
  { name: 'budget202611!budget-cat-dining', value: 22000 },
  { name: 'budget202611!sum-amount-cat-dining', value: -24810 },
  { name: 'budget202611!leftover-cat-dining', value: -2810 },
];
const grouped = [
  {
    id: 'grp-everyday', name: 'Everyday', is_income: false, hidden: false,
    categories: [
      { id: 'cat-groceries', name: 'Groceries', hidden: false },
      { id: 'cat-dining', name: 'Dining out', hidden: false },
    ],
  },
];

beforeEach(() => {
  mockSent.length = 0;
  mockAnswers = {
    'api/sync': async () => {},
    'preferences/get': () => ({ defaultCurrencyCode: 'USD' }),
    'get-budget-bounds': () => ({ start: '2026-01', end: '2027-12' }),
    'get-categories': () => ({ grouped }),
    'envelope-budget-month': () => cells,
    'budget/transfer-category': () => undefined,
    'budget/transfer-available': () => undefined,
    'budget/cover-overspending': () => undefined,
  };
});

afterEach(() => {
  jest.useRealTimers();
});

const engineFor = (preWriteSyncTimeoutMs?: number): Promise<Engine> =>
  createEngine({ serverURL: 'https://budget.example.com', password: 'not-a-real-password', preWriteSyncTimeoutMs });

const move: MoveRequest = { month, from: 'cat-groceries', to: 'cat-dining', amount: 1000, seen: { from: 20762, to: -2810 } };
const cover = { month, category: 'cat-dining', from: READY, amount: 2810, seen: { category: -2810, from: 31200 } };
const code = (promise: Promise<unknown>) => promise.then(() => null, (e: any) => e.code);

it('a move syncs first, then reads the currency, the bounds and the month, checks, and acts', async () => {
  const engine = await engineFor();
  mockSent.length = 0;
  await engine.moveMoney(move);
  expect(mockSent).toEqual([
    'api/sync', 'preferences/get', 'get-budget-bounds', 'preferences/get', 'get-categories', 'envelope-budget-month',
    'budget/transfer-category',
  ]);
});

it('a cover does the same, in the same order', async () => {
  const engine = await engineFor();
  mockSent.length = 0;
  await engine.coverOverspending(cover);
  expect(mockSent).toEqual([
    'api/sync', 'preferences/get', 'get-budget-bounds', 'preferences/get', 'get-categories', 'envelope-budget-month',
    'budget/cover-overspending',
  ]);
});

it('a move from Ready to budget goes through transfer-available, after the same sync and reads', async () => {
  const engine = await engineFor();
  mockSent.length = 0;
  await engine.moveMoney({ month, from: READY, to: 'cat-groceries', amount: 500, seen: { from: 31200, to: 20762 } });
  expect(mockSent[0]).toBe('api/sync');
  expect(mockSent.at(-1)).toBe('budget/transfer-available');
});

it('a failed sync is ignored: the write is made on the phone', async () => {
  mockAnswers['api/sync'] = async () => {
    throw Object.assign(new Error('no server'), { code: 'network-failure' });
  };
  const engine = await engineFor();
  await engine.moveMoney(move);
  await engine.coverOverspending(cover);
  expect(mockSent.filter(m => m.startsWith('budget/'))).toEqual(['budget/transfer-category', 'budget/cover-overspending']);
});

it('an expired session during the sync is ignored too: the Plan\'s own sync after the save signs out', async () => {
  mockAnswers['api/sync'] = async () => {
    throw Object.assign(new Error('expired'), { code: 'token-expired' });
  };
  const engine = await engineFor();
  await engine.moveMoney(move);
  expect(mockSent.at(-1)).toBe('budget/transfer-category');
});

it('a sync that never answers holds the write for the bound only, then it is made', async () => {
  mockAnswers['api/sync'] = () => new Promise(() => {});
  const engine = await engineFor();
  jest.useFakeTimers();
  let done = false;
  const write = engine.moveMoney(move).then(() => {
    done = true;
  });
  await jest.advanceTimersByTimeAsync(2999);
  expect(done).toBe(false);
  expect(mockSent).not.toContain('budget/transfer-category');
  await jest.advanceTimersByTimeAsync(1);
  await write;
  expect(mockSent.at(-1)).toBe('budget/transfer-category');
});

it('the bound can be set', async () => {
  mockAnswers['api/sync'] = () => new Promise(() => {});
  const engine = await engineFor(50);
  jest.useFakeTimers();
  const write = engine.coverOverspending(cover);
  await jest.advanceTimersByTimeAsync(50);
  await write;
  expect(mockSent.at(-1)).toBe('budget/cover-overspending');
});

it('a malformed request is refused before anything is sent', async () => {
  const engine = await engineFor();
  mockSent.length = 0;
  const bad = [
    { ...move, month: '2026-13' },
    { ...move, amount: 0 },
    { ...move, amount: 12.5 },
    { ...move, to: move.from },
    { ...move, to: 'a/b' },
    { ...move, seen: undefined },
  ];
  for (const request of bad) expect(await code(engine.moveMoney(request as any))).toBe('invalid-move');
  expect(await code(engine.coverOverspending({ ...cover, category: READY }))).toBe('invalid-move');
  expect(await code(engine.coverOverspending({ ...cover, month: 'not-a-month' }))).toBe('invalid-move');
  expect(mockSent).toEqual([]);
});

it('figures that differ from what the sheet showed are refused as stale after the sync, and nothing is written', async () => {
  const engine = await engineFor();
  mockSent.length = 0;
  expect(await code(engine.moveMoney({ ...move, seen: { from: 30000, to: -2810 } }))).toBe('stale');
  expect(await code(engine.coverOverspending({ ...cover, seen: { category: -1000, from: 31200 } }))).toBe('stale');
  expect(mockSent.filter(m => m === 'api/sync')).toHaveLength(2);
  expect(mockSent.some(m => m.startsWith('budget/'))).toBe(false);
});
