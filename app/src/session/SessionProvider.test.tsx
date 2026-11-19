import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import type { ReactNode } from 'react';

import { EngineError } from '../engine/types';
import { fakeBudgets, fakeEngine } from './fakeEngine';
import { SessionProvider, useSession } from './SessionProvider';
import { loadSession, saveSession } from './storage';

const wrap = (create = jest.fn(async () => fakeEngine())) => ({
  create,
  wrapper: ({ children }: { children: ReactNode }) => <SessionProvider create={create}>{children}</SessionProvider>,
});

beforeEach(() => {
  (SecureStore as any).__reset();
  jest.clearAllMocks();
});

it('starts signed out when nothing is saved', async () => {
  const { result } = await renderHook(useSession, { wrapper: wrap().wrapper });
  await waitFor(() => expect(result.current.status).toBe('signedOut'));
});

it('connect signs in with the password and stores only the token', async () => {
  const { create, wrapper } = wrap();
  const { result } = await renderHook(useSession, { wrapper });
  await waitFor(() => expect(result.current.status).toBe('signedOut'));

  let budgets;
  await act(async () => { budgets = await result.current.connect('https://budget.example.com', 'hunter2-for-tests'); });

  expect(budgets).toEqual(fakeBudgets);
  expect(create).toHaveBeenCalledWith({ serverURL: 'https://budget.example.com', password: 'hunter2-for-tests' });
  expect(result.current.status).toBe('needsBudget');
  const saved = JSON.stringify(await loadSession());
  expect(saved).toContain('token-for-tests');
  expect(saved).not.toContain('hunter2-for-tests');
  // What was actually written to the Keychain, not what loadSession chooses to copy out.
  const written = JSON.stringify((SecureStore.setItemAsync as jest.Mock).mock.calls);
  expect(written).toContain('token-for-tests');
  expect(written).not.toContain('hunter2-for-tests');
});

it('choosing a budget then opening it reaches open', async () => {
  const { result } = await renderHook(useSession, { wrapper: wrap().wrapper });
  await waitFor(() => expect(result.current.status).toBe('signedOut'));
  await act(async () => { await result.current.connect('https://budget.example.com', 'pw-for-tests'); });
  await act(async () => { await result.current.chooseBudget(fakeBudgets[0]); });
  expect(result.current.status).toBe('closed');

  const stages: string[] = [];
  await act(async () => { await result.current.open(s => void stages.push(s)); });
  expect(stages).toEqual(['downloading', 'syncing']);
  expect(result.current.status).toBe('open');
});

it('a saved session starts closed and opens with the token', async () => {
  await saveSession({ serverURL: 'https://budget.example.com', sessionToken: 'token-for-tests', budget: fakeBudgets[0] });
  const { create, wrapper } = wrap();
  const { result } = await renderHook(useSession, { wrapper });
  await waitFor(() => expect(result.current.status).toBe('closed'));
  await act(async () => { await result.current.open(); });
  expect(create).toHaveBeenCalledWith({ serverURL: 'https://budget.example.com', sessionToken: 'token-for-tests' });
  expect(result.current.status).toBe('open');
});

it('an expired token signs out and rethrows', async () => {
  await saveSession({ serverURL: 'https://budget.example.com', sessionToken: 'old-token', budget: fakeBudgets[0] });
  const create = jest.fn(async () => { throw new EngineError('token-expired', 'expired'); });
  const { result } = await renderHook(useSession, { wrapper: wrap(create).wrapper });
  await waitFor(() => expect(result.current.status).toBe('closed'));
  await act(async () => { await expect(result.current.open()).rejects.toMatchObject({ code: 'token-expired' }); });
  expect(result.current.status).toBe('signedOut');
  expect(await loadSession()).toBeNull();
});

it('signOut clears everything', async () => {
  const { result } = await renderHook(useSession, { wrapper: wrap().wrapper });
  await waitFor(() => expect(result.current.status).toBe('signedOut'));
  await act(async () => { await result.current.connect('https://budget.example.com', 'pw-for-tests'); });
  await act(async () => { await result.current.signOut(); });
  expect(result.current.status).toBe('signedOut');
  expect(await loadSession()).toBeNull();
});

it('connect, chooseBudget and open chained in one handler open the chosen budget', async () => {
  const openBudget = jest.fn(async () => {});
  const { result } = await renderHook(useSession, { wrapper: wrap(jest.fn(async () => fakeEngine({ openBudget }))).wrapper });
  await waitFor(() => expect(result.current.status).toBe('signedOut'));
  await act(async () => {
    await result.current.connect('https://budget.example.com', 'pw-for-tests');
    await result.current.chooseBudget(fakeBudgets[0]);
    await result.current.open();
  });
  expect(result.current.status).toBe('open');
  expect(openBudget).toHaveBeenCalledWith(fakeBudgets[0], undefined);
});

it('switching budget and opening in one handler opens the new budget', async () => {
  const other = { name: 'Holiday fund', groupId: 'g-holiday', cloudFileId: 'c-holiday', encrypted: false };
  await saveSession({ serverURL: 'https://budget.example.com', sessionToken: 'token-for-tests', budget: fakeBudgets[0] });
  const openBudget = jest.fn(async () => {});
  const { result } = await renderHook(useSession, { wrapper: wrap(jest.fn(async () => fakeEngine({ openBudget }))).wrapper });
  await waitFor(() => expect(result.current.status).toBe('closed'));
  await act(async () => { await result.current.open(); });
  expect(result.current.status).toBe('open');
  await act(async () => {
    await result.current.chooseBudget(other);
    await result.current.open();
  });
  expect(openBudget).toHaveBeenLastCalledWith(other, undefined);
  expect(result.current.status).toBe('open');
});

it('a failed Keychain read is treated as signed out', async () => {
  (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(new Error('keychain unavailable'));
  const { result } = await renderHook(useSession, { wrapper: wrap().wrapper });
  await waitFor(() => expect(result.current.status).toBe('signedOut'));
});

it('keeps an online engine whose open failed, and reuses it for the retry', async () => {
  await saveSession({ serverURL: 'https://budget.example.com', sessionToken: 'token-for-tests', budget: fakeBudgets[0] });
  const openBudget = jest
    .fn<Promise<void>, []>()
    .mockRejectedValueOnce(new EngineError('internal', 'x'))
    .mockResolvedValue(undefined);
  const engine = fakeEngine({ openBudget });
  const create = jest.fn(async () => engine);
  const { result } = await renderHook(useSession, { wrapper: wrap(create).wrapper });
  await waitFor(() => expect(result.current.status).toBe('closed'));
  await act(async () => { await expect(result.current.open()).rejects.toMatchObject({ code: 'internal' }); });
  await act(async () => { await result.current.open(); });
  // Signed in online, it can reach the server, so there is no reason to sign in again.
  expect(create).toHaveBeenCalledTimes(1);
  expect(openBudget).toHaveBeenCalledTimes(2);
  expect(result.current.status).toBe('open');
  expect(result.current.engine).toBe(engine);
});
