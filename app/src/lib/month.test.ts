import { addMonths, compareMonths, currentMonth, daysLeftInMonth, monthLabel } from './month';

it('formats a date as YYYY-MM in local time', () => {
  expect(currentMonth(new Date(2026, 10, 19))).toBe('2026-11');
  expect(currentMonth(new Date(2027, 0, 1))).toBe('2027-01');
});

describe('addMonths', () => {
  it('moves forward across a year end', () => {
    expect(addMonths('2026-11', 2)).toBe('2027-01');
    expect(addMonths('2026-11', 1)).toBe('2026-12');
  });
  it('moves backward across a year end', () => {
    expect(addMonths('2027-01', -2)).toBe('2026-11');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });
  it('moves by zero or by whole years', () => {
    expect(addMonths('2026-05', 0)).toBe('2026-05');
    expect(addMonths('2026-05', 12)).toBe('2027-05');
    expect(addMonths('2026-05', -17)).toBe('2024-12');
  });
});

describe('compareMonths', () => {
  it('orders months', () => {
    expect(compareMonths('2026-10', '2026-11')).toBe(-1);
    expect(compareMonths('2026-11', '2026-11')).toBe(0);
    expect(compareMonths('2027-01', '2026-12')).toBe(1);
  });
});

describe('monthLabel', () => {
  it('splits a month into name and year', () => {
    expect(monthLabel('2026-11')).toEqual({ name: 'November', year: '2026' });
    expect(monthLabel('2027-01')).toEqual({ name: 'January', year: '2027' });
  });
});

describe('daysLeftInMonth', () => {
  it('counts today on the first day', () => {
    expect(daysLeftInMonth('2026-11', new Date(2026, 10, 1))).toBe(30);
  });
  it('counts today on a middle day', () => {
    expect(daysLeftInMonth('2026-11', new Date(2026, 10, 19))).toBe(12);
  });
  it('is 1 on the last day', () => {
    expect(daysLeftInMonth('2026-11', new Date(2026, 10, 30))).toBe(1);
  });
  it('knows a leap-year February', () => {
    expect(daysLeftInMonth('2028-02', new Date(2028, 1, 1))).toBe(29);
    expect(daysLeftInMonth('2027-02', new Date(2027, 1, 1))).toBe(28);
  });
  it('is 0 for a month that is not today\'s', () => {
    expect(daysLeftInMonth('2026-10', new Date(2026, 10, 19))).toBe(0);
    expect(daysLeftInMonth('2026-12', new Date(2026, 10, 19))).toBe(0);
  });
});
