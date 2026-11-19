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
