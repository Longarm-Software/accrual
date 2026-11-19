import * as SecureStore from 'expo-secure-store';

import { clearSession, loadSession, saveSession } from './storage';

const session = {
  serverURL: 'https://budget.example.com',
  sessionToken: 'token-for-tests',
  budget: { name: 'Household', groupId: 'g1', cloudFileId: 'c1', encrypted: false },
};

beforeEach(() => (SecureStore as any).__reset());

it('returns null when nothing is saved', async () => {
  expect(await loadSession()).toBeNull();
});
it('saves and loads a session', async () => {
  await saveSession(session);
  expect(await loadSession()).toEqual(session);
});
it('clears it', async () => {
  await saveSession(session);
  await clearSession();
  expect(await loadSession()).toBeNull();
});
it('treats damaged data as signed out', async () => {
  await SecureStore.setItemAsync('accrual.session', '{not json');
  expect(await loadSession()).toBeNull();
});
