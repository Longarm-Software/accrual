// What a budget write must satisfy before it reaches loot-core. Pure functions, shared by the
// adapter and the fake engine so both refuse the same requests.
//
// loot-core checks almost nothing: it writes a budget row for whatever month, category id and
// amount it is given, and a bad month once wrote rows that broke every client that downloaded the
// budget. So each write is checked against the month as it is at that moment, read just before
// the write, and anything that would not do exactly what the caller asked is refused:
//   'invalid-move'         the request is malformed: not a month in the budget, not a whole
//                          amount in range, a pot that is not a visible expense category or
//                          Ready to budget where Ready to budget is allowed, the same pot twice,
//                          no `seen` figures. The part that needs no read of the budget (the
//                          shape) is checked by checkMoveShape / checkCoverShape, so the adapter
//                          refuses it before it syncs or reads anything.
//   'stale'                well-formed, but the budget is not what the screen that asked was
//                          showing: the source has less than the amount, the category is not
//                          overspent by at least the amount, or a pot named has other figures
//                          than the request's `seen` (so the result would differ from what the
//                          person saw, even if it is still allowed)
//   'invalid-transaction'  a transaction with a date that is not on the calendar, or an amount
//                          that is zero, fractional or out of range
// Messages never name a category or an amount.
import { EngineError, READY } from './types';
import type { CoverRequest, MonthBounds, MoveRequest, PlanCategory, PlanMonth, PotId } from './types';

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

/** A pot or category id as the app's links carry them: letters, digits, "-" and "_" (Actual's ids are UUIDs). */
const isId = (id: unknown): id is string => typeof id === 'string' && /^[A-Za-z0-9_-]+$/.test(id);
/** A figure a sheet drew: whole cents, either sign. */
const isCents = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n);

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

/**
 * What can be refused in a move without reading the budget: the month's and amount's form, the
 * ids' form, the same pot twice, and `seen` missing or not whole cents.
 */
export function checkMoveShape(move: MoveRequest): void {
  if (typeof move !== 'object' || move === null) throw invalid('Not a move');
  const { month, from, to, amount, seen } = move;
  if (!isMonth(month)) throw invalid('Not a month in this budget');
  if (!isAmount(amount)) throw invalid('The amount must be a whole number of cents above zero');
  if (!isId(from) || !isId(to)) throw invalid('Not a category money can move to or from');
  if (from === to) throw invalid('Money cannot move to the pot it comes from');
  if (typeof seen !== 'object' || seen === null || !isCents(seen.from) || !isCents(seen.to)) {
    throw invalid('The move must say what the sheet showed');
  }
}

/** What can be refused in a cover without reading the budget; as checkMoveShape, and READY as the category. */
export function checkCoverShape(cover: CoverRequest): void {
  if (typeof cover !== 'object' || cover === null) throw invalid('Not a cover');
  const { month, category, from, amount, seen } = cover;
  if (!isMonth(month)) throw invalid('Not a month in this budget');
  if (!isAmount(amount)) throw invalid('The amount must be a whole number of cents above zero');
  if (!isId(category) || category === READY) throw invalid('Not a category that can be covered');
  if (!isId(from)) throw invalid('Not a category money can move from');
  if (from === category) throw invalid('A category cannot cover itself');
  if (typeof seen !== 'object' || seen === null || !isCents(seen.category) || !isCents(seen.from)) {
    throw invalid('The cover must say what the sheet showed');
  }
}

const changed = () => stale('The budget changed since the sheet read it');

/**
 * A move between two pots, against the month it is made in. The month's bounds are checked
 * separately (checkMonthAndAmount); everything else is checked here, the shape first.
 */
export function checkMove(plan: PlanMonth, move: MoveRequest): void {
  checkMoveShape(move);
  const { from, to, amount, seen } = move;
  for (const pot of [from, to]) {
    if (pot !== READY && !findCategory(plan, pot)) throw invalid('Not a category money can move to or from');
  }
  if (amount > available(plan, from)) throw stale('The source no longer has that much');
  if (seen.from !== available(plan, from) || seen.to !== available(plan, to)) throw changed();
}

/** A cover of a category's overspending, against the month it is made in. The month's bounds are checked separately. */
export function checkCover(plan: PlanMonth, cover: CoverRequest): void {
  checkCoverShape(cover);
  const { category, from, amount, seen } = cover;
  const target = findCategory(plan, category);
  if (!target) throw invalid('Not a category that can be covered');
  if (from !== READY && !findCategory(plan, from)) throw invalid('Not a category money can move from');
  if (target.balance >= 0) throw stale('The category is no longer overspent');
  if (amount > -target.balance) throw stale('The category is overspent by less than that');
  if (amount > available(plan, from)) throw stale('The source no longer has that much');
  if (seen.category !== target.balance || seen.from !== available(plan, from)) throw changed();
}

/** A transaction's date and amount, before it is added. Either sign; never zero. */
export function checkTransaction(transaction: { date: string; amount: number }): void {
  if (!isDate(transaction.date)) throw new EngineError('invalid-transaction', 'Not a date');
  const { amount } = transaction;
  if (typeof amount !== 'number' || amount === 0 || !isAmount(Math.abs(amount))) {
    throw new EngineError('invalid-transaction', 'The amount must be a whole number of cents other than zero');
  }
}
