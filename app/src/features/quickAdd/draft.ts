import type { NewTransaction, PayeeChoice, PlanCategory, PlanMonth, QuickAddLists } from '../../engine/types';
import { formatMoney } from '../../lib/money';
import { addDays, localDay } from '../../lib/month';
import { emptyEntry, entryCents, type Entry } from './amountEntry';
import { bite, type Bite } from './bite';
import { exactPayee } from './payees';

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

/**
 * Choosing an existing payee. Suggests the category it was last used with, if that one is offered.
 * A category chosen by hand is never touched; a suggested one belongs to the previous payee, so it
 * goes when the new payee has no suggestion of its own.
 */
export function withPayee(draft: Draft, payee: PayeeChoice, validCategoryIds: Set<string>): Draft {
  const next = { ...draft, payeeId: payee.id, payeeText: payee.name };
  if (draft.categoryChosenByHand) return next;
  const suggestion = payee.lastCategoryId;
  const usable = !draft.income && suggestion !== null && validCategoryIds.has(suggestion);
  next.categoryId = usable ? suggestion : null;
  return next;
}

/** Typing in the payee field. The chosen payee, and the category it suggested, no longer apply. */
export function withPayeeText(draft: Draft, text: string): Draft {
  return { ...draft, payeeText: text, payeeId: null, categoryId: isSuggested(draft) ? null : draft.categoryId };
}

export function withCategory(draft: Draft, categoryId: string | null): Draft {
  return { ...draft, categoryId, categoryChosenByHand: true };
}

/**
 * Expense and income categories are different lists, so the category goes with the switch.
 * Back to an expense, a picked payee suggests its category again, by the same rule as `withPayee`.
 */
export function toggleIncome(draft: Draft, payees: PayeeChoice[], validCategoryIds: Set<string>): Draft {
  const next = { ...draft, income: !draft.income, categoryId: null, categoryChosenByHand: false };
  const payee = next.income || next.payeeId === null ? undefined : payees.find(p => p.id === next.payeeId);
  return payee ? withPayee(next, payee, validCategoryIds) : next;
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

/**
 * Typed text that is an existing payee's name (ignoring case, outer spaces and normalisation)
 * means that payee: Save sends its id rather than creating a second payee of the same name.
 * The category is left as it is.
 */
export function resolvePayee(draft: Draft, payees: PayeeChoice[]): Draft {
  if (draft.payeeId !== null) return draft;
  const match = exactPayee(payees, draft.payeeText);
  return match ? { ...draft, payeeId: match.id, payeeText: match.name } : draft;
}

export function withAccount(draft: Draft, accountId: string): Draft {
  return { ...draft, accountId };
}

/** Whether the date's forward arrow can move: only on a day before today. */
export function canStepForward(draft: Draft, today: Date): boolean {
  return draft.date < localDay(today);
}

const planCategories = (plan: PlanMonth): PlanCategory[] => plan.groups.flatMap(group => group.categories);

/** The expense categories the sheet offers: every category in the plan's groups. */
export function expenseCategoryIds(plan: PlanMonth): Set<string> {
  return new Set(planCategories(plan).map(category => category.id));
}

/** The plan's balances are for its month only; a draft dated in another month must not show them. */
const balancesApply = (draft: Draft, plan: PlanMonth): boolean => draft.date.slice(0, 7) === plan.month;

export type CardView = { name: string | null; suggested: boolean; bite: Bite | null };

/**
 * What the category card shows. An expense in the plan's month shows the bite against the
 * category's balance now; income, or a date in another month, shows the name only.
 */
export function cardView(draft: Draft, lists: QuickAddLists, plan: PlanMonth): CardView {
  const none: CardView = { name: null, suggested: false, bite: null };
  if (draft.categoryId === null) return none;
  const suggested = isSuggested(draft);
  if (draft.income) {
    const income = lists.incomeCategories.find(c => c.id === draft.categoryId);
    return income ? { name: income.name, suggested, bite: null } : none;
  }
  const category = planCategories(plan).find(c => c.id === draft.categoryId);
  if (!category) return none;
  const shown = balancesApply(draft, plan) ? bite(category, entryCents(draft.entry)) : null;
  return { name: category.name, suggested, bite: shown };
}

export type CategoryChoice = { id: string; name: string; detail?: string };

/**
 * The category list: for an expense, the plan's categories group by group, in order, each with
 * its balance (when the draft is in the plan's month); for income, the income categories.
 */
export function categoryChoices(draft: Draft, lists: QuickAddLists, plan: PlanMonth): CategoryChoice[] {
  if (draft.income) return lists.incomeCategories;
  const withBalance = balancesApply(draft, plan);
  return planCategories(plan).map(({ id, name, balance }) =>
    withBalance ? { id, name, detail: formatMoney(balance) } : { id, name },
  );
}
