// Aurora's design tokens. The text colours are the contrast-checked set from
// design/src/contrast.mjs; tokens.test.ts fails if they drift or stop passing WCAG AA.

export type Theme = {
  isDark: boolean;
  color: {
    ink: string; mute: string;
    ok: string; goal: string; need: string; over: string; zero: string;
    page: string; pageGlow: string;
    glass: string; solid: string; edge: string; track: string; sheet: string;
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
} as const;

export const type = {
  display: { fontFamily: font.display, fontSize: 58, letterSpacing: -2 },
  title: { fontFamily: font.display, fontSize: 36, letterSpacing: -1.2 },
  heading: { fontFamily: font.semibold, fontSize: 16 },
  body: { fontFamily: font.body, fontSize: 15.5, lineHeight: 22 },
  label: { fontFamily: font.medium, fontSize: 13 },
} as const;
