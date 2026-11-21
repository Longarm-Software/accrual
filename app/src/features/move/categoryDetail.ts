// What the category screen says: how its balance came about, and its month's transactions.
import type { ActivityRow, PlanCategory } from '../../engine/types';
import { currentMonth, monthLabel } from '../../lib/month';
import { formatMoney } from '../../lib/money';
import { isOverspent } from '../plan/categoryView';
import { dateLabel } from '../quickAdd/draft';

export type DetailRow = { label: string; amount: number; tone: 'plain' | 'mute' | 'over' };

/** Budgeted, Spent, Carried in (when there is any) and Left, in that order. */
export function detailRows(category: PlanCategory): DetailRow[] {
  const { budgeted, spent, balance } = category;
  const carried = balance - budgeted - spent;
  const rows: DetailRow[] = [
    { label: 'Budgeted', amount: budgeted, tone: 'plain' },
    { label: 'Spent', amount: spent, tone: 'plain' },
  ];
  if (carried !== 0) rows.push({ label: 'Carried in', amount: carried, tone: carried < 0 ? 'over' : 'plain' });
  const left = isOverspent(category) ? 'over' : balance < 0 ? 'mute' : 'plain';
  rows.push({ label: 'Left', amount: balance, tone: left });
  return rows;
}

export function activityTotal(rows: ActivityRow[]): number {
  return rows.reduce((sum, row) => sum + row.amount, 0);
}

/** "Today", "Yesterday", otherwise e.g. "Tue 17 Nov": quick add's date label, which does exactly this. */
export function activityDateLabel(date: string, today: Date): string {
  return dateLabel(date, today);
}

/** Said for a category the month's plan does not have: hidden, deleted, or a bad link. */
export const NOT_IN_BUDGET = 'This category is not in this budget.';

/** The heading over a month's transactions: "This month", or the month's name for any other. */
export function activityHeading(month: string, today: Date): string {
  return month === currentMonth(today) ? 'This month' : monthLabel(month).name;
}

/** One transaction as the category screen's list draws it. `tone` 'in' is money in: mint, with a "+". */
export type ActivityLine = {
  id: string;
  payee: string; // the payee, or "No payee"
  payeeTone: 'plain' | 'mute';
  meta: string; // "Today · Everyday Checking"
  amount: number;
  tone: 'in' | 'plain';
  label: string; // what a screen reader says for the row
};

/** Each transaction as the list draws it, in the order given. */
export function activityLines(rows: ActivityRow[], today: Date): ActivityLine[] {
  return rows.map(row => {
    const payee = row.payee ?? 'No payee';
    const date = activityDateLabel(row.date, today);
    const moneyIn = row.amount > 0;
    return {
      id: row.id,
      payee,
      payeeTone: row.payee === null ? 'mute' : 'plain',
      meta: `${date} · ${row.account}`,
      amount: row.amount,
      tone: moneyIn ? 'in' : 'plain',
      label: `${payee}, ${moneyIn ? '+' : ''}${formatMoney(row.amount)}, ${date}, ${row.account}`,
    };
  });
}
