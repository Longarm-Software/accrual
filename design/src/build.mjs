// Writes one HTML board per direction into design/boards/ (gitignored).
//   node design/src/build.mjs [direction ...]
import { mkdirSync, writeFileSync } from 'node:fs';

import { page } from './lib.mjs';

export const directions = ['ledger', 'aurora', 'meter'];
const out = new URL('../boards/', import.meta.url);
mkdirSync(out, { recursive: true });

const wanted = process.argv.slice(2).length ? process.argv.slice(2) : directions;
for (const name of wanted) {
  const d = await import(`./${name}.mjs`);
  writeFileSync(new URL(`${name}.html`, out), page({ ...d.meta, css: d.css, shots: d.shots }));
  console.log(`boards/${name}.html`);
}
