// loot-core `#platform/server/fs` for React Native, on expo-file-system.
// loot-core works in plain POSIX paths; expo-file-system wants file:// URIs.
// The default budget DB and the SQL migrations are embedded in the bundle and
// served from a read-only virtual directory.
import { Buffer } from 'buffer';
import { Directory, File, Paths } from 'expo-file-system';

import { defaultDbBase64, migrations } from '../generated/embedded-assets';
import { join } from './path-join';

export { join };

const BUNDLED = '/__bundled__';
export const bundledDatabasePath = `${BUNDLED}/default-db.sqlite`;
export const migrationsPath = `${BUNDLED}/migrations`;
export const demoBudgetPath = `${BUNDLED}/demo-budget`;

const uri = (p: string) => (p.startsWith('file://') ? p : 'file://' + encodeURI(p));
/** Converts an expo-file-system URI to the plain path loot-core expects. */
export const pathFromUri = (u: string) => decodeURI(u.replace(/^file:\/\//, '')).replace(/\/+$/, '');
/** Default place to keep budgets on device. */
export const defaultDocumentDir = () => join(pathFromUri(Paths.document.uri), 'accrual-budgets');

let documentDir: string | undefined;
export const _setDocumentDir = (dir: string) => {
  documentDir = dir;
  new Directory(uri(dir)).create({ intermediates: true, idempotent: true });
};
export const getDocumentDir = () => {
  if (!documentDir) throw new Error('Document directory is not set');
  return documentDir;
};
export const getDataDir = getDocumentDir;
export const getBudgetDir = (id: string) => {
  if (!id) throw new Error('getDocumentDir: id is falsy: ' + id);
  if (id.match(/[^A-Za-z0-9\-_]/)) throw new Error(`Invalid budget id "${id}".`);
  return join(getDocumentDir(), id);
};

export const init = async () => {};

export const basename = (filepath: string) => filepath.slice(filepath.lastIndexOf('/') + 1);

const fromBase64 = (b64: string) => Buffer.from(b64, 'base64');

export const listDir = async (filepath: string): Promise<string[]> => {
  if (filepath === migrationsPath) return Object.keys(migrations);
  return new Directory(uri(filepath)).list().map(entry => entry.name);
};

export const exists = async (filepath: string): Promise<boolean> => {
  if (filepath.startsWith(BUNDLED)) {
    return (
      filepath === bundledDatabasePath ||
      filepath === migrationsPath ||
      basename(filepath) in migrations
    );
  }
  return Paths.info(uri(filepath)).exists;
};

export const mkdir = async (filepath: string) => {
  new Directory(uri(filepath)).create();
};

export const size = async (filepath: string) => new File(uri(filepath)).size;

// loot-core hands over Node-style Buffers (a Uint8Array subclass, from the
// `buffer` package). expo-file-system's native side only recognises the built-in
// typed arrays, and on iOS it crashes the app on anything else.
const plainBytes = (bytes: Uint8Array) =>
  bytes.constructor === Uint8Array ? bytes : new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);

function writeBytes(filepath: string, contents: string | Uint8Array) {
  const file = new File(uri(filepath));
  if (!file.exists) file.create();
  // writeSync, not write: write() is asynchronous, and a rename that follows it
  // moves the file before the bytes have landed.
  file.writeSync(typeof contents === 'string' ? contents : plainBytes(contents));
}

export const copyFile = async (frompath: string, topath: string) => {
  if (frompath === bundledDatabasePath) {
    writeBytes(topath, fromBase64(defaultDbBase64));
    return true;
  }
  const dest = new File(uri(topath));
  if (dest.exists) dest.delete();
  new File(uri(frompath)).copySync(dest);
  return true;
};

export const readFile = async (
  filepath: string,
  encoding: 'utf8' | 'binary' | null = 'utf8',
): Promise<any> => {
  if (filepath.startsWith(migrationsPath + '/')) {
    const text = migrations[basename(filepath)];
    if (text === undefined) throw new Error('No bundled migration: ' + filepath);
    return text;
  }
  if (filepath === bundledDatabasePath) return fromBase64(defaultDbBase64);
  const file = new File(uri(filepath));
  return encoding === 'utf8' ? file.textSync() : Buffer.from(file.bytesSync());
};

// Write-then-rename so a killed app never leaves a torn file behind.
let tmpCounter = 0;
export const writeFile = async (filepath: string, contents: string | Uint8Array) => {
  const tmp = `${filepath}.${tmpCounter++}.tmp`;
  writeBytes(tmp, contents);
  const dest = new File(uri(filepath));
  if (dest.exists) dest.delete();
  new File(uri(tmp)).moveSync(dest);
  return undefined;
};

export const removeFile = async (filepath: string) => {
  new File(uri(filepath)).delete();
};
export const removeDir = async (dirpath: string) => {
  new Directory(uri(dirpath)).delete();
};
export const removeDirRecursively = async (dirpath: string) => {
  const dir = new Directory(uri(dirpath));
  if (dir.exists) dir.delete();
};

export const getModifiedTime = async (filepath: string) =>
  new Date(new File(uri(filepath)).modificationTime ?? 0);
