// loot-core's server/update.ts imports createHash from 'node:crypto' to
// fingerprint the generated SQL views. Only md5/hex is used.
import { md5 } from 'js-md5';

export function createHash(algorithm: string) {
  if (algorithm !== 'md5') throw new Error('Unsupported hash: ' + algorithm);
  let data = '';
  return {
    update(chunk: string) {
      data += chunk;
      return this;
    },
    digest(encoding: string) {
      if (encoding !== 'hex') throw new Error('Unsupported digest encoding: ' + encoding);
      return md5(data);
    },
  };
}
