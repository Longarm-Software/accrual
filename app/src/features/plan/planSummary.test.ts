import type { PlanMonth } from '../../engine/types';
import { fakePlanMonth } from '../../session/fakeEngine';
import { heroView, overspentNotice } from './planSummary';

const month = (over: Partial<PlanMonth>): PlanMonth => ({ ...fakePlanMonth, ...over });

describe('heroView', () => {
  it('the fake month is ready, with shares that sum to 1', () => {
    const v = heroView(fakePlanMonth);
    expect(v.state).toBe('ready');
    expect(v.label).toBe('Ready to budget');
    expect(v.amount).toBe(31200);
    expect(v.flow.spent + v.flow.setAside + v.flow.free).toBeCloseTo(1);
    expect(v.flow.spent).toBeCloseTo(341617 / 619200);
    expect(v.flow.setAside).toBeCloseTo(246383 / 619200);
    expect(v.flow.free).toBeCloseTo(31200 / 619200);
    expect(v.spentText).toBe('Spent $3,416');
    expect(v.setAsideText).toBe('Still set aside $2,464');
    expect(v.freeText).toBe('Free $312');
  });
  it('is even when toBudget is 0', () => {
    const v = heroView(month({ toBudget: 0 }));
    expect(v.state).toBe('even');
    expect(v.label).toBe('Every dollar has a job');
    expect(v.flow.free).toBe(0);
  });
  it('is over when toBudget is negative, with no free share', () => {
    const v = heroView(month({ toBudget: -12000 }));
    expect(v.state).toBe('over');
    expect(v.label).toBe('Overbudgeted');
    expect(v.amount).toBe(-12000);
    expect(v.flow.free).toBe(0);
    expect(v.freeText).toBe('Free $0');
    expect(v.flow.spent + v.flow.setAside).toBeCloseTo(1);
  });
  it('shows all zeros for an empty month without dividing by zero', () => {
    const v = heroView(month({ toBudget: 0, totalBudgeted: 0, totalSpent: 0, totalIncome: 0 }));
    expect(v.flow).toEqual({ spent: 0, setAside: 0, free: 0 });
  });
  it('never sets aside a negative amount when spending exceeds the budget', () => {
    const v = heroView(month({ toBudget: 0, totalBudgeted: 1000, totalSpent: -3000 }));
    expect(v.flow).toEqual({ spent: 1, setAside: 0, free: 0 });
  });
});

describe('overspentNotice', () => {
  it('is null when nothing is overspent', () => {
    const calm = month({ groups: [{ ...fakePlanMonth.groups[0] }] });
    expect(overspentNotice(calm)).toBeNull();
  });
  it('names a single overspent category', () => {
    expect(overspentNotice(fakePlanMonth)).toBe('Dining out is $28.10 over');
  });
  it('counts several', () => {
    const [bills, everyday] = fakePlanMonth.groups;
    const rent = { ...bills.categories[0], balance: -1000 };
    const two = month({ groups: [{ ...bills, categories: [rent] }, everyday] });
    expect(overspentNotice(two)).toBe('2 categories are $38.10 over');
  });
});
