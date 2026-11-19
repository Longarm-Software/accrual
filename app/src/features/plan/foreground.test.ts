import { afterReturn, QUIET_AFTER_SYNC_MS } from './foreground';

const noon19 = new Date(2026, 10, 19, 12);
const later = (from: Date, ms: number) => new Date(from.getTime() + ms);

it('does nothing within a minute of the last sync on the same day', () => {
  const next = afterReturn({ today: noon19, month: '2026-11' }, later(noon19, QUIET_AFTER_SYNC_MS - 1), noon19);
  expect(next).toEqual({ today: noon19, month: '2026-11', sync: false });
});

it('syncs a minute or more after the last sync, keeping the same today', () => {
  const next = afterReturn({ today: noon19, month: '2026-11' }, later(noon19, QUIET_AFTER_SYNC_MS), noon19);
  expect(next).toEqual({ today: noon19, month: '2026-11', sync: true });
});

it('syncs at once when no sync has succeeded since the budget opened', () => {
  expect(afterReturn({ today: noon19, month: '2026-11' }, later(noon19, 1000), null).sync).toBe(true);
});

it('renews today and syncs on a new day, even within the minute', () => {
  const lateEvening = new Date(2026, 10, 19, 23, 59, 50);
  const justAfterMidnight = new Date(2026, 10, 20, 0, 0, 5);
  const next = afterReturn({ today: lateEvening, month: '2026-11' }, justAfterMidnight, lateEvening);
  expect(next).toEqual({ today: justAfterMidnight, month: '2026-11', sync: true });
});

it('follows the current month into the next', () => {
  const dec1 = new Date(2026, 11, 1, 7);
  expect(afterReturn({ today: new Date(2026, 10, 30, 22), month: '2026-11' }, dec1, null).month).toBe('2026-12');
});

it('keeps a month the person chose', () => {
  const dec1 = new Date(2026, 11, 1, 7);
  const nov30 = new Date(2026, 10, 30, 22);
  expect(afterReturn({ today: nov30, month: '2026-10' }, dec1, null).month).toBe('2026-10');
  expect(afterReturn({ today: nov30, month: '2026-12' }, dec1, null).month).toBe('2026-12');
});

it('follows the year end too', () => {
  const jan1 = new Date(2027, 0, 1, 9);
  expect(afterReturn({ today: new Date(2026, 11, 31, 20), month: '2026-12' }, jan1, null).month).toBe('2027-01');
});
