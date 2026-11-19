import { recentUse, type UseRow } from './recentUse';

const row = (payee: string | null, category: string | null, account: string | null = 'acct-a'): UseRow =>
  ({ payee, category, account });

it('gives nothing for no rows', () => {
  const use = recentUse([]);
  expect(use.payeeOrder).toEqual([]);
  expect(use.lastCategory.size).toBe(0);
  expect(use.lastAccount).toBeNull();
});

it('keeps the newer category for a payee used twice', () => {
  const use = recentUse([row('p-bakery', 'cat-dining'), row('p-bakery', 'cat-groceries')]);
  expect(use.lastCategory.get('p-bakery')).toBe('cat-dining');
  expect(use.payeeOrder).toEqual(['p-bakery']);
});

it('does not let a newer row with no category hide an older one', () => {
  const use = recentUse([row('p-bakery', null), row('p-bakery', 'cat-groceries')]);
  expect(use.lastCategory.get('p-bakery')).toBe('cat-groceries');
});

it('leaves out a payee that never had a category', () => {
  const use = recentUse([row('p-bakery', null)]);
  expect(use.lastCategory.has('p-bakery')).toBe(false);
  expect(use.payeeOrder).toEqual(['p-bakery']);
});

it('skips rows with no payee for payees but counts them for the last account', () => {
  const use = recentUse([row(null, 'cat-rent', 'acct-b'), row('p-bakery', 'cat-dining', 'acct-a')]);
  expect(use.payeeOrder).toEqual(['p-bakery']);
  expect(use.lastCategory.get('p-bakery')).toBe('cat-dining');
  expect(use.lastAccount).toBe('acct-b');
});

it('orders payees by first appearance, without duplicates', () => {
  const use = recentUse([
    row('p-cinema', null),
    row('p-bakery', 'cat-dining'),
    row('p-cinema', 'cat-fun'),
    row('p-garage', 'cat-car'),
    row('p-bakery', 'cat-groceries'),
  ]);
  expect(use.payeeOrder).toEqual(['p-cinema', 'p-bakery', 'p-garage']);
  expect(use.lastCategory.get('p-cinema')).toBe('cat-fun');
});
