// What the Plan shares with the routes opened over it: quick add, the category screen, and the
// move and cover sheets. They are separate routes, so none can pass another props. The Plan
// publishes here its "today" (quick add dates a transaction with it), the month it is showing
// and its latest read of that month (the category screen draws it; a sheet acts on that month);
// a sheet says here that it changed the budget, so the Plan reads its month again and syncs.
import type { PlanMonth } from '../../engine/types';

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

/** The month the Plan is showing, and its latest read of it (null while it has none to show). */
export type PlanShown = { month: string; plan: PlanMonth | null };

let planShown: PlanShown | null = null;
const shownListeners = new Set<() => void>();

/** Set by the Plan whenever its month or its read of it changes; null once the Plan has gone. */
export function setPlanShown(shown: PlanShown | null): void {
  if (shown === planShown) return;
  planShown = shown;
  for (const listener of [...shownListeners]) listener();
}

export function getPlanShown(): PlanShown | null {
  return planShown;
}

/** Shaped for `useSyncExternalStore(onPlanShownChange, getPlanShown)`. Returns the function that stops it. */
export function onPlanShownChange(listener: () => void): () => void {
  shownListeners.add(listener);
  return () => {
    shownListeners.delete(listener);
  };
}

/** A sheet saved a transaction, or moved or covered money. */
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
