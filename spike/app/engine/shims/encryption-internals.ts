// loot-core `#server/encryption/encryption-internals`. End-to-end encrypted
// budgets need AES-256-GCM + PBKDF2, which Hermes does not provide
// (no crypto.subtle). Out of scope for the spike (plan.md: Phase 2); the
// production shim would use react-native-quick-crypto.
import { Buffer } from 'buffer';
import { getRandomBytes } from 'expo-crypto';

const unsupported = () => {
  throw new Error('End-to-end encrypted budgets are not supported in the spike build');
};

export const randomBytes = (n: number) => Buffer.from(getRandomBytes(n));
export const encrypt = async (..._args: unknown[]): Promise<any> => unsupported();
export const decrypt = async (..._args: unknown[]): Promise<any> => unsupported();
export const createKey = async (..._args: unknown[]): Promise<any> => unsupported();
export const importKey = async (..._args: unknown[]): Promise<any> => unsupported();
