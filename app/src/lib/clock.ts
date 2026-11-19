/**
 * The phone's clock: the one place the Plan reads the time, both for "today" and for when it
 * last synced, so a test that sets the system time moves both together.
 */
export function now(): Date {
  return new Date();
}
