// Amounts are integer cents everywhere, as in Actual. These turn them into text.

export type MoneyParts = { sign: '' | '−'; dollars: string; cents: string };

/** The parts the design sets at different sizes: "−", "$1,204" and "55". */
export function splitMoney(cents: number): MoneyParts {
  const abs = Math.abs(Math.round(cents));
  return {
    sign: cents < 0 && abs !== 0 ? '−' : '',
    dollars: `$${Math.floor(abs / 100).toLocaleString('en-US')}`,
    cents: String(abs % 100).padStart(2, '0'),
  };
}

export function formatMoney(cents: number): string {
  const { sign, dollars, cents: c } = splitMoney(cents);
  return `${sign}${dollars}.${c}`;
}

/** Whole dollars, rounded to the nearest (halves away from zero): 1730 -> "$17", -2810 -> "−$28". */
export function formatWholeMoney(cents: number): string {
  const dollars = Math.round(Math.abs(cents) / 100);
  const sign = cents < 0 && dollars !== 0 ? '−' : '';
  return `${sign}$${dollars.toLocaleString('en-US')}`;
}
