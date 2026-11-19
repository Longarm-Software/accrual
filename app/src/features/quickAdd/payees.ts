import type { PayeeChoice } from '../../engine/types';

// Names compare after Unicode NFC, so "café" stored decomposed matches "café" typed on a phone.
const normal = (text: string): string => text.normalize('NFC').trim().toLowerCase();

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

/** The payee whose name is the typed text, ignoring case, outer spaces and Unicode normalisation, or null. */
export function exactPayee(payees: PayeeChoice[], text: string): PayeeChoice | null {
  const wanted = normal(text);
  if (wanted === '') return null;
  return payees.find(p => normal(p.name) === wanted) ?? null;
}
