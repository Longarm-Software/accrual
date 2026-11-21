import { READY } from '../engine/types';
import type { PlanMonth } from '../engine/types';
import { fakeActivity, fakeEngine, fakePlanMonth, withCategory } from './fakeEngine';

const month = fakePlanMonth.month;
const category = (plan: PlanMonth, id: string) => plan.groups.flatMap(g => g.categories).find(c => c.id === id)!;
const p0 = fakePlanMonth;
const code = (promise: Promise<unknown>) => promise.then(() => null, (e: any) => e.code);
// What a sheet drawn from `plan` saw of a pot.
const has = (plan: PlanMonth, id: string) => (id === READY ? plan.toBudget : (category(plan, id)?.balance ?? 0));
const seenMove = (plan: PlanMonth, from: string, to: string) => ({ from: has(plan, from), to: has(plan, to) });
const seenCover = (plan: PlanMonth, cat: string, from: string) => ({ category: has(plan, cat), from: has(plan, from) });

test('a move changes both pots, and totalBudgeted only when Ready to budget is one end', async () => {
  const engine = fakeEngine();
  await engine.moveMoney({ month, from: 'cat-groceries', to: 'cat-electricity', amount: 1000, seen: seenMove(p0, 'cat-groceries', 'cat-electricity') });
  let plan = await engine.getPlanMonth(month);
  expect([category(plan, 'cat-groceries').budgeted, category(plan, 'cat-groceries').balance]).toEqual([71000, 19762]);
  expect([category(plan, 'cat-electricity').budgeted, category(plan, 'cat-electricity').balance]).toEqual([13000, 13000]);
  expect([plan.toBudget, plan.totalBudgeted]).toEqual([31200, 588000]);

  await engine.moveMoney({ month, from: READY, to: 'cat-rent', amount: 200, seen: seenMove(plan, READY, 'cat-rent') });
  plan = await engine.getPlanMonth(month);
  expect([plan.toBudget, plan.totalBudgeted, category(plan, 'cat-rent').budgeted]).toEqual([31000, 588200, 185200]);

  await engine.moveMoney({ month, from: 'cat-rent', to: READY, amount: 200, seen: seenMove(plan, 'cat-rent', READY) });
  plan = await engine.getPlanMonth(month);
  expect([plan.toBudget, plan.totalBudgeted]).toEqual([31200, 588000]);
  expect(fakePlanMonth.toBudget).toBe(31200);
});

test('a cover moves exactly the amount into the overspent category', async () => {
  const engine = fakeEngine();
  await engine.coverOverspending({ month, category: 'cat-dining', from: 'cat-electricity', amount: 2810, seen: seenCover(p0, 'cat-dining', 'cat-electricity') });
  const plan = await engine.getPlanMonth(month);
  expect([category(plan, 'cat-dining').balance, category(plan, 'cat-electricity').balance]).toEqual([0, 9190]);
});

test('the fake refuses what the adapter refuses, and changes nothing', async () => {
  const engine = fakeEngine();
  expect(await code(engine.moveMoney({ month, from: 'cat-rent', to: 'cat-dining', amount: 1, seen: seenMove(p0, 'cat-rent', 'cat-dining') }))).toBe('stale');
  expect(await code(engine.moveMoney({ month, from: READY, to: 'cat-dining', amount: 31201, seen: seenMove(p0, READY, 'cat-dining') }))).toBe('stale');
  expect(await code(engine.moveMoney({ month, from: 'cat-salary', to: 'cat-dining', amount: 1, seen: seenMove(p0, 'cat-salary', 'cat-dining') }))).toBe('invalid-move');
  expect(await code(engine.moveMoney({ month: '2030-01', from: READY, to: 'cat-dining', amount: 1, seen: seenMove(p0, READY, 'cat-dining') }))).toBe('invalid-move');
  expect(await code(engine.moveMoney({ month, from: READY, to: 'cat-dining', amount: 1.5, seen: seenMove(p0, READY, 'cat-dining') }))).toBe('invalid-move');
  expect(await code(engine.coverOverspending({ month, category: READY, from: 'cat-rent', amount: 1, seen: seenCover(p0, READY, 'cat-rent') }))).toBe('invalid-move');
  expect(await code(engine.coverOverspending({ month, category: 'cat-groceries', from: READY, amount: 1, seen: seenCover(p0, 'cat-groceries', READY) }))).toBe('stale');
  expect(await code(engine.coverOverspending({ month, category: 'cat-dining', from: READY, amount: 2811, seen: seenCover(p0, 'cat-dining', READY) }))).toBe('stale');
  expect(await code(engine.addTransaction('acct-checking', { date: '2026-02-30', amount: -100 }))).toBe('invalid-transaction');
  expect(await code(engine.addTransaction('acct-checking', { date: '2026-11-21', amount: 0 }))).toBe('invalid-transaction');
  expect(await code(engine.moveMoney({ month, from: 'cat-groceries', to: 'cat-rent', amount: 1 } as any))).toBe('invalid-move');
  expect(await code(engine.moveMoney({ month, from: 'cat-groceries', to: 'cat-rent', amount: 1, seen: { from: 1, to: 0 } })))
    .toBe('stale');
  expect(await engine.getPlanMonth(month)).toBe(fakePlanMonth);
});

test('a change made elsewhere is what the next read and the next write see', async () => {
  const engine = fakeEngine();
  engine.elsewhere(plan => withCategory(plan, 'cat-groceries', { balance: 1000 }));
  expect(category(await engine.getPlanMonth(month), 'cat-groceries').balance).toBe(1000);
  // The sheet drew Groceries at $207.62: refused, though $5.00 is still there.
  expect(await code(engine.moveMoney({ month, from: 'cat-groceries', to: 'cat-rent', amount: 500, seen: seenMove(p0, 'cat-groceries', 'cat-rent') })))
    .toBe('stale');
  const now = await engine.getPlanMonth(month);
  await engine.moveMoney({ month, from: 'cat-groceries', to: 'cat-rent', amount: 500, seen: seenMove(now, 'cat-groceries', 'cat-rent') });
  expect(category(await engine.getPlanMonth(month), 'cat-groceries').balance).toBe(500);
});

test("a category's activity is that month's rows only", async () => {
  const engine = fakeEngine();
  expect(await engine.getCategoryActivity('cat-dining', month)).toEqual(fakeActivity);
  expect(await engine.getCategoryActivity('cat-dining', '2026-10')).toEqual([]);
  expect(await engine.getCategoryActivity('cat-groceries', month)).toEqual([]);
});
