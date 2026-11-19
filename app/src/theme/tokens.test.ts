import fs from 'node:fs';
import path from 'node:path';

import { contrastRatio } from './contrast';
import { themes } from './tokens';

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
