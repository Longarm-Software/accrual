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
    },
    gradient: ['#067A5B', '#0B6BA8'],
  },
};

export const radius = { tile: 22, card: 30, field: 20, pill: 99 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Font family names as registered in src/app/_layout.tsx. */
export const font = {
  display: 'BricolageGrotesque_600SemiBold',
  body: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  /** Amounts. Geist's figures are plainer and steadier than the display face's. */
  number: 'Geist_600SemiBold',
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
} as const;

/** Sizes for amounts drawn with `Money`: the dollars; the cents are half. */
export const amount = {
  hero: 58,
  tile: 27,
  /** A tile amount of $1,000 or more either way, one size down so it fits. */
  tileLong: 22,
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
} as const;

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
  /** The page behind an open menu, dimmed with `shade`. */
  scrim: 0.4,
  /** A shadow's strength, in `shade`. */
  shadow: 0.22,
} as const;

/** Shadows, for things that float over the page. `y` and `blur` are iOS's; `elevation` Android's. */
export const shadow = {
  menu: { y: 8, blur: 24, elevation: 12 },
} as const;

/** A `#RRGGBB` colour at the given opacity, as `rgba(...)`. */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${alpha})`;
}
