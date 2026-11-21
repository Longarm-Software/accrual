import fs from 'node:fs';
import path from 'node:path';

import { contrastRatio } from './contrast';
import { themes, withAlpha } from './tokens';

const textColours = ['ink', 'mute', 'ok', 'goal', 'need', 'over', 'zero'] as const;

describe.each(['dark', 'light'] as const)('%s theme', name => {
  const theme = themes[name];

  it.each(textColours)('%s passes WCAG AA on a tile', token => {
    // `solid` is the tile colour where there is no blur (Android), which is the flat worst case.
    expect(contrastRatio(theme.color[token], theme.color.solid)).toBeGreaterThanOrEqual(4.5);
  });

  it('uses the colours the design was checked with', () => {
    const design = fs.readFileSync(path.join(__dirname, '../../../design/src/contrast.mjs'), 'utf8');
    for (const token of textColours) expect(design).toContain(theme.color[token]);
  });
});

it('contrastRatio matches known values', () => {
  expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
  expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 1);
});

it('withAlpha turns a hex colour into rgba', () => {
  expect(withAlpha('#FF9A8D', 0.5)).toBe('rgba(255,154,141,0.5)');
});

// A keypad key's edge is drawn translucent over the page; this is the colour that shows.
const over = (rgba: string, page: string): string => {
  const [r, g, b, a] = rgba.match(/[\d.]+/g)!.map(Number);
  const base = [1, 3, 5].map(i => parseInt(page.slice(i, i + 2), 16));
  return '#' + [r, g, b].map((c, i) => Math.round(c * a + base[i] * (1 - a)).toString(16).padStart(2, '0')).join('');
};

it.each(['dark', 'light'] as const)('a keypad key has an edge that shows against the %s page', name => {
  const { keyEdge, page } = themes[name].color;
  expect(contrastRatio(over(keyEdge, page), page)).toBeGreaterThanOrEqual(1.2);
});

// The top card's pill is filled: the accent gradient with `onAccent`, or coral with `onOver`.
it.each(['dark', 'light'] as const)('a filled pill\'s word passes WCAG AA on the %s theme', name => {
  const theme = themes[name];
  for (const end of theme.gradient) expect(contrastRatio(theme.color.onAccent, end)).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio(theme.color.onOver, theme.color.over)).toBeGreaterThanOrEqual(4.5);
});

// An unchecked round check mark is a control: its ring must show (WCAG 1.4.11, 3:1) on a tile.
it.each(['dark', 'light'] as const)('an empty check mark shows against a %s tile', name => {
  const { control, solid } = themes[name].color;
  expect(contrastRatio(control, solid)).toBeGreaterThanOrEqual(3);
});
