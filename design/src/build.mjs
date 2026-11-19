// Writes the HTML boards for each round into design/boards/<round>/ (gitignored).
//   node design/src/build.mjs [round ...]
import { mkdirSync, writeFileSync } from 'node:fs';

import { page } from './lib.mjs';

// Each board is a module exporting `meta`, `css` and `shots`.
export const rounds = {
  'round-1': ['ledger', 'aurora', 'meter'],
  'round-2': ['aurora-screens', 'aurora-checks'],
};

const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(rounds);
for (const round of wanted) {
  const out = new URL(`../boards/${round}/`, import.meta.url);
  mkdirSync(out, { recursive: true });
  for (const name of rounds[round]) {
    const board = await import(`./${name}.mjs`);
    writeFileSync(new URL(`${name}.html`, out), page({ ...board.meta, css: board.css, shots: board.shots, round: round.split('-')[1] }));
    console.log(`boards/${round}/${name}.html`);
  }
}
