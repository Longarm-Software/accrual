import type { PayeeChoice, QuickAddLists } from '../../engine/types';
import { fakeQuickAddLists } from '../../session/fakeEngine';
import { emptyEntry } from './amountEntry';
import {
  canSave, dateLabel, isSuggested, newDraft, stepDate, toggleIncome, toTransaction,
  withCategory, withPayee, withPayeeText, type Draft,
} from './draft';

const nov19 = new Date(2026, 10, 19, 21, 30); // evening, when UTC is already the next day in some zones
const lists = fakeQuickAddLists;
const payee = (id: string): PayeeChoice => lists.payees.find(p => p.id === id)!;
const cornerShop = payee('payee-corner-shop'); // last used with cat-groceries
const employer = payee('payee-employer'); // last used with cat-salary, an income category
const expenseIds = new Set(['cat-rent', 'cat-electricity', 'cat-insurance', 'cat-groceries', 'cat-dining']);
const fresh = (): Draft => newDraft(lists, nov19);

describe('newDraft', () => {
  it('starts empty, as an expense, on the last used account, dated today', () => {
    expect(fresh()).toEqual({
      entry: emptyEntry, income: false, payeeText: '', payeeId: null, categoryId: null,
      categoryChosenByHand: false, accountId: 'acct-checking', date: '2026-11-19',
    });
  });
  it('falls back to the first account, then to none', () => {
    const noLast: QuickAddLists = { ...lists, lastAccountId: null };
    expect(newDraft(noLast, nov19).accountId).toBe('acct-checking');
    expect(newDraft({ ...noLast, accounts: [lists.accounts[2]] }, nov19).accountId).toBe('acct-card');
    expect(newDraft({ ...noLast, accounts: [] }, nov19).accountId).toBeNull();
  });
});

describe('withPayee', () => {
  it("sets the payee and suggests the category it was last used with", () => {
    const d = withPayee(fresh(), cornerShop, expenseIds);
    expect(d).toMatchObject({ payeeId: 'payee-corner-shop', payeeText: 'Corner Shop', categoryId: 'cat-groceries' });
    expect(d.categoryChosenByHand).toBe(false);
    expect(isSuggested(d)).toBe(true);
  });
  it('does not override a category chosen by hand', () => {
    const d = withPayee(withCategory(fresh(), 'cat-dining'), cornerShop, expenseIds);
    expect(d).toMatchObject({ payeeId: 'payee-corner-shop', categoryId: 'cat-dining', categoryChosenByHand: true });
    expect(isSuggested(d)).toBe(false);
  });
  it('leaves the category alone when the last category is not a valid one (an income category on an expense)', () => {
    const d = withPayee(fresh(), employer, expenseIds);
    expect(d).toMatchObject({ payeeId: 'payee-employer', payeeText: 'Acme Widgets', categoryId: null });
  });
  it('leaves the category alone when the payee has no last category', () => {
    expect(withPayee(fresh(), payee('payee-market'), expenseIds).categoryId).toBeNull();
  });
  it('suggests nothing for income', () => {
    const d = withPayee(toggleIncome(fresh()), employer, new Set(['cat-salary']));
    expect(d.categoryId).toBeNull();
  });
});

describe('withPayeeText', () => {
  it('sets the text and clears the payee id with a suggested category', () => {
    const d = withPayeeText(withPayee(fresh(), cornerShop, expenseIds), 'Corner Sh');
    expect(d).toMatchObject({ payeeText: 'Corner Sh', payeeId: null, categoryId: null, categoryChosenByHand: false });
  });
  it('keeps a category chosen by hand', () => {
    const d = withPayeeText(withPayee(withCategory(fresh(), 'cat-dining'), cornerShop, expenseIds), 'Corner');
    expect(d).toMatchObject({ payeeId: null, categoryId: 'cat-dining', categoryChosenByHand: true });
  });
});

describe('withCategory', () => {
  it('sets the category as chosen by hand', () => {
    expect(withCategory(fresh(), 'cat-rent')).toMatchObject({ categoryId: 'cat-rent', categoryChosenByHand: true });
  });
  it('choosing no category is also a choice', () => {
    const d = withCategory(withPayee(fresh(), cornerShop, expenseIds), null);
    expect(d).toMatchObject({ categoryId: null, categoryChosenByHand: true });
    expect(withPayee(d, cornerShop, expenseIds).categoryId).toBeNull();
  });
});

describe('toggleIncome', () => {
  it('flips income and clears the category, by hand or not', () => {
    const d = toggleIncome(withCategory(fresh(), 'cat-rent'));
    expect(d).toMatchObject({ income: true, categoryId: null, categoryChosenByHand: false });
    expect(toggleIncome(d).income).toBe(false);
  });
});

describe('isSuggested', () => {
  it('is false with no category', () => expect(isSuggested(fresh())).toBe(false));
});

describe('stepDate', () => {
  it('moves back a day, then forward', () => {
    const back = stepDate(fresh(), -1, nov19);
    expect(back.date).toBe('2026-11-18');
    expect(stepDate(back, 1, nov19).date).toBe('2026-11-19');
  });
  it('has no lower limit', () => {
    let d = fresh();
    for (let i = 0; i < 400; i++) d = stepDate(d, -1, nov19);
    expect(d.date).toBe('2025-10-15');
  });
  it('never passes today, across a month end', () => {
    const dec1 = new Date(2026, 11, 1, 23, 59);
    const d = newDraft(lists, dec1);
    expect(d.date).toBe('2026-12-01');
    expect(stepDate(d, -1, dec1).date).toBe('2026-11-30');
    expect(stepDate(d, 1, dec1)).toEqual(d);
  });
  it('steps across a year end', () => {
    const jan1 = new Date(2027, 0, 1);
    expect(stepDate(newDraft(lists, jan1), -1, jan1).date).toBe('2026-12-31');
  });
});

describe('dateLabel', () => {
  it('Today', () => expect(dateLabel('2026-11-19', nov19)).toBe('Today'));
  it('Yesterday', () => expect(dateLabel('2026-11-18', nov19)).toBe('Yesterday'));
  it('otherwise weekday, day and month', () => {
    expect(dateLabel('2026-11-17', nov19)).toBe('Tue 17 Nov');
    expect(dateLabel('2026-11-01', nov19)).toBe('Sun 1 Nov');
  });
  it('Yesterday across a month end', () => {
    expect(dateLabel('2026-11-30', new Date(2026, 11, 1))).toBe('Yesterday');
  });
});

describe('canSave', () => {
  const withAmount = (d: Draft): Draft => ({ ...d, entry: { digits: '18', decimals: '4' } });
  it('needs an amount above 0 and an account', () => {
    expect(canSave(withAmount(fresh()))).toBe(true);
    expect(canSave(fresh())).toBe(false);
    expect(canSave({ ...fresh(), entry: { digits: '0', decimals: '00' } })).toBe(false);
    expect(canSave({ ...withAmount(fresh()), accountId: null })).toBe(false);
  });
  it('does not need a payee or a category', () => {
    const d = withAmount(fresh());
    expect(d.payeeId).toBeNull();
    expect(d.categoryId).toBeNull();
    expect(canSave(d)).toBe(true);
  });
});

describe('toTransaction', () => {
  const amount = (d: Draft): Draft => ({ ...d, entry: { digits: '18', decimals: '4' } });
  it('an expense with an existing payee', () => {
    const d = amount(withPayee(fresh(), cornerShop, expenseIds));
    expect(toTransaction(d)).toEqual({
      accountId: 'acct-checking',
      transaction: { date: '2026-11-19', amount: -1840, cleared: false, category: 'cat-groceries', payee: 'payee-corner-shop' },
    });
  });
  it('an expense with a new payee name, sent trimmed', () => {
    const d = amount(withCategory(withPayeeText(fresh(), '  Night Owl Cafe '), 'cat-dining'));
    expect(toTransaction(d)).toEqual({
      accountId: 'acct-checking',
      transaction: { date: '2026-11-19', amount: -1840, cleared: false, category: 'cat-dining', payee_name: 'Night Owl Cafe' },
    });
  });
  it('income with no payee and no category', () => {
    const d = { ...amount(toggleIncome(fresh())), accountId: 'acct-savings' };
    const result = toTransaction(withPayeeText(d, '   '));
    expect(result).toEqual({ accountId: 'acct-savings', transaction: { date: '2026-11-19', amount: 1840, cleared: false } });
    expect(Object.keys(result.transaction).sort()).toEqual(['amount', 'cleared', 'date']);
  });
  it('uses the stepped date', () => {
    expect(toTransaction(stepDate(amount(fresh()), -1, nov19)).transaction.date).toBe('2026-11-18');
  });
  it('refuses a draft that cannot be saved', () => {
    expect(() => toTransaction(fresh())).toThrow();
    expect(() => toTransaction({ ...amount(fresh()), accountId: null })).toThrow();
  });
});
