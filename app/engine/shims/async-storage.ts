// loot-core `#platform/server/asyncStorage`: global prefs (server URL, session
// token, ...). Spike version: a JSON file in the data dir. The real app must
// keep the session token in Keychain/Keystore instead (see architecture.md).
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
