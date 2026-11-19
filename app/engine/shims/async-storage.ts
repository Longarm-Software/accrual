// loot-core `#platform/server/asyncStorage`: global prefs (server URL, session
// token, ...). loot-core's `init()`, the entry point the app uses, starts this
// store with `persist: false`, so on the app's path nothing here is written to
// disk and the session token it holds lives in memory only. The app keeps the
// session token in the Keychain or Keystore itself (src/session/storage.ts).
//
// The JSON file below is written only after `init()` with `persist` true, which
// only loot-core's `initApp` does, and the app does not use `initApp`. It is read
// only by `load()`, exported from engine/entry.ts as `loadGlobalStore`, which
// nothing in the app calls.
import * as fs from './fs';

type Store = Record<string, any>;
let store: Store = {};
let persisted = false;
let pending: Promise<unknown> = Promise.resolve();

const storePath = () => fs.join(fs.getDataDir(), 'global-store.json');

export async function load() {
  if (await fs.exists(storePath())) store = JSON.parse(await fs.readFile(storePath()));
}

export function init({ persist = true }: { persist?: boolean } = {}) {
  persisted = persist;
  if (!persist) store = {};
}

function save() {
  if (!persisted) return Promise.resolve();
  const snapshot = JSON.stringify(store);
  pending = pending.then(() => fs.writeFile(storePath(), snapshot));
  return pending;
}

export const getItem = async (key: string) => store[key];
export const setItem = async (key: string, value: unknown) => {
  store[key] = value;
  await save();
};
export const removeItem = async (key: string) => {
  delete store[key];
  await save();
};
export const multiGet = async (keys: string[]) =>
  Object.fromEntries(keys.map(key => [key, store[key]]));
export const multiSet = async (keyValues: [string, unknown][]) => {
  for (const [key, value] of keyValues) store[key] = value;
  await save();
};
export const multiRemove = async (keys: string[]) => {
  for (const key of keys) delete store[key];
  await save();
};
