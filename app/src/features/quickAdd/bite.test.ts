import { fakePlanMonth } from '../../session/fakeEngine';
import { bite } from './bite';

const groceries = fakePlanMonth.groups.flatMap(g => g.categories).find(c => c.name === 'Groceries')!; // $207.62
const coffee = { name: 'Coffee', balance: 1350 };

describe('bite', () => {
  it('amount 0: nothing is taken', () => {
    expect(bite(groceries, 0)).toEqual({
      state: 'none', kept: 1, taken: 0, before: '$207.62', after: '$207.62 after', warning: null,
    });
  });
  it('amount 0 with a balance at or below zero: no solid bar', () => {
    expect(bite({ name: 'Coffee', balance: 0 }, 0)).toEqual({
      state: 'none', kept: 0, taken: 0, before: '$0.00', after: '$0.00 after', warning: null,
    });
    expect(bite({ name: 'Coffee', balance: -500 }, 0)).toEqual({
      state: 'none', kept: 0, taken: 0, before: '−$5.00', after: '−$5.00 after', warning: null,
    });
  });
  it('a purchase that fits', () => {
    const b = bite(groceries, 1840);
    expect(b.state).toBe('fits');
    expect(b.taken).toBeCloseTo(1840 / 20762);
    expect(b.kept).toBeCloseTo(1 - 1840 / 20762);
    expect(b.kept + b.taken).toBe(1);
    expect(b.before).toBe('$207.62');
    expect(b.after).toBe('$189.22 after');
    expect(b.warning).toBeNull();
  });
  it('a tiny purchase still takes 4% of the bar', () => {
    const b = bite(groceries, 1);
    expect(b.taken).toBe(0.04);
    expect(b.kept).toBe(0.96);
    expect(b.after).toBe('$207.61 after');
  });
  it('a purchase of exactly the balance fits and takes the whole bar', () => {
    expect(bite(coffee, 1350)).toEqual({
      state: 'fits', kept: 0, taken: 1, before: '$13.50', after: '$0.00 after', warning: null,
    });
  });
  it('a purchase bigger than the balance is over', () => {
    expect(bite(coffee, 1840)).toEqual({
      state: 'over', kept: 0, taken: 1, before: '$13.50', after: '−$4.90 after',
      warning: 'That is $4.90 more than Coffee has',
    });
  });
  it('any purchase from a balance already below zero is over by the whole purchase', () => {
    expect(bite({ name: 'Coffee', balance: -500 }, 1000)).toEqual({
      state: 'over', kept: 0, taken: 1, before: '−$5.00', after: '−$15.00 after',
      warning: 'That is $10.00 more than Coffee has',
    });
  });
  it('any purchase from a balance of exactly zero is over', () => {
    expect(bite({ name: 'Coffee', balance: 0 }, 250).warning).toBe('That is $2.50 more than Coffee has');
  });
});
