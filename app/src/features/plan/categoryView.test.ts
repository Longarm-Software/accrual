import type { PlanCategory } from '../../engine/types';
import { fakePlanMonth } from '../../session/fakeEngine';
import { categoryView } from './categoryView';

const all = fakePlanMonth.groups.flatMap(g => g.categories);
const named = (name: string): PlanCategory => {
  const found = all.find(c => c.name === name);
  if (!found) throw new Error(`no fake category ${name}`);
  return found;
};
const nov19 = { month: '2026-11', today: new Date(2026, 10, 19) };
const base: PlanCategory = {
  id: 'x', name: 'X', budgeted: 0, spent: 0, balance: 0, carryover: false, goal: null, longGoal: false,
};

describe('categoryView', () => {
  it('rule 1: overspent', () => {
    expect(categoryView(named('Dining out'), nov19)).toEqual({ status: 'over', note: 'Overspent', fill: 1 });
  });
  it('rule 2: a long goal that is met', () => {
    const c = { ...base, budgeted: 1, balance: 1000000, goal: 1000000, longGoal: true };
    expect(categoryView(c, nov19)).toEqual({ status: 'goal', note: 'Goal reached', fill: 1 });
  });
  it('rule 3: progress towards a long goal', () => {
    const v = categoryView(named('Emergency fund'), nov19);
    expect(v.status).toBe('goal');
    expect(v.note).toBe('64% of $10,000');
    expect(v.fill).toBeCloseTo(0.64);
  });
  it('rule 3: rounds the percent down', () => {
    const c = { ...base, balance: 999, goal: 1000, longGoal: true };
    expect(categoryView(c, nov19).note).toBe('99% of $10');
  });
  it('rule 4: a monthly goal that needs more', () => {
    const v = categoryView(named('Insurance'), nov19);
    expect(v.status).toBe('needs');
    expect(v.note).toBe('$40.00 more needed');
    expect(v.fill).toBeCloseTo(0.714, 3);
  });
  it('rule 5: nothing at all', () => {
    expect(categoryView(base, nov19)).toEqual({ status: 'idle', note: 'Nothing budgeted', fill: 0 });
  });
  it('rule 6: fully spent', () => {
    expect(categoryView(named('Rent'), nov19)).toEqual({ status: 'spent', note: 'Fully spent', fill: 1 });
  });
  it.each([
    [570000, '57% of $10,000'],
    [290000, '29% of $10,000'],
    [580000, '58% of $10,000'],
  ])('rule 3: %i of $10,000 is not one percent low', (balance, note) => {
    const c = { ...base, balance, goal: 1000000, longGoal: true };
    expect(categoryView(c, nov19).note).toBe(note);
  });
  it('rule 7: a past month nobody spent from says left over', () => {
    const v = categoryView(named('Electricity'), { month: '2026-10', today: new Date(2026, 10, 19) });
    expect(v).toEqual({ status: 'ok', note: '$120.00 left over', fill: 0 });
  });
  it('rule 7: a future month nobody spent from says Budgeted', () => {
    const v = categoryView(named('Electricity'), { month: '2026-12', today: new Date(2026, 10, 19) });
    expect(v).toEqual({ status: 'ok', note: 'Budgeted', fill: 0 });
  });
  it('rule 8: a pace that rounds to $0 shows the balance and the days instead', () => {
    const c = { ...base, budgeted: 1000, spent: -970, balance: 30 };
    expect(categoryView(c, nov19).note).toBe('$0.30 left for 12 days');
  });
  it('rule 8: the smallest balance that still shows a pace (50 cents a day)', () => {
    const just = { ...base, budgeted: 1000, spent: -400, balance: 600 };
    const under = { ...base, budgeted: 1000, spent: -401, balance: 599 };
    expect(categoryView(just, nov19).note).toBe('$1 a day for 12 days');
    expect(categoryView(under, nov19).note).toBe('$5.99 left for 12 days');
  });
  it('rule 7: not spent yet', () => {
    expect(categoryView(named('Electricity'), nov19)).toEqual({ status: 'ok', note: 'Not spent yet', fill: 0 });
  });
  it('rule 8: a daily pace in the current month', () => {
    const v = categoryView(named('Groceries'), nov19);
    expect(v.status).toBe('ok');
    expect(v.note).toBe('$17 a day for 12 days');
    expect(v.fill).toBeCloseTo(0.712, 3);
  });
  it('rule 8: still applies on the second to last day', () => {
    const v = categoryView(named('Groceries'), { month: '2026-11', today: new Date(2026, 10, 29) });
    expect(v.note).toBe('$104 a day for 2 days');
  });
  it('rule 9: the last day', () => {
    const v = categoryView(named('Groceries'), { month: '2026-11', today: new Date(2026, 10, 30) });
    expect(v.status).toBe('ok');
    expect(v.note).toBe('$207.62 left today');
    expect(v.fill).toBeCloseTo(0.712, 3);
  });
  it('rule 10: a past month', () => {
    const v = categoryView(named('Groceries'), { month: '2026-10', today: new Date(2026, 10, 19) });
    expect(v.status).toBe('ok');
    expect(v.note).toBe('$207.62 left over');
  });
  it('rule 11: a future month', () => {
    const v = categoryView(named('Groceries'), { month: '2026-12', today: new Date(2026, 10, 19) });
    expect(v.status).toBe('ok');
    expect(v.note).toBe('Budgeted');
    expect(v.fill).toBeCloseTo(0.712, 3);
  });
  it('order: overspent beats a monthly goal', () => {
    const c = { ...named('Insurance'), balance: -500, spent: -10500 };
    expect(categoryView(c, nov19).status).toBe('over');
  });
  it('order: overspent beats a long goal', () => {
    const c = { ...named('Emergency fund'), balance: -1 };
    expect(categoryView(c, nov19).status).toBe('over');
  });
  it('order: a monthly goal that needs more beats idle', () => {
    // Pinned: rule 4 comes before rule 5, so an untouched category with a goal says "needed", not "Nothing budgeted".
    const c = { ...base, goal: 5000 };
    expect(categoryView(c, nov19)).toEqual({ status: 'needs', note: '$50.00 more needed', fill: 0 });
  });
  it('order: a met monthly goal falls through to the other rules', () => {
    const c = { ...named('Insurance'), budgeted: 14000, balance: 14000 };
    expect(categoryView(c, nov19).note).toBe('Not spent yet');
  });
  it('clamp: a balance above a long goal never fills past 1', () => {
    const c = { ...base, balance: 2000000, goal: 1000000, longGoal: true };
    expect(categoryView(c, nov19).fill).toBe(1);
  });
  it('clamp: a negative budgeted never fills below 0', () => {
    const c = { ...base, budgeted: -100, goal: 5000 };
    expect(categoryView(c, nov19).fill).toBe(0);
  });
  it('a net refund counts as not spent from', () => {
    const c = { ...base, budgeted: 1000, spent: 500, balance: 1500 };
    expect(categoryView(c, nov19)).toEqual({ status: 'ok', note: 'Not spent yet', fill: 0 });
  });
});
