import type { PayeeChoice, QuickAddLists } from '../../engine/types';
import { fakePlanMonth, fakeQuickAddLists } from '../../session/fakeEngine';
import { emptyEntry } from './amountEntry';
import {
  canSave, canStepForward, cardView, categoryChoices, dateLabel, expenseCategoryIds, isSuggested, newDraft,
  resolvePayee, stepDate, toggleIncome, toTransaction, withAccount, withCategory, withPayee, withPayeeText, type Draft,
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
  it("clears the previous payee's suggestion when the new payee has none", () => {
    const suggested = withPayee(fresh(), cornerShop, expenseIds);
    const d = withPayee(suggested, payee('payee-market'), expenseIds);
    expect(d).toMatchObject({ payeeId: 'payee-market', categoryId: null, categoryChosenByHand: false });
    expect(isSuggested(d)).toBe(false);
  });
  it("clears the previous payee's suggestion when the new payee's last category is not offered", () => {
    const d = withPayee(withPayee(fresh(), cornerShop, expenseIds), employer, expenseIds);
    expect(d).toMatchObject({ payeeId: 'payee-employer', categoryId: null, categoryChosenByHand: false });
  });
  it('keeps a hand-chosen category when the new payee has no suggestion', () => {
    const d = withPayee(withCategory(fresh(), 'cat-dining'), payee('payee-market'), expenseIds);
    expect(d).toMatchObject({ categoryId: 'cat-dining', categoryChosenByHand: true });
  });
  it('suggests nothing for income', () => {
    const d = withPayee(toggleIncome(fresh(), lists.payees, expenseIds), employer, new Set(['cat-salary']));
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
  it("back to an expense, re-applies the chosen payee's suggestion", () => {
    const income = toggleIncome(withPayee(fresh(), cornerShop, expenseIds), lists.payees, expenseIds);
    expect(income).toMatchObject({ income: true, categoryId: null, payeeId: 'payee-corner-shop' });
    const back = toggleIncome(income, lists.payees, expenseIds);
    expect(back).toMatchObject({ income: false, categoryId: 'cat-groceries', categoryChosenByHand: false });
    expect(isSuggested(back)).toBe(true);
  });
  it('back to an expense, suggests nothing for a payee with no usable suggestion, or no payee', () => {
    const viaEmployer = toggleIncome(withPayee(fresh(), employer, expenseIds), lists.payees, expenseIds);
    expect(toggleIncome(viaEmployer, lists.payees, expenseIds).categoryId).toBeNull();
    const typedOnly = toggleIncome(withPayeeText(fresh(), 'Corner Shop'), lists.payees, expenseIds);
    expect(toggleIncome(typedOnly, lists.payees, expenseIds).categoryId).toBeNull();
  });
  it('back to an expense after an income category was chosen by hand, still suggests from the payee', () => {
    const income = withCategory(toggleIncome(withPayee(fresh(), cornerShop, expenseIds), lists.payees, expenseIds), 'cat-salary');
    expect(toggleIncome(income, lists.payees, expenseIds)).toMatchObject({ categoryId: 'cat-groceries', categoryChosenByHand: false });
  });
  it('flips income and clears the category, by hand or not', () => {
    const d = toggleIncome(withCategory(fresh(), 'cat-rent'), lists.payees, expenseIds);
    expect(d).toMatchObject({ income: true, categoryId: null, categoryChosenByHand: false });
    expect(toggleIncome(d, lists.payees, expenseIds).income).toBe(false);
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
    const d = { ...amount(toggleIncome(fresh(), lists.payees, expenseIds)), accountId: 'acct-savings' };
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

// --- Task 4: what the sheet shows, and the payee sent on Save ---

const plan = fakePlanMonth; // November 2026
const typed = (d: Draft, digits: string): Draft => ({ ...d, entry: { digits, decimals: null } });

describe('resolvePayee', () => {
  it('turns typed text that is an existing payee into that payee, so Save does not create a duplicate', () => {
    const d = resolvePayee(withPayeeText(fresh(), '  noodle BAR '), lists.payees);
    expect(d).toMatchObject({ payeeId: 'payee-noodle-bar', payeeText: 'Noodle Bar' });
    expect(toTransaction(typed(d, '5')).transaction).toEqual({ date: '2026-11-19', amount: -500, cleared: false, payee: 'payee-noodle-bar' });
  });
  it('leaves a new name, and the category, alone', () => {
    const d = withCategory(withPayeeText(fresh(), 'Night Owl Cafe'), 'cat-dining');
    expect(resolvePayee(d, lists.payees)).toBe(d);
  });
  it('leaves a picked payee alone', () => {
    const d = withPayee(fresh(), cornerShop, expenseIds);
    expect(resolvePayee(d, lists.payees)).toBe(d);
  });
});

describe('withAccount', () => {
  it('sets the account', () => expect(withAccount(fresh(), 'acct-card').accountId).toBe('acct-card'));
});

describe('canStepForward', () => {
  it('is false on today and true on an earlier day', () => {
    expect(canStepForward(fresh(), nov19)).toBe(false);
    expect(canStepForward(stepDate(fresh(), -1, nov19), nov19)).toBe(true);
  });
});

describe('expenseCategoryIds', () => {
  it("is every category in the plan's groups", () => {
    expect(expenseCategoryIds(plan)).toEqual(new Set(['cat-rent', 'cat-electricity', 'cat-insurance', 'cat-groceries', 'cat-dining', 'cat-emergency']));
  });
});

describe('cardView', () => {
  it('no category', () => {
    expect(cardView(typed(fresh(), '5'), lists, plan)).toEqual({ name: null, suggested: false, bite: null });
  });
  it('a suggested expense category with the bite against this month', () => {
    const view = cardView(typed(withPayee(fresh(), cornerShop, expenseIds), '18'), lists, plan);
    expect(view).toMatchObject({ name: 'Groceries', suggested: true });
    expect(view.bite).toMatchObject({ state: 'fits', before: '$207.62', after: '$189.62 after', warning: null });
  });
  it('more than the category has', () => {
    const view = cardView(typed(withCategory(fresh(), 'cat-electricity'), '150'), lists, plan);
    expect(view.bite).toMatchObject({ state: 'over', warning: 'That is $30.00 more than Electricity has' });
  });
  it('a date in an earlier month: the name, no bite', () => {
    const oct = { ...withCategory(typed(fresh(), '5'), 'cat-groceries'), date: '2026-10-31' };
    expect(cardView(oct, lists, plan)).toEqual({ name: 'Groceries', suggested: false, bite: null });
  });
  it('income: the income category by name, no bite', () => {
    const d = withCategory(typed(toggleIncome(fresh(), lists.payees, expenseIds), '5'), 'cat-salary');
    expect(cardView(d, lists, plan)).toEqual({ name: 'Salary', suggested: false, bite: null });
  });
});

describe('categoryChoices', () => {
  it("for an expense, the plan's categories in order, each with its balance", () => {
    const choices = categoryChoices(fresh(), lists, plan);
    expect(choices.map(c => c.name)).toEqual(['Rent', 'Electricity', 'Insurance', 'Groceries', 'Dining out', 'Emergency fund']);
    expect(choices[3]).toEqual({ id: 'cat-groceries', name: 'Groceries', detail: { text: '$207.62', tone: 'mute' } });
    expect(choices[4].detail?.text).toBe('−$28.10');
  });
  it('an overspent balance is coral, as its tile on the Plan says Overspent', () => {
    expect(categoryChoices(fresh(), lists, plan)[4].detail).toEqual({ text: '−$28.10', tone: 'over' });
  });
  it('a balance below zero with rollover overspending stays quiet, as its tile does', () => {
    const rolling = {
      ...plan,
      groups: plan.groups.map(g => ({ ...g, categories: g.categories.map(c => (c.id === 'cat-dining' ? { ...c, carryover: true } : c)) })),
    };
    expect(categoryChoices(fresh(), lists, rolling)[4].detail).toEqual({ text: '−$28.10', tone: 'mute' });
  });
  it('a zero balance is quiet', () => {
    expect(categoryChoices(fresh(), lists, plan)[0].detail).toEqual({ text: '$0.00', tone: 'mute' });
  });
  it('for a date in an earlier month, no balances', () => {
    const choices = categoryChoices({ ...fresh(), date: '2026-10-31' }, lists, plan);
    expect(choices[3]).toEqual({ id: 'cat-groceries', name: 'Groceries' });
  });
  it('for income, the income categories', () => {
    expect(categoryChoices(toggleIncome(fresh(), lists.payees, expenseIds), lists, plan)).toEqual(lists.incomeCategories);
  });
});
