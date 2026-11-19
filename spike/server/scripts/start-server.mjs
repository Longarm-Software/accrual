// Starts the throwaway Actual sync server on 127.0.0.1:5007 with its own data dir.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { PORT, serverDataDir } from './env.mjs';

fs.mkdirSync(serverDataDir, { recursive: true });
const require = createRequire(import.meta.url);
const pkg = require.resolve('@actual-app/sync-server/package.json');
const bin = path.join(path.dirname(pkg), 'build/bin/actual-server.js');

const child = spawn(process.execPath, [bin], {
  stdio: 'inherit',
  env: {
    ...process.env,
    ACTUAL_PORT: String(PORT),
    ACTUAL_HOSTNAME: '127.0.0.1',
    ACTUAL_DATA_DIR: serverDataDir,
  },
});
child.on('exit', code => process.exit(code ?? 0));
