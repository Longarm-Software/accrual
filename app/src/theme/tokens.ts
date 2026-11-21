// Aurora's design tokens. The text colours are the contrast-checked set from
// design/src/contrast.mjs; tokens.test.ts fails if they drift or stop passing WCAG AA.

export type Theme = {
  isDark: boolean;
  color: {
    ink: string; mute: string;
    ok: string; goal: string; need: string; over: string; zero: string;
    page: string; pageGlow: string;
    glass: string; solid: string; edge: string; track: string; sheet: string;
    /** A hairline that must show on a sheet or tile: a quiet button's edge. */
    line: string;
    /** #RRGGBB. What dims the page behind a menu, and the colour of shadows. */
    shade: string;
    onAccent: string;
    /** A keypad key's face. */
    key: string;
    /** A keypad key's hairline edge. On the light page the white faces need a dark edge to show. */
    keyEdge: string;
    /** What is drawn on a coral (`over`) fill: the Save key's tick when the amount is too much. */
    onOver: string;
    /** The ring of an unchecked control (a cover source's check mark): 3:1 on a tile, so it shows. */
    control: string;
  };
  /** Mint to blue: buttons, progress, the logo. */
  gradient: [string, string];
};

export const themes: { dark: Theme; light: Theme } = {
  dark: {
    isDark: true,
    color: {
      ink: '#F3F6F8', mute: '#A9B3BF',
      ok: '#62EFC2', goal: '#5CCBF4', need: '#FFC95C', over: '#FF9A8D', zero: '#A2ACB8',
      page: '#07090C', pageGlow: '#0F3231',
      glass: 'rgba(255,255,255,0.065)', solid: '#151B20', edge: 'rgba(255,255,255,0.11)',
      track: 'rgba(255,255,255,0.10)', sheet: '#12171C',
      line: 'rgba(255,255,255,0.22)', shade: '#000000',
      onAccent: '#04221B',
      key: 'rgba(255,255,255,0.07)', keyEdge: 'rgba(255,255,255,0.11)', onOver: '#1B0704',
      control: '#7D8896',
    },
    gradient: ['#62EFC2', '#5CCBF4'],
  },
  light: {
    isDark: false,
    color: {
      ink: '#0D1418', mute: '#5A6675',
      ok: '#067A5B', goal: '#0B6BA8', need: '#8F5B00', over: '#C0341F', zero: '#677381',
      page: '#F1F4F6', pageGlow: '#CFF3E6',
      glass: 'rgba(255,255,255,0.72)', solid: '#FFFFFF', edge: 'rgba(255,255,255,0.95)',
      track: 'rgba(13,20,24,0.08)', sheet: '#FAFCFD',
      line: 'rgba(13,20,24,0.16)', shade: '#0D1418',
      onAccent: '#FFFFFF',
      key: 'rgba(255,255,255,0.8)', keyEdge: 'rgba(13,20,24,0.14)', onOver: '#FFFFFF',
      control: '#7C8794',
    },
    gradient: ['#067A5B', '#0B6BA8'],
  },
};

export const radius = {
  tile: 22, card: 30, field: 20, pill: 99,
  /** A card on a sheet that shows a pot of money: the category on quick add. */
  pot: 24,
  key: 20,
} as const;
export const space = {
  /** A typed line's breathing room inside its field, above and below the text. */
  hair: 2,
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32,
} as const;

/** Font family names as registered in src/app/_layout.tsx. */
export const font = {
  display: 'BricolageGrotesque_600SemiBold',
  body: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  /** Amounts. Geist's figures are plainer and steadier than the display face's. */
  number: 'Geist_500Medium',
} as const;

export const type = {
  display: { fontFamily: font.display, fontSize: 58, letterSpacing: -2 },
  title: { fontFamily: font.display, fontSize: 36, letterSpacing: -1.2 },
  titleSmall: { fontFamily: font.display, fontSize: 28, letterSpacing: -1.2 },
  heading: { fontFamily: font.semibold, fontSize: 16 },
  body: { fontFamily: font.body, fontSize: 15.5, lineHeight: 22 },
  label: { fontFamily: font.medium, fontSize: 13 },
  /** The month in the top bar. */
  month: { fontFamily: font.semibold, fontSize: 17 },
  /** A category's name on its tile, and the top card's label. */
  name: { fontFamily: font.medium, fontSize: 13.5 },
  /** A group's name above its tiles. */
  group: { fontFamily: font.semibold, fontSize: 13 },
  /** The notice above the tiles. */
  notice: { fontFamily: font.body, fontSize: 14 },
  /** A tile's note and the top card's flow key. */
  note: { fontFamily: font.body, fontSize: 12 },
  chip: { fontFamily: font.semibold, fontSize: 12 },
  /** Text typed into a field. */
  input: { fontFamily: font.semibold, fontSize: 16.5 },
  /** A keypad key's digit. */
  key: { fontFamily: font.display, fontSize: 24 },
  /** The amounts under the bite bar, a row's detail, and a card's small control ("Change"). */
  figure: { fontFamily: font.medium, fontSize: 13 },
  /** The account and the date on quick add. */
  meta: { fontFamily: font.semibold, fontSize: 14 },
  /** A small pill button's word: Assign on the top card, Cover on the notice. */
  action: { fontFamily: font.semibold, fontSize: 13 },
  /** A pot card's FROM and TO: small capitals, spaced. */
  caps: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 0.8 },
  /** A row's name in a list on a sheet, and a payee match. */
  row: { fontFamily: font.medium, fontSize: 15.5 },
} as const;

/** Sizes for amounts drawn with `Money`: the dollars, and how the cents relate to them. */
export const amount = {
  /** The cents' size as a share of the dollars': smaller, but still plainly digits. */
  cents: 0.62,
  /** Letter spacing as a share of the font size: a little tight, never touching. */
  tracking: -0.015,
  hero: 58,
  tile: 27,
  /** A tile amount of $1,000 or more either way, one size down so it fits. Also a list's total line. */
  tileLong: 22,
  /** An amount in a list of rows (a category's details, its transactions): the size of body text. */
  row: type.body.fontSize,
  /** A list's total line (a category's Left): one step up the type scale from `row`. */
  rowTotal: type.month.fontSize,
  /** The amount being typed on quick add. */
  entry: 88,
  /** The amount being typed on a short screen (the compact sheet). */
  entryCompact: 56,
  /** How far a fitted amount may shrink to stay on one line: "−$9,999,999.99" at the entry size on a narrow phone. */
  minFit: 0.3,
} as const;

/** Fixed sizes of controls and marks. */
export const size = {
  button: 56,
  /** The round buttons in the top bar. */
  control: 40,
  /** A hairline that should read as a line, not a hint: the over tile's border. */
  border: 1,
  bar: 5,
  flow: 8,
  flowGap: 2,
  chip: 24,
  dot: 6,
  /** A chevron is a square with two sides drawn, turned 45 degrees. */
  chevron: 9,
  /** The chevron after a small control's word: "Change ›". */
  chevronSmall: 7,
  stroke: 2,
  /** The person mark on the account button: head and shoulders. */
  head: 8,
  shoulders: 14,
  menu: 240,
  /**
   * The month switcher's label at text scale 1: wide enough for "September 2026", the
   * longest month, so the arrows keep their place. Multiply by the person's font scale.
   */
  monthLabel: 150,
  /** The smallest height of anything that is pressed: keys, rows, arrows. */
  touch: 48,
  key: 60,
  /**
   * The quick-add amount's box. It holds the entry size on one line and never changes,
   * so the card and keypad under it never move as digits are typed.
   */
  entry: 108,
  /** The amount's box on the compact sheet: holds `amount.entryCompact` on one line. */
  entryCompact: 68,
  /** The bite bar's thickness. */
  bite: 10,
  /** A small pill button on a card or the notice. Its touch area is extended to `touch`. */
  action: 32,
  /** The round check mark at the right of a cover source. */
  check: 22,
  /** The tick on Save, and the smaller one on a picked row. */
  tick: 20,
  tickSmall: 12,
  tickStroke: 3,
  /** The spinner drawn in place of a button's label while its write runs (Save, Move, Cover). */
  spinnerInline: 22,
  /** The delete key's mark: the height of its arrow-shaped outline. */
  deleteMark: 16,
  /** The date stepper's label at text scale 1: wide enough for "Wed 30 Sep". Multiply by the font scale. */
  dateLabel: 92,
  /** The round "+" that floats over the Plan, and the length of its arms. */
  fab: 60,
  fabPlus: 22,
} as const;

/**
 * The quick-add sheet at its two densities (chosen by `sheetDensity` in features/quickAdd).
 * `key`: a keypad key's height. `amount`/`amountBox`: the typed amount's size and its box.
 * `gap`: between the form's parts, and around the keypad. `inset`: above and below the text
 * inside the payee field and the category card. Compact keeps every key at the touch minimum.
 */
export const sheet = {
  regular: { key: size.key, amount: amount.entry, amountBox: size.entry, gap: space.lg, inset: space.md },
  compact: { key: size.touch, amount: amount.entryCompact, amountBox: size.entryCompact, gap: space.sm, inset: space.sm },
} as const;

/**
 * The most the person's text size may enlarge a piece of text, where growing further would
 * break its box. `key`: a keypad digit at twice its size still fits a 60-point key. `amount`:
 * a fitted amount is already larger than the largest text, so it does not grow at all.
 * `action`: a small pill button's word grows to half again its size, so the pill stays small
 * beside the top card's label and the notice's text.
 */
export const textScale = { key: 2, amount: 1, action: 1.5 } as const;

/** Springs for the motion decision 10 allows. `bite`: the bite bar's split, quick and barely overshooting. */
export const spring = { bite: { damping: 20, stiffness: 220 } } as const;

/** The bite's hatching: stripes `stripe` thick, one every `period` points along the bar, leaning `angle`. */
export const hatch = { stripe: 3, period: 7, angle: '35deg' } as const;

/** How strongly a colour shows when it tints rather than paints. */
export const tint = {
  card: 0.16,
  cardOver: 0.2,
  notice: 0.13,
  noticeEdge: 0.45,
  tileOverEdge: 0.5,
  chip: 0.16,
  /** The flow bar: spent is near-full ink, set aside a quieter ink. */
  spent: 0.9,
  setAside: 0.38,
  disabled: 0.35,
  pressed: 0.85,
  cents: 0.6,
  /** The edge of the quick-add category card when the purchase is more than it has. */
  potOverEdge: 0.55,
  /** The page behind an open menu, dimmed with `shade`. */
  scrim: 0.4,
  /** A shadow's strength, in `shade`. */
  shadow: 0.22,
} as const;

/** Shadows, for things that float over the page. `y` and `blur` are iOS's; `elevation` Android's. */
export const shadow = {
  menu: { y: 8, blur: 24, elevation: 12 },
  /** The "+" floating over the Plan's tiles. */
  fab: { y: 6, blur: 18, elevation: 8 },
} as const;

/** A `#RRGGBB` colour at the given opacity, as `rgba(...)`. */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${alpha})`;
}
