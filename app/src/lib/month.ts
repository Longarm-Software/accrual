/** The month Actual calls "YYYY-MM", in the phone's own time zone. */
export function currentMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parseMonth(month: string): { year: number; index: number } {
  const [y, m] = month.split('-');
  return { year: Number(y), index: Number(m) - 1 };
}

/** `addMonths('2026-11', 2)` is `'2027-01'`; `n` may be negative. */
export function addMonths(month: string, n: number): string {
  const { year, index } = parseMonth(month);
  const total = year * 12 + index + n;
  const y = Math.floor(total / 12);
  return `${y}-${String(total - y * 12 + 1).padStart(2, '0')}`;
}

export function compareMonths(a: string, b: string): -1 | 0 | 1 {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function monthLabel(month: string): { name: string; year: string } {
  const { year, index } = parseMonth(month);
  return { name: MONTH_NAMES[index], year: String(year) };
}

/** Days left in `month`, counting today; 0 when `month` is not today's month. */
export function daysLeftInMonth(month: string, today: Date): number {
  if (currentMonth(today) !== month) return 0;
  const { year, index } = parseMonth(month);
  const daysInMonth = new Date(year, index + 1, 0).getDate();
  return daysInMonth - today.getDate() + 1;
}
