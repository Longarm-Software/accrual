import type { PayeeChoice } from '../../engine/types';
import { fakeQuickAddLists } from '../../session/fakeEngine';
import { exactPayee, matchPayees } from './payees';

const p = (name: string): PayeeChoice => ({ id: `id-${name}`, name, lastCategoryId: null });
const names = (list: PayeeChoice[]) => list.map(x => x.name);
const payees = [p('Barber'), p('Corner Shop'), p('Bakery'), p('Shop Online'), p('Book Shop'), p('bar & grill')];

describe('matchPayees', () => {
  it('empty text returns the first 6 in the order given', () => {
    const many = [...fakeQuickAddLists.payees, p('Seventh')];
    expect(matchPayees(many, '')).toEqual(fakeQuickAddLists.payees);
    expect(matchPayees(many, '   ')).toEqual(fakeQuickAddLists.payees);
  });
  it('empty text honours a given limit', () => {
    expect(names(matchPayees(payees, '', 2))).toEqual(['Barber', 'Corner Shop']);
  });
  it('ignores case and outer spaces', () => {
    expect(names(matchPayees(payees, '  BAR '))).toEqual(['Barber', 'bar & grill']);
  });
  it('puts names that start with the text before those that only contain it, keeping the given order', () => {
    expect(names(matchPayees(payees, 'shop'))).toEqual(['Shop Online', 'Corner Shop', 'Book Shop']);
    expect(names(matchPayees(payees, 'b'))).toEqual(['Barber', 'Bakery', 'Book Shop', 'bar & grill']);
  });
  it('applies the limit after ordering', () => {
    expect(names(matchPayees(payees, 'shop', 2))).toEqual(['Shop Online', 'Corner Shop']);
  });
  it('returns nothing when nothing matches', () => {
    expect(matchPayees(payees, 'zebra')).toEqual([]);
  });
});

describe('exactPayee', () => {
  it('finds the payee whose name equals the text, ignoring case and outer spaces', () => {
    expect(exactPayee(fakeQuickAddLists.payees, '  noodle BAR ')).toBe(fakeQuickAddLists.payees[1]);
  });
  it('matches a name stored decomposed when the same name is typed composed, and the reverse', () => {
    const composed = 'café';
    const decomposed = 'café';
    const stored = [p('Corner Shop'), p(decomposed)];
    expect(exactPayee(stored, ` CAFÉ `)).toBe(stored[1]);
    expect(exactPayee([p(composed)], decomposed)?.name).toBe(composed);
    expect(names(matchPayees(stored, composed))).toEqual([decomposed]);
  });
  it('is null for a partial match or empty text', () => {
    expect(exactPayee(fakeQuickAddLists.payees, 'Noodle')).toBeNull();
    expect(exactPayee(fakeQuickAddLists.payees, '')).toBeNull();
  });
});
