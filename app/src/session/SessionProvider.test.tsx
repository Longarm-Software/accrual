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

beforeEach(() => (SecureStore as any).__reset());

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
