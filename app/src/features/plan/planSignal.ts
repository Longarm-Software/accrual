// What the Plan and the quick-add sheet share. They are separate routes, so neither can pass
// the other props: the Plan publishes its "today" here for the sheet to date a transaction
// with, and the sheet says here that it saved one, so the Plan can read its month again.

let planToday: Date | null = null;
const dayListeners = new Set<() => void>();
const listeners = new Set<() => void>();

/** The Plan's "today", set while the Plan is showing. Null when it is not. */
export function setPlanToday(today: Date | null): void {
  if (today === planToday) return;
  planToday = today;
  for (const listener of [...dayListeners]) listener();
}

export function getPlanToday(): Date | null {
  return planToday;
}

/**
 * Calls `listener` each time the Plan's "today" changes (it renews it when the app returns to
 * the foreground), so an open sheet follows it past midnight. Returns the function that stops it.
 * Shaped for `useSyncExternalStore(onPlanTodayChange, getPlanToday)`.
 */
export function onPlanTodayChange(listener: () => void): () => void {
  dayListeners.add(listener);
  return () => {
    dayListeners.delete(listener);
  };
}

/** The sheet saved a transaction. */
export function announceSaved(): void {
  for (const listener of [...listeners]) listener();
}

/** Calls `listener` after each save. Returns the function that stops it. */
export function onSaved(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
