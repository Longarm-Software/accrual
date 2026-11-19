import type { PlanMonth } from '../../engine/types';
import { formatMoney, formatWholeMoney } from '../../lib/money';

export type HeroView = {
  state: 'ready' | 'even' | 'over';
  label: string;
  amount: number; // toBudget, cents
  flow: { spent: number; setAside: number; free: number }; // shares of the bar, summing to 1 (or all 0)
  spentText: string;
  setAsideText: string;
  freeText: string;
};

export function heroView(month: PlanMonth): HeroView {
  const { toBudget } = month;
  const state = toBudget < 0 ? 'over' : toBudget === 0 ? 'even' : 'ready';
  const label = { ready: 'Ready to budget', even: 'Every dollar has a job', over: 'Overbudgeted' }[state];

  const spent = -month.totalSpent;
  const setAside = Math.max(0, month.totalBudgeted - spent);
  const free = Math.max(0, toBudget);
  const total = spent + setAside + free;
  const share = (n: number): number => (total > 0 ? n / total : 0);

  return {
    state,
    label,
    amount: toBudget,
    flow: { spent: share(spent), setAside: share(setAside), free: share(free) },
    spentText: `Spent ${formatWholeMoney(spent)}`,
    setAsideText: `Still set aside ${formatWholeMoney(setAside)}`,
    freeText: `Free ${formatWholeMoney(free)}`,
  };
}

/** The notice above the tiles, or null when nothing is overspent. */
export function overspentNotice(month: PlanMonth): string | null {
  const over = month.groups.flatMap(g => g.categories).filter(c => c.balance < 0);
  if (over.length === 0) return null;
  if (over.length === 1) return `${over[0].name} is ${formatMoney(-over[0].balance)} over`;
  const total = over.reduce((sum, c) => sum - c.balance, 0);
  return `${over.length} categories are ${formatMoney(total)} over`;
}
