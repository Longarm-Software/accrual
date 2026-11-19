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
  const { budgeted, spent, balance, goal, longGoal } = category;
  const used = -spent;
  const view = (status: CategoryStatus, note: string, fill: number): CategoryView => ({
    status,
    note,
    fill: clamp(fill),
  });
  const share = used / (used + balance);

  if (balance < 0) return view('over', 'Overspent', 1);
  if (goal !== null && longGoal) {
    if (balance >= goal) return view('goal', 'Goal reached', 1);
    return view('goal', `${Math.floor((balance / goal) * 100)}% of ${formatWholeMoney(goal)}`, balance / goal);
  }
  if (goal !== null && budgeted < goal) {
    return view('needs', `${formatMoney(goal - budgeted)} more needed`, budgeted / goal);
  }
  if (budgeted === 0 && spent === 0 && balance === 0) return view('idle', 'Nothing budgeted', 0);
  if (balance === 0) return view('spent', 'Fully spent', 1);
  if (used === 0) return view('ok', 'Not spent yet', 0);

  const order = compareMonths(when.month, currentMonth(when.today));
  if (order === 0) {
    const n = daysLeftInMonth(when.month, when.today);
    if (n >= 2) return view('ok', `${formatWholeMoney(balance / n)} a day for ${n} days`, share);
    return view('ok', `${formatMoney(balance)} left today`, share);
  }
  if (order < 0) return view('ok', `${formatMoney(balance)} left over`, share);
  return view('ok', 'Budgeted', share);
}
