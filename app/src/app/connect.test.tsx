import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';

import { EngineError } from '../engine/types';
import { fakeEngine } from '../session/fakeEngine';
import { SessionProvider } from '../session/SessionProvider';
import type { CreateEngine } from '../session/SessionProvider';
import { loadSession } from '../session/storage';
import Connect from './connect';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ router: { replace: (...args: unknown[]) => mockReplace(...args) } }));

const show = (create: CreateEngine = async () => fakeEngine()) =>
  render(<SessionProvider create={create}><Connect /></SessionProvider>);

const fillAndConnect = async (address: string, password = 'pw-for-tests') => {
  await fireEvent.changeText(await screen.findByLabelText('Server address'), address);
  await fireEvent.changeText(screen.getByLabelText('Password'), password);
  await fireEvent.press(screen.getByRole('button', { name: 'Connect' }));
};

beforeEach(() => {
  (SecureStore as any).__reset();
  jest.clearAllMocks();
});

it('lists the budgets after connecting', async () => {
  await show();
  await fillAndConnect('budget.example.com');
  expect(await screen.findByText('Household')).toBeTruthy();
  expect(screen.getByText('Side business')).toBeTruthy();
});

it('explains a wrong password', async () => {
  await show(async () => { throw new EngineError('invalid-password', 'x'); });
  await fillAndConnect('budget.example.com');
  expect(await screen.findByText('That password is not right.')).toBeTruthy();
});

it('refuses an empty password before calling the engine', async () => {
  const create = jest.fn(async () => fakeEngine());
  await show(create);
  await fillAndConnect('budget.example.com', '');
  expect(await screen.findByText('Enter your password.')).toBeTruthy();
  expect(create).not.toHaveBeenCalled();
});

it('refuses plain http until it is allowed', async () => {
  const create = jest.fn(async () => fakeEngine());
  await show(create);
  await fillAndConnect('http://192.168.1.20:5006');
  expect(await screen.findByText(/not encrypted/)).toBeTruthy();
  expect(create).not.toHaveBeenCalled();

  await fireEvent(screen.getByLabelText('Allow plain HTTP'), 'valueChange', true);
  await fireEvent.press(screen.getByRole('button', { name: 'Connect' }));
  await waitFor(() => expect(create).toHaveBeenCalledWith({ serverURL: 'http://192.168.1.20:5006', password: 'pw-for-tests' }));
});

it('opens the chosen budget', async () => {
  await show();
  await fillAndConnect('budget.example.com');
  await fireEvent.press(await screen.findByText('Household'));
  await fireEvent.press(screen.getByRole('button', { name: 'Open Household' }));
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/opening'));
  expect((await loadSession())?.budget?.name).toBe('Household');
});

it('will not open an encrypted budget', async () => {
  await show();
  await fillAndConnect('budget.example.com');
  expect(await screen.findByText('Encrypted budgets are not supported yet')).toBeTruthy();
});
