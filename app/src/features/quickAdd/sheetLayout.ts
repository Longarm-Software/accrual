// How the quick-add sheet fits a screen. The keypad is fixed at the bottom and the form scrolls
// above it; on a short screen the regular sheet hid the category card under the keypad, so a
// compact density (smaller keys, amount and gaps, from `sheet` in theme/tokens.ts) takes over.

export type SheetDensity = 'regular' | 'compact';

/**
 * The window height, in points, from which the regular sheet fits at text size 1: it was seen to
 * fit a 360 × 800 phone, and its parts add up to about 765 points with the system bars.
 */
const REGULAR_FROM = 780;
/**
 * The extra height a text size above 1 needs, per unit of scale: the payee, the card's lines,
 * the account and the date grow with the text (the amount and the key digits do not).
 */
const PER_TEXT_SCALE = 200;

/** Regular where the regular sheet fits; compact on shorter screens, or larger text. */
export function sheetDensity(windowHeight: number, fontScale: number): SheetDensity {
  const needed = REGULAR_FROM + PER_TEXT_SCALE * (Math.max(1, fontScale) - 1);
  return windowHeight >= needed ? 'regular' : 'compact';
}

/** Whether the form runs on below the bottom of its scroll area: a fade there says so. */
export function moreBelow({ offset, viewport, content }: { offset: number; viewport: number; content: number }): boolean {
  return content - viewport - offset > 1;
}
