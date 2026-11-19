// A digest of any JSON value that is the same on the device and on the host,
// whatever order object keys come back in. Used to compare budget months
// between the app and the reference client without copying them off the device.
import { md5 } from 'js-md5';

export function stableStringify(value: unknown): string {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  const object = value as Record<string, unknown>;
  const keys = Object.keys(object).filter(k => object[k] !== undefined).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(object[k])).join(',') + '}';
}

export const digest = (value: unknown) => md5(stableStringify(value));
