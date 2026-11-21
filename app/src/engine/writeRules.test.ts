import { READY } from './types';
import type { PlanMonth } from './types';
import {
  MAX_AMOUNT, checkCover, checkCoverShape, checkMonthAndAmount, checkMove, checkMoveShape, checkTransaction, isDate, isMonth,
} from './writeRules';

const cat = (id: string, balance: number) => ({
  id, name: `Name of ${id}`, budgeted: 1000, spent: 0, balance, carryover: false, goal: null, longGoal: false,
});
const plan: PlanMonth = {
  month: '2026-11',
  toBudget: 5000,
  totalIncome: 0,
  totalBudgeted: 0,
  totalSpent: 0,
  groups: [{ id: 'grp', name: 'Group', categories: [cat('cat-a', 3000), cat('cat-b', -400), cat('cat-c', 0)] }],
};
const bounds = { start: '2026-01', end: '2027-12' };

const code = (fn: () => void) => {
  try {
    fn();
  } catch (e: any) {
    return e.code;
  }
  return null;
};

describe('isMonth and isDate', () => {
  test('months are YYYY-MM with month 01 to 12, years from 1000', () => {
    expect(['2026-01', '2026-12', '1000-06'].every(isMonth)).toBe(true);
    expect(['2026-00', '2026-13', '0999-01', '2026-1', '202611', '', 'not-a-month', 202611, null].some(isMonth))
      .toBe(false);
  });
  test('dates must exist on the calendar', () => {
    expect(['2026-11-21', '2024-02-29', '2026-12-31', '2026-01-01'].every(isDate)).toBe(true);
    expect(['2026-02-29', '2026-02-30', '2026-04-31', '2026-13-01', '2026-11-00', '2026-11-1', '0999-01-01',
      '2026-11-21T00:00', '', 20261121, undefined].some(isDate)).toBe(false);
  });
});

describe('checkMonthAndAmount', () => {
  test('accepts a month in the bounds and a whole positive amount up to the maximum', () => {
    expect(code(() => checkMonthAndAmount('2026-01', 1, bounds))).toBeNull();
    expect(code(() => checkMonthAndAmount('2027-12', MAX_AMOUNT, bounds))).toBeNull();
  });
  test('rejects other months and amounts with invalid-move', () => {
    for (const month of ['2025-12', '2028-01', '2026-13', 'not-a-month', '']) {
      expect(code(() => checkMonthAndAmount(month, 100, bounds))).toBe('invalid-move');
    }
    for (const amount of [0, -1, 12.5, NaN, Infinity, MAX_AMOUNT + 1, '100' as any]) {
      expect(code(() => checkMonthAndAmount('2026-11', amount, bounds))).toBe('invalid-move');
    }
  });
});

// What a sheet drawn from `p` saw of a pot: READY's toBudget, a category's balance (0 for one it does not have).
const has = (id: string, p = plan) =>
  id === READY ? p.toBudget : (p.groups.flatMap(g => g.categories).find(c => c.id === id)?.balance ?? 0);
const fresh = (from: string, to: string, p = plan) => ({ from: has(from, p), to: has(to, p) });

describe('checkMove', () => {
  const move = (from: string, to: string, amount: number) =>
    code(() => checkMove(plan, { month: '2026-11', from, to, amount, seen: fresh(from, to) }));
  test('allows moves between categories and Ready to budget within what the source has', () => {
    expect(move('cat-a', 'cat-b', 3000)).toBeNull();
    expect(move('cat-a', READY, 1)).toBeNull();
    expect(move(READY, 'cat-c', 5000)).toBeNull();
  });
  test('rejects a pot that is not a visible expense category or READY, or the same pot twice', () => {
    for (const id of ['', 'overbudgeted', 'cat-unknown', 'cat-income']) {
      expect(move(id, 'cat-b', 1)).toBe('invalid-move');
      expect(move('cat-a', id, 1)).toBe('invalid-move');
    }
    expect(move('cat-a', 'cat-a', 1)).toBe('invalid-move');
    expect(move(READY, READY, 1)).toBe('invalid-move');
  });
  test('rejects more than the source has with stale', () => {
    expect(move('cat-a', 'cat-b', 3001)).toBe('stale');
    expect(move('cat-b', 'cat-a', 1)).toBe('stale');
    expect(move('cat-c', READY, 1)).toBe('stale');
    expect(move(READY, 'cat-a', 5001)).toBe('stale');
    const short = { ...plan, toBudget: -10 };
    expect(code(() => checkMove(short, { month: '2026-11', from: READY, to: 'cat-a', amount: 1, seen: fresh(READY, 'cat-a', short) })))
      .toBe('stale');
  });
  test('rejects with stale when either pot has other figures than the sheet saw, even when the move is still allowed', () => {
    const request = { month: '2026-11', from: 'cat-a', to: 'cat-b', amount: 100 };
    expect(code(() => checkMove(plan, { ...request, seen: { from: 3000, to: -400 } }))).toBeNull();
    expect(code(() => checkMove(plan, { ...request, seen: { from: 3500, to: -400 } }))).toBe('stale');
    expect(code(() => checkMove(plan, { ...request, seen: { from: 3000, to: -300 } }))).toBe('stale');
    expect(code(() => checkMove(plan, { ...request, from: READY, seen: { from: 4999, to: -400 } }))).toBe('stale');
  });
  test('refuses a request without the figures it was drawn from', () => {
    expect(code(() => checkMove(plan, { month: '2026-11', from: 'cat-a', to: 'cat-b', amount: 100 } as any))).toBe('invalid-move');
    expect(code(() => checkMove(plan, { month: '2026-11', from: 'cat-a', to: 'cat-b', amount: 100, seen: { from: 3000 } } as any)))
      .toBe('invalid-move');
  });
});

describe('checkCover', () => {
  const cover = (category: string, from: string, amount: number, p = plan) =>
    code(() => checkCover(p, { month: '2026-11', category, from, amount, seen: { category: has(category, p), from: has(from, p) } }));
  test('allows covering all or part of the overspending from a pot that has the amount', () => {
    expect(cover('cat-b', 'cat-a', 400)).toBeNull();
    expect(cover('cat-b', READY, 100)).toBeNull();
  });
  test('rejects READY or an unknown pot as the category, an unknown source, or the same pot twice', () => {
    expect(cover(READY, 'cat-a', 100)).toBe('invalid-move');
    for (const id of ['', 'overbudgeted', 'cat-unknown']) {
      expect(cover(id, 'cat-a', 100)).toBe('invalid-move');
      expect(cover('cat-b', id, 100)).toBe('invalid-move');
    }
    expect(cover('cat-b', 'cat-b', 100)).toBe('invalid-move');
  });
  test('rejects with stale when the category is not overspent, the amount is more than it is over, or the source is short', () => {
    expect(cover('cat-a', READY, 100)).toBe('stale');
    expect(cover('cat-c', READY, 100)).toBe('stale');
    expect(cover('cat-b', 'cat-a', 401)).toBe('stale');
    expect(cover('cat-b', 'cat-c', 100)).toBe('stale');
    expect(cover('cat-b', READY, 400, { ...plan, toBudget: 399 })).toBe('stale');
  });
  test('rejects with stale when the category or the source has other figures than the sheet saw', () => {
    const request = { month: '2026-11', category: 'cat-b', from: 'cat-a', amount: 400 };
    expect(code(() => checkCover(plan, { ...request, seen: { category: -400, from: 3000 } }))).toBeNull();
    // Overspent by more than was shown: covering what was shown would leave it still over.
    expect(code(() => checkCover(plan, { ...request, seen: { category: -300, from: 3000 } }))).toBe('stale');
    expect(code(() => checkCover(plan, { ...request, amount: 300, seen: { category: -300, from: 3000 } }))).toBe('stale');
    expect(code(() => checkCover(plan, { ...request, seen: { category: -400, from: 2000 } }))).toBe('stale');
  });
  test('refuses a request without the figures it was drawn from', () => {
    expect(code(() => checkCover(plan, { month: '2026-11', category: 'cat-b', from: 'cat-a', amount: 400 } as any))).toBe('invalid-move');
  });
});

describe('checkMoveShape and checkCoverShape: what can be refused without reading the budget', () => {
  const move = { month: '2026-11', from: 'cat-a', to: 'cat-b', amount: 100, seen: { from: 3000, to: -400 } };
  const cover = { month: '2026-11', category: 'cat-b', from: 'cat-a', amount: 100, seen: { category: -400, from: 3000 } };
  test('accepts a well-formed request whatever the budget holds', () => {
    expect(code(() => checkMoveShape(move))).toBeNull();
    expect(code(() => checkMoveShape({ ...move, from: 'cat-unknown', seen: { from: -1, to: 0 } }))).toBeNull();
    expect(code(() => checkCoverShape(cover))).toBeNull();
  });
  test('refuses a malformed month, amount, id or seen, the same pot twice, and READY as the covered category', () => {
    const bad = [
      { ...move, month: '2026-13' }, { ...move, month: 'not-a-month' }, { ...move, amount: 0 }, { ...move, amount: 1.5 },
      { ...move, amount: MAX_AMOUNT + 1 }, { ...move, from: '' }, { ...move, to: 'a/b' }, { ...move, to: 'cat-a' },
      { ...move, seen: undefined }, { ...move, seen: { from: 1.5, to: 0 } }, { ...move, seen: { from: '1', to: 0 } }, null,
    ];
    for (const request of bad) expect(code(() => checkMoveShape(request as any))).toBe('invalid-move');
    const badCovers = [
      { ...cover, month: '2026-00' }, { ...cover, amount: -1 }, { ...cover, category: READY }, { ...cover, from: 'cat-b' },
      { ...cover, from: 'x y' }, { ...cover, seen: { category: -400 } }, { ...cover, seen: null },
    ];
    for (const request of badCovers) expect(code(() => checkCoverShape(request as any))).toBe('invalid-move');
  });
});

describe('checkTransaction', () => {
  test('accepts a real date and a non-zero whole amount within the maximum, either sign', () => {
    expect(code(() => checkTransaction({ date: '2026-11-21', amount: -1234 }))).toBeNull();
    expect(code(() => checkTransaction({ date: '2024-02-29', amount: MAX_AMOUNT }))).toBeNull();
    expect(code(() => checkTransaction({ date: '2024-02-29', amount: -MAX_AMOUNT }))).toBeNull();
  });
  test('rejects a bad date or amount with invalid-transaction', () => {
    for (const date of ['2026-02-30', '2026-11-21 ', 'today', '']) {
      expect(code(() => checkTransaction({ date, amount: -100 }))).toBe('invalid-transaction');
    }
    for (const amount of [0, 1.5, NaN, -Infinity, MAX_AMOUNT + 1, -MAX_AMOUNT - 1]) {
      expect(code(() => checkTransaction({ date: '2026-11-21', amount }))).toBe('invalid-transaction');
    }
  });
});

test('error messages carry no ids, names or amounts', () => {
  const messages: string[] = [];
  const keep = (fn: () => void) => {
    try {
      fn();
    } catch (e: any) {
      messages.push(e.message);
    }
  };
  keep(() => checkMove(plan, { month: '2026-11', from: 'cat-a', to: 'cat-b', amount: 3001, seen: fresh('cat-a', 'cat-b') }));
  keep(() => checkMove(plan, { month: '2026-11', from: 'cat-unknown', to: 'cat-b', amount: 1, seen: fresh('cat-unknown', 'cat-b') }));
  keep(() => checkMove(plan, { month: '2026-11', from: 'cat-a', to: 'cat-b', amount: 1, seen: { from: 777, to: 777 } }));
  keep(() => checkCover(plan, { month: '2026-11', category: 'cat-b', from: 'cat-a', amount: 401, seen: { category: -400, from: 3000 } }));
  keep(() => checkMonthAndAmount('2099-01', 777, bounds));
  keep(() => checkTransaction({ date: '2026-02-30', amount: 777 }));
  expect(messages).toHaveLength(6);
  for (const m of messages) expect(m).not.toMatch(/cat-|Name of|\d/);
});
