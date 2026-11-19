// The amount as it is typed on the keypad: always non-negative; the sign is kept in the draft.
// Cents are built from the digit strings, never by parsing a decimal string.

import { formatMoney } from '../../lib/money';

export type Entry = { digits: string; decimals: string | null }; // decimals null until "." is pressed
export type Key = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '00' | '.' | 'back';

export const emptyEntry: Entry = { digits: '', decimals: null };

const MAX_WHOLE_DIGITS = 7; // $9,999,999.99
const MAX_DECIMALS = 2;

/** What one key does to the entry. A key that cannot apply in full leaves the entry unchanged. */
export function press(entry: Entry, key: Key): Entry {
  const { digits, decimals } = entry;
  if (key === 'back') {
    if (decimals === null) return { digits: digits.slice(0, -1), decimals: null };
    if (decimals !== '') return { digits, decimals: decimals.slice(0, -1) };
    // Removing the point. "0." came from pressing "." alone, so it goes back to empty.
    return digits === '0' ? emptyEntry : { digits, decimals: null };
  }
  if (key === '.') return decimals === null ? { digits: digits === '' ? '0' : digits, decimals: '' } : entry;
  if (decimals !== null) {
    const room = MAX_DECIMALS - decimals.length;
    if (room <= 0) return entry;
    return { digits, decimals: decimals + key.slice(0, room) }; // "00" with one place left adds one zero
  }
  if (digits === '' && (key === '0' || key === '00')) return entry;
  if (digits.length + key.length > MAX_WHOLE_DIGITS) return entry;
  return { digits: digits + key, decimals: null };
}

export function entryCents(entry: Entry): number {
  const whole = entry.digits === '' ? 0 : parseInt(entry.digits, 10);
  const cents = parseInt((entry.decimals ?? '').padEnd(MAX_DECIMALS, '0'), 10);
  return whole * 100 + cents;
}

/**
 * What the amount display draws: the entry exactly as typed, so "." and a trailing decimal show
 * the moment they are pressed. `whole` is the sign and the grouped dollars ("−$1,250"),
 * `fraction` what follows ("", ".", ".4", ".40"), drawn at the cents' size. Before anything is
 * typed it is a dimmed "$0.00". `label` is what a screen reader says: always the full amount.
 */
export type EntryText = { whole: string; fraction: string; dimmed: boolean; label: string };

export function entryText(entry: Entry, income: boolean): EntryText {
  const cents = entryCents(entry);
  const label = (income && cents > 0 ? '+' : '') + formatMoney(income ? cents : -cents);
  if (entry.digits === '' && entry.decimals === null) return { whole: '$0', fraction: '.00', dimmed: true, label };
  const grouped = (entry.digits === '' ? '0' : entry.digits).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return {
    whole: `${income ? '+' : '−'}$${grouped}`,
    fraction: entry.decimals === null ? '' : `.${entry.decimals}`,
    dimmed: false,
    label,
  };
}
