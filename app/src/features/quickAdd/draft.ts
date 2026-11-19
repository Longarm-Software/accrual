import type { NewTransaction, PayeeChoice, QuickAddLists } from '../../engine/types';
import { addDays, localDay } from '../../lib/month';
import { emptyEntry, entryCents, type Entry } from './amountEntry';

/** The quick-add form as data. The sheet draws it; these functions are the only way it changes. */
export type Draft = {
  entry: Entry;
  income: boolean;
  payeeText: string;
  payeeId: string | null;
  categoryId: string | null;
  categoryChosenByHand: boolean;
  accountId: string | null;
  date: string; // YYYY-MM-DD
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function newDraft(lists: QuickAddLists, today: Date): Draft {
  return {
    entry: emptyEntry,
    income: false,
    payeeText: '',
    payeeId: null,
    categoryId: null,
    categoryChosenByHand: false,
    accountId: lists.lastAccountId ?? lists.accounts[0]?.id ?? null,
    date: localDay(today),
  };
}

/** True when the category is one the person did not choose: the card marks it "Suggested". */
export function isSuggested(draft: Draft): boolean {
  return draft.categoryId !== null && !draft.categoryChosenByHand;
}

/** Choosing an existing payee. Suggests the category it was last used with, if that one is offered. */
export function withPayee(draft: Draft, payee: PayeeChoice, validCategoryIds: Set<string>): Draft {
  const next = { ...draft, payeeId: payee.id, payeeText: payee.name };
  const suggestion = payee.lastCategoryId;
  if (!draft.categoryChosenByHand && !draft.income && suggestion !== null && validCategoryIds.has(suggestion)) {
    next.categoryId = suggestion;
  }
  return next;
}

/** Typing in the payee field. The chosen payee, and the category it suggested, no longer apply. */
export function withPayeeText(draft: Draft, text: string): Draft {
  return { ...draft, payeeText: text, payeeId: null, categoryId: isSuggested(draft) ? null : draft.categoryId };
}

export function withCategory(draft: Draft, categoryId: string | null): Draft {
  return { ...draft, categoryId, categoryChosenByHand: true };
}

/** Expense and income categories are different lists, so the category goes with the switch. */
export function toggleIncome(draft: Draft): Draft {
  return { ...draft, income: !draft.income, categoryId: null, categoryChosenByHand: false };
}

/** One day back or forward; never later than today. */
export function stepDate(draft: Draft, days: -1 | 1, today: Date): Draft {
  const last = localDay(today);
  const moved = addDays(draft.date, days);
  const date = moved > last ? last : moved;
  return date === draft.date ? draft : { ...draft, date };
}

/** "Today", "Yesterday", otherwise e.g. "Tue 17 Nov". English names, whatever the phone's locale. */
export function dateLabel(date: string, today: Date): string {
  const now = localDay(today);
  if (date === now) return 'Today';
  if (date === addDays(now, -1)) return 'Yesterday';
  const [y, m, d] = date.split('-').map(Number);
  return `${WEEKDAYS[new Date(y, m - 1, d).getDay()]} ${d} ${MONTHS[m - 1]}`;
}

export function canSave(draft: Draft): boolean {
  return entryCents(draft.entry) > 0 && draft.accountId !== null;
}

/** What Save sends to the engine. Only call it when `canSave` is true. */
export function toTransaction(draft: Draft): { accountId: string; transaction: NewTransaction } {
  if (!canSave(draft) || draft.accountId === null) throw new Error('This draft cannot be saved yet');
  const cents = entryCents(draft.entry);
  const transaction: NewTransaction = { date: draft.date, amount: draft.income ? cents : -cents, cleared: false };
  if (draft.categoryId !== null) transaction.category = draft.categoryId;
  const name = draft.payeeText.trim();
  if (draft.payeeId !== null) transaction.payee = draft.payeeId;
  else if (name !== '') transaction.payee_name = name;
  return { accountId: draft.accountId, transaction };
}
