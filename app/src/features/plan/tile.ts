import type { PlanCategory } from '../../engine/types';
import { formatMoney } from '../../lib/money';
import type { Theme } from '../../theme/tokens';
import type { CategoryStatus, CategoryView } from './categoryView';

/** The one place a status decides a colour. Components ask this; they never choose. */
export function statusColor(status: CategoryStatus): keyof Theme['color'] {
  switch (status) {
    case 'ok':
      return 'ok';
    case 'goal':
      return 'goal';
    case 'needs':
      return 'need';
    case 'over':
      return 'over';
    case 'spent':
    case 'idle':
      return 'zero';
  }
}

/** True when the note takes the status colour too, not only the amount and bar. */
export const noteIsColoured = (status: CategoryStatus): boolean => status === 'over' || status === 'needs';

/** $1,000 or more either way: drawn one size smaller so it fits a tile. */
export const isLongAmount = (cents: number): boolean => Math.abs(cents) >= 100000;

/** What a screen reader says for a whole tile. */
export function tileLabel(category: PlanCategory, view: CategoryView): string {
  if (view.status === 'over') return `${category.name}, overspent by ${formatMoney(-category.balance)}`;
  return `${category.name}, ${formatMoney(category.balance)} available, ${view.note}`;
}
