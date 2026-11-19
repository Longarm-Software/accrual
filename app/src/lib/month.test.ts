import { currentMonth } from './month';

it('formats a date as YYYY-MM in local time', () => {
  expect(currentMonth(new Date(2026, 10, 19))).toBe('2026-11');
  expect(currentMonth(new Date(2027, 0, 1))).toBe('2027-01');
});
