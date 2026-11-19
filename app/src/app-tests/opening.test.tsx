import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';

import { EngineError } from '../engine/types';
import type { Engine, OpenStage } from '../engine/types';
import { fakeBudgets, fakeEngine } from '../session/fakeEngine';
import { SessionProvider } from '../session/SessionProvider';
import type { CreateEngine } from '../session/SessionProvider';
import { saveSession } from '../session/storage';
import Opening from '../app/opening';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ router: { replace: (...args: unknown[]) => mockReplace(...args) } }));

const show = async (create: CreateEngine) => {
  await saveSession({ serverURL: 'https://budget.example.com', sessionToken: 'token-for-tests', budget: fakeBudgets[0] });
  await render(<SessionProvider create={create}><Opening /></SessionProvider>);
};

beforeEach(() => {
  (SecureStore as any).__reset();
  mockReplace.mockClear();
});

it('goes home once the budget is open', async () => {
  await show(async () => fakeEngine());
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
});

it('shows the step in progress', async () => {
  let release!: () => void;
  const held = new Promise<void>(resolve => (release = resolve));
  await show(async () =>
    fakeEngine({
      openBudget: async (_b, onStage = () => {}) => {
        await onStage('downloading' as OpenStage);
        await held;
      },
    }),
  );
  expect(await screen.findByText('Downloading Household')).toBeTruthy();
  expect(screen.getByText('This happens once on this phone. A large budget can take a few seconds.')).toBeTruthy();
  release();
  // Let the open finish inside this test, so its state updates do not land in the next one.
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
});

it('returns to Connect when the token has expired', async () => {
  await show(async () => { throw new EngineError('token-expired', 'x'); });
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/connect'));
});

it('offers a retry when the server cannot be reached', async () => {
  await show(async () => { throw new EngineError('network-failure', 'x'); });
  expect(await screen.findByText('Could not reach that server. Check the address and your connection.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  expect(mockReplace).not.toHaveBeenCalled();
});

it('try again signs in afresh once the server is back', async () => {
  const create = jest
    .fn<Promise<Engine>, Parameters<CreateEngine>>()
    .mockResolvedValueOnce(
      fakeEngine({ offline: true, openBudget: async () => { throw new EngineError('network-failure', 'x'); } }),
    )
    .mockResolvedValueOnce(fakeEngine());
  await show(create);
  await screen.findByText('Could not reach that server. Check the address and your connection.');
  await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
  expect(create).toHaveBeenCalledTimes(2);
});

it('opens the copy on the phone when the server cannot be reached', async () => {
  const stages: OpenStage[] = [];
  await show(async () =>
    fakeEngine({
      offline: true,
      openBudget: async (_b, onStage = () => {}) => {
        stages.push('opening');
        await onStage('opening');
      },
    }),
  );
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
  expect(stages).toEqual(['opening']);
  expect(screen.queryByText('Could not reach that server. Check the address and your connection.')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
});

it('offers a retry when offline and the budget is not on the phone', async () => {
  await show(async () =>
    fakeEngine({
      offline: true,
      openBudget: async () => { throw new EngineError('network-failure', 'x'); },
    }),
  );
  expect(await screen.findByText('Could not reach that server. Check the address and your connection.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  expect(mockReplace).not.toHaveBeenCalled();
});
