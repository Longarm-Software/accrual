import type { PlanCategory } from '../../engine/types';
import { formatMoney } from '../../lib/money';

export type Bite = {
  state: 'none' | 'fits' | 'over';
  kept: number; // 0 to 1: the share of the bar left solid
  taken: number; // 0 to 1: the hatched share; kept + taken === 1 when state is 'fits'
  before: string; // "$207.62"
  after: string; // "$189.22 after" or "−$4.90 after"
  warning: string | null; // "That is $4.90 more than Coffee has"
};

const MIN_TAKEN = 0.04; // the hatched part is never narrower than this, so a small purchase still shows

/** What an expense of `amountCents` (its positive size) does to a category's balance. */
export function bite(category: Pick<PlanCategory, 'name' | 'balance'>, amountCents: number): Bite {
  const { name, balance } = category;
  const before = formatMoney(balance);
  const after = `${formatMoney(balance - amountCents)} after`;
  if (amountCents <= 0) {
    return { state: 'none', kept: balance > 0 ? 1 : 0, taken: 0, before, after, warning: null };
  }
  if (amountCents <= balance) {
    const taken = Math.max(amountCents / balance, MIN_TAKEN);
    return { state: 'fits', kept: 1 - taken, taken, before, after, warning: null };
  }
  const more = formatMoney(amountCents - Math.max(balance, 0));
  return { state: 'over', kept: 0, taken: 1, before, after, warning: `That is ${more} more than ${name} has` };
}
