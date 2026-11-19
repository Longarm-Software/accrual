// What the Plan and the quick-add sheet share. They are separate routes, so neither can pass
// the other props: the Plan publishes its "today" here for the sheet to date a transaction
// with, and the sheet says here that it saved one, so the Plan can read its month again.

let planToday: Date | null = null;
const listeners = new Set<() => void>();

/** The Plan's "today", set while the Plan is showing. Null when it is not. */
export function setPlanToday(today: Date | null): void {
  planToday = today;
}

export function getPlanToday(): Date | null {
  return planToday;
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
