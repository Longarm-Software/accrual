// A pot is somewhere money can be moved from or to: Ready to budget, or a category on the Plan.
import { EngineError, READY, type PlanMonth, type PotId } from '../../engine/types';
import { checkMonthAndAmount } from '../../engine/writeRules';
import { formatMoney } from '../../lib/money';

export type Pot = { id: PotId; name: string; has: number }; // has: balance, or Ready to budget
export const READY_NAME = 'Ready to budget';

/** Ready to budget first, then every category of every group in plan order. */
export function pots(plan: PlanMonth): Pot[] {
  const categories = plan.groups.flatMap(g => g.categories).map(c => ({ id: c.id, name: c.name, has: c.balance }));
  return [{ id: READY, name: READY_NAME, has: plan.toBudget }, ...categories];
}

export function pot(plan: PlanMonth, id: PotId): Pot | null {
  return pots(plan).find(p => p.id === id) ?? null;
}

/**
 * What money arriving does to a pot: the mirror of quick add's bite. At or above zero the bar's
 * full width is what the pot will have; below zero it is the deficit, and what arrives fills it
 * in. Whatever `kept + gained` leaves of the bar is drawn as the empty track.
 */
export type Gain = {
  kept: number; // 0 to 1: the share of the bar that was there before (0 below zero)
  gained: number; // 0 to 1: the share that arrives; kept + gained === 1 when the pot started at or above zero
  before: string; // "$30.00"
  after: string; // "$40.00 after"
};

const MIN_GAINED = 0.04; // as bite's MIN_TAKEN: a small gain still shows

/** What `amount` cents (its positive size) arriving does to `p`. */
export function gain(p: Pot, amount: number): Gain {
  const before = formatMoney(p.has);
  const after = `${formatMoney(p.has + amount)} after`;
  const bar = (kept: number, gained: number): Gain => ({ kept, gained, before, after });
  if (amount <= 0) return bar(p.has > 0 ? 1 : 0, 0);
  // Below zero: the bar is the deficit, and the share of it this fills (all of it, or more, is 1).
  if (p.has < 0) return bar(0, Math.max(Math.min(1, amount / -p.has), MIN_GAINED));
  if (p.has === 0) return bar(0, 1);
  const gained = Math.max(1 - p.has / (p.has + amount), MIN_GAINED);
  return bar(1 - gained, gained);
}

/**
 * True when `check` (one of writeRules' checks) does not refuse: the sheets ask the adapter's own
 * rules. A refusal is an EngineError; anything else is a bug and is thrown on.
 */
export function accepted(check: () => void): boolean {
  try {
    check();
    return true;
  } catch (e) {
    if (e instanceof EngineError) return false;
    throw e;
  }
}

/**
 * The adapter's own form checks: a month in YYYY-MM and a whole amount from 1 cent to MAX_AMOUNT.
 * The bounds given are the month itself, because whether the budget has the month is the
 * adapter's to know; a plan the app is showing is one it has.
 */
export const wellFormed = (month: string, amount: number): boolean =>
  accepted(() => checkMonthAndAmount(month, amount, { start: month, end: month }));
