import type { PlanGroup, PlanMonth } from '../../engine/types';
import { formatMoney, formatWholeMoney } from '../../lib/money';
import { isOverspent } from './categoryView';

/** One part of the flow key: the quiet words, then the amount drawn in ink. */
export type FlowKey = { words: string; amount: string };

export type HeroView = {
  state: 'ready' | 'even' | 'over';
  label: string;
  amount: number; // toBudget, cents
  flow: { spent: number; setAside: number; free: number }; // shares of the bar, summing to 1 (or all 0)
  keys: { spent: FlowKey; setAside: FlowKey; free: FlowKey };
};

export function heroView(month: PlanMonth): HeroView {
  const { toBudget } = month;
  const state = toBudget < 0 ? 'over' : toBudget === 0 ? 'even' : 'ready';
  const label = { ready: 'Ready to budget', even: 'Every dollar has a job', over: 'Overbudgeted' }[state];

  const spent = Math.max(0, -month.totalSpent);
  const setAside = Math.max(0, month.totalBudgeted - spent);
  const free = Math.max(0, toBudget);
  const total = spent + setAside + free;
  const share = (n: number): number => (total > 0 ? n / total : 0);

  return {
    state,
    label,
    amount: toBudget,
    flow: { spent: share(spent), setAside: share(setAside), free: share(free) },
    keys: {
      spent: { words: 'Spent', amount: formatWholeMoney(spent) },
      setAside: { words: 'Still set aside', amount: formatWholeMoney(setAside) },
      free: { words: 'Free', amount: formatWholeMoney(free) },
    },
  };
}

/** What a screen reader says for the top card's label and amount. */
export function heroLabel(hero: HeroView): string {
  return `${hero.label}, ${formatMoney(hero.amount)}`;
}

/**
 * The notice above the tiles, or null when nothing is overspent. A category whose overspending
 * rolls into next month is left out: Actual does not take it from this month's money, so there
 * is nothing to cover now.
 */
export function overspentNotice(month: PlanMonth): string | null {
  const over = month.groups.flatMap(g => g.categories).filter(isOverspent);
  if (over.length === 0) return null;
  if (over.length === 1) return `${over[0].name} is ${formatMoney(-over[0].balance)} over`;
  const total = over.reduce((sum, c) => sum - c.balance, 0);
  return `${over.length} categories are ${formatMoney(total)} over`;
}

/**
 * What a group's categories have left between them, for its header: the sum of the
 * positive balances. An overspent category is left out, so it does not hide money that
 * is still there in the others; the notice and the tile say what is over.
 */
export function groupAvailable(group: PlanGroup): number {
  return group.categories.reduce((sum, c) => sum + Math.max(0, c.balance), 0);
}

/** False when the budget has no expense categories to show. */
export function hasCategories(month: PlanMonth): boolean {
  return month.groups.some(g => g.categories.length > 0);
}

/** The chip beside the month: why the numbers may be behind the server, or null when they are not. */
export function syncLabel(sync: { offline: boolean; syncFailed: boolean }): string | null {
  if (sync.offline) return 'Offline';
  if (sync.syncFailed) return 'Not synced';
  return null;
}
