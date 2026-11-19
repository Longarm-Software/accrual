// Loads tools/test-server/.env (gitignored). Creates it with a random throwaway
// password on first run, so no credential ever lives in committed code.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, '.env');

if (!fs.existsSync(envPath)) {
  fs.writeFileSync(
    envPath,
    `SPIKE_SERVER_PASSWORD=${crypto.randomBytes(18).toString('base64url')}\n`,
    { mode: 0o600 },
  );
}
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
}

export const PORT = 5007; // never 5006: that port belongs to a real server
export const SERVER_URL = `http://127.0.0.1:${PORT}`;
export const PASSWORD = process.env.SPIKE_SERVER_PASSWORD;
export const serverDataDir = path.join(root, 'data', 'server');
export const clientDataDir = name => {
  const dir = path.join(root, 'data', name);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};
