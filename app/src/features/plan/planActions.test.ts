import { READY, type PlanCategory, type PlanMonth } from '../../engine/types';
import { MAX_AMOUNT } from '../../engine/writeRules';
import { fakePlanMonth } from '../../session/fakeEngine';
import {
  canChange, categoryAction, categoryHref, coverHref, heroAction, moveHref, noticeAction, parseAmount, parseCoverParams, parseId,
  parseMoveParams,
} from './planActions';

const plan = fakePlanMonth; // 2026-11, Ready to budget $312.00, Dining out $28.10 over
const nov19 = new Date(2026, 10, 19);
const dec1 = new Date(2026, 11, 1);
const jan = new Date(2027, 0, 5);
const cat = (id: string, balance: number, carryover = false): PlanCategory => ({
  id, name: id, budgeted: 0, spent: 0, balance, carryover, goal: null, longGoal: false,
});
const month = (toBudget: number, categories: PlanCategory[]): PlanMonth => ({
  ...plan, toBudget, groups: [{ id: 'g', name: 'G', categories }],
});
const query = (href: string): Record<string, string> =>
  Object.fromEntries(new URL(href, 'http://localhost').searchParams);

describe('canChange', () => {
  it('the current month and later: true', () => {
    expect(canChange('2026-11', nov19)).toBe(true);
    expect(canChange('2026-12', nov19)).toBe(true);
    expect(canChange('2027-03', nov19)).toBe(true);
  });
  it('a month before the current one: false', () => {
    expect(canChange('2026-10', nov19)).toBe(false);
    expect(canChange('2026-11', dec1)).toBe(false);
  });
});

describe('heroAction', () => {
  it('Assign when Ready to budget is above zero', () => {
    expect(heroAction(plan, nov19)).toEqual({ label: 'Assign', href: '/move?from=to-budget' });
  });
  it('Fix when overbudgeted, with the shortfall as the amount', () => {
    expect(heroAction({ ...plan, toBudget: -1594 }, nov19)).toEqual({ label: 'Fix', href: '/move?to=to-budget&amount=1594' });
  });
  it('null at exactly zero', () => expect(heroAction({ ...plan, toBudget: 0 }, nov19)).toBeNull());
  it('null in a past month', () => {
    expect(heroAction(plan, dec1)).toBeNull();
    expect(heroAction({ ...plan, toBudget: -1594 }, dec1)).toBeNull();
  });
});

describe('noticeAction', () => {
  it('Cover for the first overspent category in plan order', () => {
    const m = month(0, [cat('cat-a', 100), cat('cat-b', -5), cat('cat-c', -900)]);
    expect(noticeAction(m, nov19)).toEqual({ label: 'Cover', href: '/cover?category=cat-b' });
    expect(noticeAction(plan, nov19)).toEqual({ label: 'Cover', href: '/cover?category=cat-dining' });
  });
  it('a category whose overspending rolls over is skipped', () => {
    const m = month(0, [cat('cat-a', -500, true), cat('cat-b', -5)]);
    expect(noticeAction(m, nov19)).toEqual({ label: 'Cover', href: '/cover?category=cat-b' });
    expect(noticeAction(month(0, [cat('cat-a', -500, true)]), nov19)).toBeNull();
  });
  it('null when nothing is overspent', () => expect(noticeAction(month(0, [cat('cat-a', 0)]), nov19)).toBeNull());
  it('null in a past month', () => expect(noticeAction(plan, dec1)).toBeNull());
});

describe('categoryAction', () => {
  it('Cover when it is overspent', () => {
    expect(categoryAction(plan, 'cat-dining', nov19)).toEqual({ label: 'Cover', href: '/cover?category=cat-dining' });
  });
  it('Move money from it when its balance is above zero', () => {
    expect(categoryAction(plan, 'cat-groceries', nov19)).toEqual({ label: 'Move money', href: '/move?from=cat-groceries' });
  });
  it('Move money to it when its balance is zero', () => {
    expect(categoryAction(plan, 'cat-rent', nov19)).toEqual({ label: 'Move money', href: '/move?to=cat-rent' });
  });
  it('Move money to it when it is below zero but rolls over', () => {
    expect(categoryAction(month(0, [cat('cat-a', -500, true)]), 'cat-a', nov19)).toEqual({
      label: 'Move money', href: '/move?to=cat-a',
    });
  });
  it('null for a category the plan does not have', () => expect(categoryAction(plan, 'cat-nope', nov19)).toBeNull());
  it('null in a past month', () => {
    expect(categoryAction(plan, 'cat-dining', dec1)).toBeNull();
    expect(categoryAction(plan, 'cat-groceries', jan)).toBeNull();
  });
  it('a future month can change', () => {
    expect(categoryAction({ ...plan, month: '2026-12' }, 'cat-groceries', nov19)).not.toBeNull();
  });
});

describe('links: builders refuse ids the parser would not accept', () => {
  it('moveHref: null for a from or to that is not an id', () => {
    for (const bad of ['a&amount=1', 'a b', 'a/b', '', 'a=b', 'a?b', 'a#b']) {
      expect(moveHref({ from: bad })).toBeNull();
      expect(moveHref({ to: bad, amount: 100 })).toBeNull();
    }
  });
  it('coverHref: null for a category that is not an id', () => {
    for (const bad of ['a&from=to-budget', 'a b', '']) expect(coverHref(bad)).toBeNull();
  });
  it('no button when the link cannot be built', () => {
    const odd = month(0, [cat('cat&to=x', 500), cat('cat x', -5)]);
    expect(categoryAction(odd, 'cat&to=x', nov19)).toBeNull();
    expect(categoryAction(odd, 'cat x', nov19)).toBeNull();
    expect(noticeAction(odd, nov19)).toBeNull();
  });
  it('the notice skips an overspent category whose id cannot be linked, and covers the next', () => {
    const m = month(0, [cat('cat x', -5), cat('cat-b', -900)]);
    expect(noticeAction(m, nov19)).toEqual({ label: 'Cover', href: '/cover?category=cat-b' });
  });
});

describe('links: build and parse', () => {
  it('round trip: a move', () => {
    for (const link of [{ from: READY }, { to: READY, amount: 1594 }, { from: 'cat-groceries', to: 'cat-dining', amount: 1 }, { to: 'cat-rent' }]) {
      expect(parseMoveParams(query(moveHref(link)!))).toEqual(link);
    }
  });
  it('round trip: the largest amount a write takes', () => {
    expect(parseMoveParams(query(moveHref({ to: READY, amount: MAX_AMOUNT })!))).toEqual({ to: READY, amount: MAX_AMOUNT });
  });
  it('round trip: a cover', () => {
    expect(parseCoverParams(query(coverHref('cat-dining')!))).toEqual({ category: 'cat-dining' });
  });
  it('round trip: every action this module makes', () => {
    const over = { ...plan, toBudget: -1594 };
    const moves = [heroAction(plan, nov19), heroAction(over, nov19), categoryAction(plan, 'cat-groceries', nov19)];
    expect(moves.map(a => parseMoveParams(query(a!.href)))).toEqual([
      { from: READY }, { to: READY, amount: 1594 }, { from: 'cat-groceries' },
    ]);
    const covers = [noticeAction(plan, nov19), categoryAction(plan, 'cat-dining', nov19)];
    expect(covers.map(a => parseCoverParams(query(a!.href)))).toEqual([{ category: 'cat-dining' }, { category: 'cat-dining' }]);
  });
  it('parseAmount: whole cents above zero only', () => {
    expect(parseAmount('1594')).toBe(1594);
    for (const junk of ['-1594', '15.94', '15,94', 'abc', '', ' 12', '12 ', '0', '007', '1e3', '0x10', 'Infinity', String(MAX_AMOUNT + 1)]) {
      expect(parseAmount(junk)).toBeNull();
    }
    for (const junk of [undefined, null, 1594, ['1594'], {}]) expect(parseAmount(junk)).toBeNull();
  });
  it('parseId: letters, digits, - and _ only', () => {
    expect(parseId('to-budget')).toBe('to-budget');
    expect(parseId('2f6a1c3e-9b4d-4e1a-8c2b-0d5e7f9a1b3c')).toBe('2f6a1c3e-9b4d-4e1a-8c2b-0d5e7f9a1b3c');
    for (const junk of ['', ' ', 'a b', 'a/b', 'a&b=c', '../x', undefined, null, 12, ['cat-a']]) expect(parseId(junk)).toBeNull();
  });
  it('a malformed part is dropped, the rest kept', () => {
    expect(parseMoveParams({ from: 'cat-a', to: 'a b', amount: '-5' })).toEqual({ from: 'cat-a' });
    expect(parseMoveParams({ to: READY, amount: '12.50' })).toEqual({ to: READY });
    expect(parseMoveParams({})).toEqual({});
    expect(parseCoverParams({ category: '' })).toEqual({});
    expect(parseCoverParams({ category: ['cat-a', 'cat-b'] })).toEqual({});
  });
});

describe('categoryHref', () => {
  it('the category screen’s link', () => expect(categoryHref('cat-dining')).toBe('/category/cat-dining'));
  it('null for an id a link cannot carry', () => expect(categoryHref('a/b')).toBeNull());
});
