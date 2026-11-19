// Renders each board in design/boards/<round>/ to a PNG in design/previews/<round>/ with headless Chrome.
//   node design/src/export.mjs <round> [direction ...]
// Set CHROME to a Chrome, Chromium or chrome-headless-shell binary if none is found.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const candidates = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'];
  const pw = join(homedir(), 'Library/Caches/ms-playwright');
  if (existsSync(pw)) {
    for (const dir of readdirSync(pw).filter(d => d.startsWith('chromium_headless_shell'))) {
      candidates.push(join(pw, dir, 'chrome-headless-shell-mac-arm64/chrome-headless-shell'));
    }
  }
  const found = candidates.find(c => existsSync(c));
  if (!found) throw new Error('No Chrome found. Set CHROME=/path/to/chrome.');
  return found;
}

const root = fileURLToPath(new URL('..', import.meta.url));
const [round, ...only] = process.argv.slice(2);
if (!round) throw new Error('Usage: export.mjs <round> [direction ...]');
const outDir = join(root, 'previews', round);
mkdirSync(outDir, { recursive: true });

const chrome = findChrome();
for (const file of readdirSync(join(root, 'boards', round)).filter(f => f.endsWith('.html'))) {
  const name = file.replace('.html', '');
  if (only.length && !only.includes(name)) continue;
  if (name.endsWith('-live')) continue; // moving boards are for the browser
  // The board says how big it is (see page() in lib.mjs).
  const html = readFileSync(join(root, 'boards', round, file), 'utf8');
  const width = html.match(/data-width="(\d+)"/)[1], height = html.match(/data-height="(\d+)"/)[1];
  execFileSync(chrome, [
    '--headless', '--hide-scrollbars', '--force-device-scale-factor=2', '--virtual-time-budget=8000',
    `--window-size=${width},${height}`, `--screenshot=${join(outDir, `${name}.png`)}`,
    `file://${join(root, 'boards', round, file)}`,
  ], { stdio: 'ignore' });
  console.log(`previews/${round}/${name}.png`);
}
