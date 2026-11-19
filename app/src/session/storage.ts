// The saved session lives in the Keychain (iOS) or Keystore (Android) and nowhere else.
// It holds a session token, never the password.
import * as SecureStore from 'expo-secure-store';

import type { RemoteBudget } from '../engine/types';

export type SavedSession = { serverURL: string; sessionToken: string; budget: RemoteBudget | null };

const KEY = 'accrual.session';

export async function loadSession(): Promise<SavedSession | null> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return typeof value?.serverURL === 'string' && typeof value?.sessionToken === 'string'
      ? { serverURL: value.serverURL, sessionToken: value.sessionToken, budget: value.budget ?? null }
      : null;
  } catch {
    return null;
  }
}

export const saveSession = (session: SavedSession) => SecureStore.setItemAsync(KEY, JSON.stringify(session));
export const clearSession = () => SecureStore.deleteItemAsync(KEY);
