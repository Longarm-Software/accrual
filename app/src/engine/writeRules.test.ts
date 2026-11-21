import { READY } from './types';
import type { PlanMonth } from './types';
import { MAX_AMOUNT, checkCover, checkMonthAndAmount, checkMove, checkTransaction, isDate, isMonth } from './writeRules';

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

describe('checkMove', () => {
  const move = (from: string, to: string, amount: number) => code(() => checkMove(plan, { from, to, amount }));
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
    expect(code(() => checkMove({ ...plan, toBudget: -10 }, { from: READY, to: 'cat-a', amount: 1 }))).toBe('stale');
  });
});

describe('checkCover', () => {
  const cover = (category: string, from: string, amount: number, p = plan) =>
    code(() => checkCover(p, { category, from, amount }));
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
  keep(() => checkMove(plan, { from: 'cat-a', to: 'cat-b', amount: 3001 }));
  keep(() => checkMove(plan, { from: 'cat-unknown', to: 'cat-b', amount: 1 }));
  keep(() => checkCover(plan, { category: 'cat-b', from: 'cat-a', amount: 401 }));
  keep(() => checkMonthAndAmount('2099-01', 777, bounds));
  keep(() => checkTransaction({ date: '2026-02-30', amount: 777 }));
  expect(messages).toHaveLength(5);
  for (const m of messages) expect(m).not.toMatch(/cat-|Name of|\d/);
});
