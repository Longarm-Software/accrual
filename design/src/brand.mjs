// Writes the chosen logo (1 · Ring) to design/brand/ as SVG files.
//   node design/src/brand.mjs
import { mkdirSync, writeFileSync } from 'node:fs';

import { marks } from './aurora-logo.mjs';

const ring = marks.find(m => m.name === 'Ring').draw;
const out = new URL('../brand/', import.meta.url);
mkdirSync(out, { recursive: true });

const gradient = `<linearGradient id="aurora" x1="10" y1="10" x2="86" y2="86" gradientUnits="userSpaceOnUse"><stop stop-color="#62EFC2"/><stop offset="1" stop-color="#5CCBF4"/></linearGradient>`;
const mark = (paint, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" fill="none">\n  ${defs ? `<defs>${defs}</defs>\n  ` : ''}${ring(paint)}\n</svg>\n`;

// The mark's ink is not centred in its 96-unit box (it spans x 11.5–75, y 24–82.5), so the
// icon centres the ink and scales it to 56% of the icon's width. Full-bleed and square: the
// store or the system rounds the corners.
const icon = (background, paint, defs) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" fill="none">\n  <defs>${defs}</defs>\n  ${background}\n  <g transform="translate(122.75 32.75) scale(9)">${ring(paint)}</g>\n</svg>\n`;

const files = {
  'accrual-mark.svg': mark('url(#aurora)', gradient),
  'accrual-mark-mono.svg': mark('currentColor'),
  'accrual-app-icon.svg': icon(
    '<rect width="1024" height="1024" fill="#07090C"/><rect width="1024" height="1024" fill="url(#glow)"/>',
    'url(#aurora)',
    `${gradient}<radialGradient id="glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="scale(1250)"><stop stop-color="#123B3A"/><stop offset="1" stop-color="#123B3A" stop-opacity="0"/></radialGradient>`,
  ),
  'accrual-app-icon-light.svg': icon(
    '<rect width="1024" height="1024" fill="url(#bg)"/>',
    '#062019',
    '<linearGradient id="bg" x1="0" y1="0" x2="1024" y2="1024" gradientUnits="userSpaceOnUse"><stop stop-color="#62EFC2"/><stop offset="1" stop-color="#5CCBF4"/></linearGradient>',
  ),
};
for (const [name, contents] of Object.entries(files)) {
  writeFileSync(new URL(name, out), contents);
  console.log(`brand/${name}`);
}
