import { READY, type PlanCategory, type PlanMonth } from '../../engine/types';
import { checkCover, checkMonthAndAmount } from '../../engine/writeRules';
import { fakePlanMonth } from '../../session/fakeEngine';
import { bite } from '../quickAdd/bite';
import { CHOOSE_SOURCE, alreadyCovered, coverView, keepChoice, noLongerToCover, targetLabel, defaultSource, sourceLabel, toCover } from './cover';
import { gain } from './pots';

const plan = fakePlanMonth; // Dining out is $28.10 over; Ready to budget has $312.00
const cat = (id: string, name: string, balance: number, carryover = false): PlanCategory => ({
  id, name, budgeted: 0, spent: 0, balance, carryover, goal: null, longGoal: false,
});
const month = (toBudget: number, categories: PlanCategory[]): PlanMonth => ({
  ...plan, toBudget, groups: [{ id: 'g', name: 'G', categories }],
});
const dining = cat('cat-dining', 'Dining out', -2810);
const withBalance = (p: PlanMonth, id: string, balance: number): PlanMonth => ({
  ...p, groups: p.groups.map(g => ({ ...g, categories: g.categories.map(c => (c.id === id ? { ...c, balance } : c)) })),
});

describe('coverView', () => {
  it('null for a category the plan does not have', () => expect(coverView(plan, 'cat-nope', null)).toBeNull());
  it('null for a category that is not overspent', () => expect(coverView(plan, 'cat-groceries', null)).toBeNull());
  it('null for a category whose overspending rolls over', () => {
    expect(coverView(month(31200, [cat('cat-dining', 'Dining out', -2810, true)]), 'cat-dining', null)).toBeNull();
  });
  it('title, deficit', () => {
    const v = coverView(plan, 'cat-dining', null)!;
    expect(v.title).toBe('Cover Dining out');
    expect(v.deficit).toBe(2810);
  });
  it('sources: READY when it has money, then categories with money in plan order', () => {
    const v = coverView(plan, 'cat-dining', null)!;
    expect(v.sources.map(s => s.id)).toEqual([READY, 'cat-electricity', 'cat-insurance', 'cat-groceries', 'cat-emergency']);
    expect(v.sources[0]).toEqual({
      id: READY, name: 'Ready to budget', has: 31200, covers: 2810, enough: true,
      bite: bite({ name: 'Ready to budget', balance: 31200 }, 2810),
    });
  });
  it('sources: READY left out when it has nothing; a source that cannot cover it all covers what it has', () => {
    const v = coverView(month(0, [dining, cat('cat-coffee', 'Coffee', 1350), cat('cat-rent', 'Rent', 0)]), 'cat-dining', null)!;
    expect(v.sources).toEqual([
      { id: 'cat-coffee', name: 'Coffee', has: 1350, covers: 1350, enough: false, bite: bite({ name: 'Coffee', balance: 1350 }, 1350) },
    ]);
  });
  it('a source with exactly the deficit is enough', () => {
    const v = coverView(month(0, [dining, cat('cat-coffee', 'Coffee', 2810)]), 'cat-dining', null)!;
    expect(v.sources[0]).toMatchObject({ covers: 2810, enough: true });
  });
  it('selected: the default when nothing is chosen, or when the choice is not a source', () => {
    expect(coverView(plan, 'cat-dining', null)!.selected).toBe(READY);
    expect(coverView(plan, 'cat-dining', 'cat-rent')!.selected).toBe(READY);
    expect(coverView(plan, 'cat-dining', 'cat-nope')!.selected).toBe(READY);
  });
  it('selected: a chosen source is kept', () => {
    expect(coverView(plan, 'cat-dining', 'cat-groceries')!.selected).toBe('cat-groceries');
  });
  it('target: the overspent category filling to zero', () => {
    expect(coverView(plan, 'cat-dining', null)!.target).toEqual(
      gain({ id: 'cat-dining', name: 'Dining out', has: -2810 }, 2810),
    );
  });
  it('button: Cover {deficit} when the selected source is enough', () => {
    const v = coverView(plan, 'cat-dining', null)!;
    expect(v.button).toBe('Cover $28.10');
    expect(v.canSave).toBe(true);
  });
  it('button: Cover {covers} of {deficit} when it is not; the target fills part way', () => {
    const v = coverView(month(0, [dining, cat('cat-coffee', 'Coffee', 1350)]), 'cat-dining', null)!;
    expect(v.button).toBe('Cover $13.50 of $28.10');
    expect(v.canSave).toBe(true);
    expect(v.target).toEqual(gain({ id: 'cat-dining', name: 'Dining out', has: -2810 }, 1350));
  });
  it('button: Nothing to cover with, cannot save, with no sources; the target gains nothing', () => {
    const v = coverView(month(0, [dining, cat('cat-rent', 'Rent', 0)]), 'cat-dining', null)!;
    expect(v.sources).toEqual([]);
    expect(v.selected).toBeNull();
    expect(v.button).toBe('Nothing to cover with');
    expect(v.canSave).toBe(false);
    expect(v.target).toEqual(gain({ id: 'cat-dining', name: 'Dining out', has: -2810 }, 0));
  });
  it('READY has money but not enough, a category has enough: the category is the default, READY still first', () => {
    const v = coverView(month(1000, [cat('cat-coffee', 'Coffee', 1350), dining, cat('cat-fun', 'Fun', 5000)]), 'cat-dining', null)!;
    expect(v.sources.map(s => s.id)).toEqual([READY, 'cat-coffee', 'cat-fun']);
    expect(v.selected).toBe('cat-fun');
    expect(v.button).toBe('Cover $28.10');
  });
});

describe('defaultSource', () => {
  it('READY when it is enough', () => expect(defaultSource(plan, 'cat-dining')).toBe(READY));
  it('else the first source that is enough', () => {
    const m = month(1000, [cat('cat-a', 'A', 1000), cat('cat-b', 'B', 3000), dining, cat('cat-c', 'C', 9000)]);
    expect(defaultSource(m, 'cat-dining')).toBe('cat-b');
  });
  it('else the source with the most', () => {
    const m = month(500, [cat('cat-a', 'A', 1000), cat('cat-b', 'B', 1350), dining]);
    expect(defaultSource(m, 'cat-dining')).toBe('cat-b');
  });
  it('else the source that has the most (has, not covers, is what the rule compares)', () => {
    const m = month(0, [cat('cat-a', 'A', 2000), cat('cat-b', 'B', 2700), cat('cat-c', 'C', 900), dining]);
    expect(defaultSource(m, 'cat-dining')).toBe('cat-b');
    expect(coverView(m, 'cat-dining', null)!.sources.map(s => s.has)).toEqual([2000, 2700, 900]);
  });
  it('a tie for the most: the first wins (READY before categories)', () => {
    expect(defaultSource(month(500, [cat('cat-a', 'A', 1350), cat('cat-b', 'B', 1350), dining]), 'cat-dining')).toBe('cat-a');
    expect(defaultSource(month(1350, [cat('cat-a', 'A', 1350), dining]), 'cat-dining')).toBe(READY);
  });
  it('null with no sources, or nothing to cover', () => {
    expect(defaultSource(month(0, [dining]), 'cat-dining')).toBeNull();
    expect(defaultSource(plan, 'cat-groceries')).toBeNull();
  });
});

describe('toCover', () => {
  it('what coverOverspending takes: the whole deficit from a source that is enough', () => {
    expect(toCover(coverView(plan, 'cat-dining', null)!)).toEqual({
      month: '2026-11', category: 'cat-dining', from: READY, amount: 2810, seen: { category: -2810, from: 31200 },
    });
  });
  it('only what the selected source has when it is not enough', () => {
    const v = coverView(month(0, [dining, cat('cat-coffee', 'Coffee', 1350)]), 'cat-dining', null)!;
    expect(toCover(v)).toEqual({
      month: '2026-11', category: 'cat-dining', from: 'cat-coffee', amount: 1350, seen: { category: -2810, from: 1350 },
    });
  });
  it('throws when the view cannot be saved', () => {
    expect(() => toCover(coverView(month(0, [dining]), 'cat-dining', null)!)).toThrow();
  });
  it('the adapter\'s own rules accept every request it makes', () => {
    for (const from of [null, READY, 'cat-electricity', 'cat-insurance', 'cat-groceries', 'cat-emergency']) {
      const request = toCover(coverView(plan, 'cat-dining', from)!);
      expect(() => checkMonthAndAmount(request.month, request.amount, { start: '2026-01', end: '2027-12' })).not.toThrow();
      expect(() => checkCover(plan, request)).not.toThrow();
    }
  });
});

describe('after a refusal: no source is chosen unless the one chosen can still pay what the button said', () => {
  const before = coverView(plan, 'cat-dining', 'cat-electricity')!; // "Cover $28.10" from Electricity ($120.00)
  it('kept while it can still pay that', () => {
    expect(keepChoice(before, withBalance(plan, 'cat-electricity', 2810))).toBe('cat-electricity');
    // Over by more now: Electricity can still pay the $28.10 the button said; the new button says the rest.
    expect(keepChoice(before, withBalance(plan, 'cat-dining', -5000))).toBe('cat-electricity');
  });
  it('none when it now has less than that, or has gone', () => {
    expect(keepChoice(before, withBalance(plan, 'cat-electricity', 2809))).toBeNull();
    expect(keepChoice(before, withBalance(plan, 'cat-electricity', 0))).toBeNull();
    expect(keepChoice(before, { ...plan, groups: plan.groups.map(g => ({ ...g, categories: g.categories.filter(c => c.id !== 'cat-electricity') })) }))
      .toBeNull();
  });
  it('the default the person did not change counts as chosen: it is the one the button named', () => {
    const shown = coverView(plan, 'cat-dining', null)!; // Ready to budget
    expect(keepChoice(shown, { ...plan, toBudget: 1000 })).toBeNull();
    expect(keepChoice(shown, { ...plan, toBudget: 2810 })).toBe(READY);
  });
  it('with none chosen, nothing is selected, the button asks for one and is off; the target gains nothing', () => {
    const v = coverView(withBalance(plan, 'cat-electricity', 100), 'cat-dining', null, { chooseAgain: true })!;
    expect(v.selected).toBeNull();
    expect(v.button).toBe(CHOOSE_SOURCE);
    expect(CHOOSE_SOURCE).toBe('Choose where it comes from');
    expect(v.canSave).toBe(false);
    expect(v.target).toEqual(gain({ id: 'cat-dining', name: 'Dining out', has: -2810 }, 0));
    expect(v.sources.length).toBeGreaterThan(0);
  });
  it('a source chosen after that is selected as usual', () => {
    const v = coverView(plan, 'cat-dining', 'cat-groceries', { chooseAgain: true })!;
    expect(v.selected).toBe('cat-groceries');
    expect(v.canSave).toBe(true);
  });
});

describe('sourceLabel', () => {
  it('name, now and after; and when it is not enough, says so', () => {
    const v = coverView(month(0, [dining, cat('cat-coffee', 'Coffee', 1350), cat('cat-fun', 'Fun', 5000)]), 'cat-dining', null)!;
    expect(sourceLabel(v.sources[0])).toBe('Coffee, $13.50 now, $0.00 after, not enough for all of it');
    expect(sourceLabel(v.sources[1])).toBe('Fun, $50.00 now, $21.90 after');
  });
});

describe('alreadyCovered', () => {
  it('says the category no longer needs covering', () => expect(alreadyCovered('Dining out')).toBe('Dining out is already covered.'));
});

describe('noLongerToCover: read again after a refusal, the category needs no cover', () => {
  it('it is covered', () => {
    expect(noLongerToCover(month(100, [cat('cat-dining', 'Dining out', 0)]), 'cat-dining')).toBe('Dining out is already covered.');
  });
  it('it has gone from the plan', () => {
    expect(noLongerToCover(month(100, []), 'cat-dining')).toBe('This category is not in this budget.');
  });
});

describe('targetLabel', () => {
  it('names the category and what the cover does to it', () => {
    const v = coverView(plan, 'cat-dining', null)!;
    expect(v.name).toBe('Dining out');
    expect(v.take).toBe('Take $28.10 from');
    expect(targetLabel(v)).toBe('Dining out, −$28.10 now, $0.00 after');
  });
});
