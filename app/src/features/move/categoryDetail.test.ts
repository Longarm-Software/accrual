import type { PlanCategory } from '../../engine/types';
import { fakeActivity, fakePlanMonth } from '../../session/fakeEngine';
import type { ActivityRow } from '../../engine/types';
import { activityDateLabel, activityHeading, activityLines, activityTotal, detailRows } from './categoryDetail';

const named = (name: string): PlanCategory => fakePlanMonth.groups.flatMap(g => g.categories).find(c => c.name === name)!;
const base: PlanCategory = {
  id: 'x', name: 'X', budgeted: 0, spent: 0, balance: 0, carryover: false, goal: null, longGoal: false,
};
const nov19 = new Date(2026, 10, 19, 21, 30);

describe('detailRows', () => {
  it('Budgeted, Spent and Left; no Carried in when nothing was carried', () => {
    expect(detailRows(named('Groceries'))).toEqual([
      { label: 'Budgeted', amount: 72000, tone: 'plain' },
      { label: 'Spent', amount: -51238, tone: 'plain' },
      { label: 'Left', amount: 20762, tone: 'plain' },
    ]);
  });
  it('Left is coral when overspent', () => {
    expect(detailRows(named('Dining out'))).toEqual([
      { label: 'Budgeted', amount: 22000, tone: 'plain' },
      { label: 'Spent', amount: -24810, tone: 'plain' },
      { label: 'Left', amount: -2810, tone: 'over' },
    ]);
  });
  it('Carried in: the balance less budgeted and spent, plain when positive', () => {
    expect(detailRows(named('Emergency fund'))).toEqual([
      { label: 'Budgeted', amount: 40000, tone: 'plain' },
      { label: 'Spent', amount: 0, tone: 'plain' },
      { label: 'Carried in', amount: 600000, tone: 'plain' },
      { label: 'Left', amount: 640000, tone: 'plain' },
    ]);
  });
  it('Carried in is coral when negative; Left is quiet when it is negative but rolls over', () => {
    const c = { ...base, budgeted: 10000, spent: -2000, balance: -4000, carryover: true };
    expect(detailRows(c)).toEqual([
      { label: 'Budgeted', amount: 10000, tone: 'plain' },
      { label: 'Spent', amount: -2000, tone: 'plain' },
      { label: 'Carried in', amount: -12000, tone: 'over' },
      { label: 'Left', amount: -4000, tone: 'mute' },
    ]);
  });
});

describe('activityTotal', () => {
  it('the sum of the rows', () => expect(activityTotal(fakeActivity)).toBe(-24810));
  it('0 for no rows', () => expect(activityTotal([])).toBe(0));
  it('refunds count', () => {
    expect(activityTotal([{ ...fakeActivity[0], amount: -1000 }, { ...fakeActivity[1], amount: 250 }])).toBe(-750);
  });
});

describe('activityDateLabel', () => {
  it('Today', () => expect(activityDateLabel('2026-11-19', nov19)).toBe('Today'));
  it('Yesterday', () => expect(activityDateLabel('2026-11-18', nov19)).toBe('Yesterday'));
  it('otherwise weekday, day and month', () => expect(activityDateLabel('2026-11-17', nov19)).toBe('Tue 17 Nov'));
});

describe('activityLines', () => {
  const row = (amount: number, payee: string | null): ActivityRow => ({
    id: `t${amount}`, date: '2026-11-19', amount, payee, account: 'Everyday Checking', notes: null,
  });
  it.each([
    ['money out', row(-1840, 'Corner Bakery'), { payee: 'Corner Bakery', payeeTone: 'plain', tone: 'plain', label: 'Corner Bakery, −$18.40, Today, Everyday Checking' }],
    ['money in', row(2500, 'Refunds Inc'), { payee: 'Refunds Inc', payeeTone: 'plain', tone: 'in', label: 'Refunds Inc, +$25.00, Today, Everyday Checking' }],
    ['zero', row(0, 'Adjust'), { payee: 'Adjust', payeeTone: 'plain', tone: 'plain', label: 'Adjust, $0.00, Today, Everyday Checking' }],
    ['no payee', row(-500, null), { payee: 'No payee', payeeTone: 'mute', tone: 'plain', label: 'No payee, −$5.00, Today, Everyday Checking' }],
  ])('%s', (_, r, expected) => {
    expect(activityLines([r], nov19)).toEqual([
      { id: r.id, amount: r.amount, meta: 'Today · Everyday Checking', ...expected },
    ]);
  });
  it('keeps the order given, and the date label follows the day', () => {
    const rows = [{ ...row(-100, 'A'), id: 'a' }, { ...row(-200, 'B'), id: 'b', date: '2026-11-03' }];
    expect(activityLines(rows, nov19).map(l => [l.id, l.meta])).toEqual([
      ['a', 'Today · Everyday Checking'],
      ['b', 'Tue 3 Nov · Everyday Checking'],
    ]);
  });
});

describe('activityHeading', () => {
  it('This month for the current month', () => expect(activityHeading('2026-11', nov19)).toBe('This month'));
  it('the month’s name for any other', () => {
    expect(activityHeading('2026-10', nov19)).toBe('October');
    expect(activityHeading('2026-12', nov19)).toBe('December');
  });
});
