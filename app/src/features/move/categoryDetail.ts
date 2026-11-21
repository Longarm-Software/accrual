// What the category screen says: how its balance came about, and its month's transactions.
import type { ActivityRow, PlanCategory } from '../../engine/types';
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
