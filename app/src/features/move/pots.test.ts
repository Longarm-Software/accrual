import { EngineError, READY } from '../../engine/types';
import { fakePlanMonth } from '../../session/fakeEngine';
import { bite } from '../quickAdd/bite';
import { accepted, gain, pot, potCardLabel, pots, READY_NAME, type Pot } from './pots';

const p = (has: number): Pot => ({ id: 'cat-x', name: 'X', has });

describe('pots', () => {
  it('Ready to budget first, then every category of every group in plan order, with its balance', () => {
    expect(pots(fakePlanMonth)).toEqual([
      { id: READY, name: 'Ready to budget', has: 31200 },
      { id: 'cat-rent', name: 'Rent', has: 0 },
      { id: 'cat-electricity', name: 'Electricity', has: 12000 },
      { id: 'cat-insurance', name: 'Insurance', has: 10000 },
      { id: 'cat-groceries', name: 'Groceries', has: 20762 },
      { id: 'cat-dining', name: 'Dining out', has: -2810 },
      { id: 'cat-emergency', name: 'Emergency fund', has: 640000 },
    ]);
  });
  it('READY_NAME is the pot\'s name', () => expect(READY_NAME).toBe('Ready to budget'));
  it('a month overbudgeted: Ready to budget has a negative amount', () => {
    expect(pots({ ...fakePlanMonth, toBudget: -12000 })[0]).toEqual({ id: READY, name: READY_NAME, has: -12000 });
  });
});

describe('pot', () => {
  it('finds Ready to budget and a category', () => {
    expect(pot(fakePlanMonth, READY)).toEqual({ id: READY, name: READY_NAME, has: 31200 });
    expect(pot(fakePlanMonth, 'cat-dining')).toEqual({ id: 'cat-dining', name: 'Dining out', has: -2810 });
  });
  it('null for an id the plan does not have', () => expect(pot(fakePlanMonth, 'cat-nope')).toBeNull());
});

describe('gain', () => {
  it('a gain onto money already there: kept is the old share', () => {
    const g = gain(p(3000), 1000);
    expect(g.kept).toBeCloseTo(0.75);
    expect(g.gained).toBeCloseTo(0.25);
    expect(g.kept + g.gained).toBe(1);
    expect(g.before).toBe('$30.00');
    expect(g.after).toBe('$40.00 after');
  });
  it('a tiny gain still shows 4% of the bar, taken from kept', () => {
    const g = gain(p(640000), 1);
    expect(g.gained).toBe(0.04);
    expect(g.kept).toBe(0.96);
    expect(g.after).toBe('$6,400.01 after');
  });
  it('from zero: the whole bar is gained', () => {
    expect(gain(p(0), 500)).toEqual({ kept: 0, gained: 1, before: '$0.00', after: '$5.00 after', tone: 'funded' });
  });
  it('across zero: from below zero to above it, the whole bar is gained', () => {
    expect(gain(p(-2810), 5000)).toEqual({ kept: 0, gained: 1, before: '−$28.10', after: '$21.90 after', tone: 'funded' });
  });
  // Below zero the bar's full width is the deficit, and what arrives fills it in.
  it('below zero, to exactly zero: the deficit is filled, gained 1', () => {
    expect(gain(p(-2810), 2810)).toEqual({ kept: 0, gained: 1, before: '−$28.10', after: '$0.00 after', tone: 'funded' });
  });
  it('below zero, still below zero after: the share of the deficit filled; the rest of the bar is empty', () => {
    const g = gain(p(-2810), 1350);
    expect(g.kept).toBe(0);
    expect(g.gained).toBeCloseTo(1350 / 2810);
    expect(g.before).toBe('−$28.10');
    expect(g.after).toBe('−$14.60 after');
    expect(g.tone).toBe('over');
  });
  it('below zero, a tiny part of a large deficit still shows 4% of the bar', () => {
    expect(gain(p(-640000), 1)).toMatchObject({ kept: 0, gained: 0.04 });
  });
  it('amount 0: all kept, nothing gained', () => {
    expect(gain(p(3000), 0)).toEqual({ kept: 1, gained: 0, before: '$30.00', after: '$30.00 after', tone: 'funded' });
  });
  it('amount 0 at or below zero: no solid bar', () => {
    expect(gain(p(0), 0)).toEqual({ kept: 0, gained: 0, before: '$0.00', after: '$0.00 after', tone: 'funded' });
    expect(gain(p(-500), 0)).toEqual({ kept: 0, gained: 0, before: '−$5.00', after: '−$5.00 after', tone: 'over' });
  });
});

describe('gain tone', () => {
  it.each([
    [-2810, 1350, 'over'], // still below zero after
    [-2810, 2810, 'funded'], // exactly zero
    [-2810, 5000, 'funded'],
    [3000, 1000, 'funded'],
    [-500, 0, 'over'],
  ] as const)('has %i, %i arrives: %s', (has, amount, tone) => expect(gain(p(has), amount).tone).toBe(tone));
});

describe('potCardLabel', () => {
  const groceries = { name: 'Groceries', balance: 20762 };
  it.each([
    ['To', null, null, 'To: none chosen, choose one'],
    ['From', 'Groceries', null, 'From: Groceries'],
    ['From', 'Groceries', bite(groceries, 5000), 'From: Groceries, $207.62 now, $157.62 after'],
    ['From', 'Coffee', bite({ name: 'Coffee', balance: 1350 }, 1840), 'From: Coffee, $13.50 now, −$4.90 after. That is $4.90 more than Coffee has'],
    ['To', 'X', gain(p(3000), 1000), 'To: X, $30.00 now, $40.00 after'],
  ] as const)('%s %s', (label, name, bar, text) => expect(potCardLabel(label, name, bar)).toBe(text));
});

describe('accepted', () => {
  it('true when the check does not throw', () => expect(accepted(() => undefined)).toBe(true));
  it('false when the check refuses with an EngineError', () => {
    expect(accepted(() => { throw new EngineError('stale', 'no'); })).toBe(false);
  });
  it('anything else is a bug, not a refusal: it is thrown on', () => {
    expect(() => accepted(() => { throw new TypeError('boom'); })).toThrow('boom');
  });
});
