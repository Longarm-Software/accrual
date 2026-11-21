// What a budget write must satisfy before it reaches loot-core. Pure functions, shared by the
// adapter and the fake engine so both refuse the same requests.
//
// loot-core checks almost nothing: it writes a budget row for whatever month, category id and
// amount it is given, and a bad month once wrote rows that broke every client that downloaded the
// budget. So each write is checked against the month as it is at that moment, read just before
// the write, and anything that would not do exactly what the caller asked is refused:
//   'invalid-move'         the request is malformed: not a month in the budget, not a whole
//                          amount in range, a pot that is not a visible expense category or
//                          Ready to budget where Ready to budget is allowed, the same pot twice
//   'stale'                well-formed, but the budget no longer allows it (the screen that asked
//                          was showing older figures): the source has less than the amount, or
//                          the category is not overspent by at least the amount
//   'invalid-transaction'  a transaction with a date that is not on the calendar, or an amount
//                          that is zero, fractional or out of range
// Messages never name a category or an amount.
import { EngineError, READY } from './types';
import type { MonthBounds, PlanCategory, PlanMonth, PotId } from './types';

/** The largest amount any write accepts, in cents ($99,999,999.99). The keypad stops below it. */
export const MAX_AMOUNT = 9_999_999_999;

/** YYYY-MM with a month from 01 to 12. Years before 1000 do not survive loot-core's month arithmetic. */
export const isMonth = (month: unknown): month is string =>
  typeof month === 'string' && /^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(month);

/** YYYY-MM-DD and a day that exists in that month. */
export function isDate(date: unknown): date is string {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !isMonth(date.slice(0, 7))) return false;
  const [year, month, day] = date.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day >= 1 && day <= daysInMonth;
}

const isAmount = (amount: unknown): amount is number =>
  typeof amount === 'number' && Number.isInteger(amount) && amount > 0 && amount <= MAX_AMOUNT;

const invalid = (message: string) => new EngineError('invalid-move', message);
const stale = (message: string) => new EngineError('stale', message);

/** The month must be one the budget has, and the amount a whole number of cents from 1 to MAX_AMOUNT. */
export function checkMonthAndAmount(month: string, amount: number, bounds: MonthBounds): void {
  if (!isMonth(month) || month < bounds.start || month > bounds.end) throw invalid('Not a month in this budget');
  if (!isAmount(amount)) throw invalid('The amount must be a whole number of cents above zero');
}

// A pot named in a write: READY where allowed, else a category the Plan shows for that month.
function findCategory(plan: PlanMonth, id: PotId): PlanCategory | undefined {
  for (const group of plan.groups) {
    const found = group.categories.find(c => c.id === id);
    if (found) return found;
  }
  return undefined;
}
const available = (plan: PlanMonth, pot: PotId) => (pot === READY ? plan.toBudget : findCategory(plan, pot)!.balance);

/** A move between two pots, against the month it is made in. Month and amount are checked separately. */
export function checkMove(plan: PlanMonth, move: { from: PotId; to: PotId; amount: number }): void {
  const { from, to, amount } = move;
  if (from === to) throw invalid('Money cannot move to the pot it comes from');
  for (const pot of [from, to]) {
    if (pot !== READY && !findCategory(plan, pot)) throw invalid('Not a category money can move to or from');
  }
  if (amount > available(plan, from)) throw stale('The source no longer has that much');
}

/** A cover of a category's overspending, against the month it is made in. Month and amount are checked separately. */
export function checkCover(plan: PlanMonth, cover: { category: string; from: PotId; amount: number }): void {
  const { category, from, amount } = cover;
  const target = category === READY ? undefined : findCategory(plan, category);
  if (!target) throw invalid('Not a category that can be covered');
  if (from === category) throw invalid('A category cannot cover itself');
  if (from !== READY && !findCategory(plan, from)) throw invalid('Not a category money can move from');
  if (target.balance >= 0) throw stale('The category is no longer overspent');
  if (amount > -target.balance) throw stale('The category is overspent by less than that');
  if (amount > available(plan, from)) throw stale('The source no longer has that much');
}

/** A transaction's date and amount, before it is added. Either sign; never zero. */
export function checkTransaction(transaction: { date: string; amount: number }): void {
  if (!isDate(transaction.date)) throw new EngineError('invalid-transaction', 'Not a date');
  const { amount } = transaction;
  if (typeof amount !== 'number' || amount === 0 || !isAmount(Math.abs(amount))) {
    throw new EngineError('invalid-transaction', 'The amount must be a whole number of cents other than zero');
  }
}
