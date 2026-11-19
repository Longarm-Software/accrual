import type { PlanCategory } from '../../engine/types';
import { compareMonths, currentMonth, daysLeftInMonth } from '../../lib/month';
import { formatMoney, formatWholeMoney } from '../../lib/money';

export type CategoryStatus = 'ok' | 'spent' | 'needs' | 'over' | 'goal' | 'idle';
export type CategoryView = {
  status: CategoryStatus;
  note: string;
  fill: number; // 0 to 1, how full the bar is
};

const clamp = (n: number): number => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/** What one tile says. The rules are checked in order; the first that matches wins. */
export function categoryView(category: PlanCategory, when: { month: string; today: Date }): CategoryView {
  const { budgeted, spent, balance, carryover, goal, longGoal } = category;
  const used = Math.max(0, -spent);
  const view = (status: CategoryStatus, note: string, fill: number): CategoryView => ({
    status,
    note,
    fill: clamp(fill),
  });
  const share = used === 0 ? 0 : used / (used + balance);

  // A negative balance that Actual carries into next month (rollover overspending) is not money
  // to find now: a debt tracked this way sits below zero on purpose. It is shown, quietly.
  if (balance < 0 && carryover) return view('spent', 'Rolls over to next month', 1);
  if (balance < 0) return view('over', 'Overspent', 1);
  if (goal !== null && longGoal) {
    if (balance >= goal) return view('goal', 'Goal reached', 1);
    return view('goal', `${Math.floor((balance * 100) / goal)}% of ${formatWholeMoney(goal)}`, balance / goal);
  }
  if (goal !== null && budgeted < goal) {
    return view('needs', `${formatMoney(goal - budgeted)} more needed`, budgeted / goal);
  }
  if (budgeted === 0 && spent === 0 && balance === 0) return view('idle', 'Nothing budgeted', 0);
  if (balance === 0) return view('spent', 'Fully spent', 1);
  const order = compareMonths(when.month, currentMonth(when.today));
  if (order === 0) {
    if (used === 0) return view('ok', 'Not spent yet', 0);
    const n = daysLeftInMonth(when.month, when.today);
    if (n >= 2) {
      // Whole dollars, rounded down: the pace must never add up to more than is left.
      const perDay = formatWholeMoney(Math.floor(balance / n / 100) * 100);
      if (perDay === '$0') return view('ok', `${formatMoney(balance)} left for ${n} days`, share);
      return view('ok', `${perDay} a day for ${n} days`, share);
    }
    return view('ok', `${formatMoney(balance)} left today`, share);
  }
  if (order < 0) return view('ok', `${formatMoney(balance)} left over`, share);
  return view('ok', 'Budgeted', share);
}
