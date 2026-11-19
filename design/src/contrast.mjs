// WCAG 2 contrast check for Aurora's colours (the ones in aurora2.mjs). Exits 1 if any fails.
//   node design/src/contrast.mjs
// Tiles are translucent glass over a gradient, so each text colour is tested against the
// glass composited over both ends of that gradient: the plain page and its brightest glow.
// Small text needs 4.5:1. Large text (24px and up, or 19px bold) needs 3:1.
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const over = (top, alpha, base) => top.map((c, i) => c * alpha + base[i] * (1 - alpha));
const lum = rgb => {
  const [r, g, b] = rgb.map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

export const themes = {
  dark: {
    surfaces: { 'tile on page': over([255, 255, 255], 0.065, hex('#07090C')), 'tile on glow': over([255, 255, 255], 0.065, hex('#0F3231')) },
    colours: { ink: '#F3F6F8', mute: '#A9B3BF', ok: '#62EFC2', goal: '#5CCBF4', need: '#FFC95C', over: '#FF9A8D', zero: '#A2ACB8' },
  },
  light: {
    surfaces: { 'tile on page': over([255, 255, 255], 0.72, hex('#F1F4F6')), 'tile on glow': over([255, 255, 255], 0.72, hex('#CFF3E6')) },
    colours: { ink: '#0D1418', mute: '#5A6675', ok: '#067A5B', goal: '#0B6BA8', need: '#8F5B00', over: '#C0341F', zero: '#677381' },
  },
};

let failed = false;
for (const [name, theme] of Object.entries(themes)) {
  console.log(`\n${name}`);
  for (const [token, colour] of Object.entries(theme.colours)) {
    const worst = Math.min(...Object.values(theme.surfaces).map(s => ratio(hex(colour), s)));
    if (worst < 4.5) failed = true;
    console.log(`  ${token.padEnd(5)} ${colour}  ${worst.toFixed(2)}:1  ${worst >= 4.5 ? 'passes for all text' : worst >= 3 ? 'LARGE TEXT ONLY' : 'FAILS'}`);
  }
}
if (failed) process.exit(1);
