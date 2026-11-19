import { currentMonth, localDay } from '../../lib/month';

/** Coming back within this long of the last successful sync, on the same day, does nothing. */
export const QUIET_AFTER_SYNC_MS = 60_000;

export type Showing = { today: Date; month: string };

/**
 * The Plan has come back to the foreground at `now`. "Today" is renewed when the day has
 * changed (and kept otherwise, so nothing re-renders for a return on the same day). A Plan
 * that was showing the current month follows it into a new one; a month the person chose
 * stays. It syncs when the day has changed, or when the last successful sync was a minute or
 * more ago, or when there has been none since the budget opened (`lastSynced` null).
 */
export function afterReturn(showing: Showing, now: Date, lastSynced: Date | null): Showing & { sync: boolean } {
  const newDay = localDay(now) !== localDay(showing.today);
  const today = newDay ? now : showing.today;
  const month = showing.month === currentMonth(showing.today) ? currentMonth(today) : showing.month;
  const sync = newDay || lastSynced === null || now.getTime() - lastSynced.getTime() >= QUIET_AFTER_SYNC_MS;
  return { today, month, sync };
}
