import type { PayeeChoice } from '../../engine/types';

const normal = (text: string): string => text.trim().toLowerCase();

/** Payees for the typed text: names that start with it, then names that only contain it, each in the order given. */
export function matchPayees(payees: PayeeChoice[], text: string, limit = 6): PayeeChoice[] {
  const wanted = normal(text);
  if (wanted === '') return payees.slice(0, limit);
  const starts: PayeeChoice[] = [];
  const contains: PayeeChoice[] = [];
  for (const payee of payees) {
    const name = normal(payee.name);
    if (name.startsWith(wanted)) starts.push(payee);
    else if (name.includes(wanted)) contains.push(payee);
  }
  return [...starts, ...contains].slice(0, limit);
}

/** The payee whose name is the typed text, ignoring case and outer spaces, or null. */
export function exactPayee(payees: PayeeChoice[], text: string): PayeeChoice | null {
  const wanted = normal(text);
  if (wanted === '') return null;
  return payees.find(p => normal(p.name) === wanted) ?? null;
}
