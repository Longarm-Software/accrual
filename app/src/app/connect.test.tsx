import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
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
  await fillAndConnect('http://192.168.1.20:5007');
  expect(await screen.findByText(/not encrypted/)).toBeTruthy();
  expect(create).not.toHaveBeenCalled();

  await fireEvent(screen.getByLabelText('Allow plain HTTP'), 'valueChange', true);
  await fireEvent.press(screen.getByRole('button', { name: 'Connect' }));
  await waitFor(() => expect(create).toHaveBeenCalledWith({ serverURL: 'http://192.168.1.20:5007', password: 'pw-for-tests' }));
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

it('opens only once when Open is pressed twice quickly', async () => {
  await show();
  await fillAndConnect('budget.example.com');
  await screen.findByText('Household');
  // Slow the Keychain write made by choosing, so the first open is still in flight at the second press.
  let slowWrite: Promise<void> | undefined;
  (SecureStore.setItemAsync as jest.Mock).mockImplementationOnce(() => (slowWrite = new Promise<void>(resolve => setTimeout(resolve, 50))));
  const openButton = screen.getByRole('button', { name: 'Open Household' });
  // Two taps in one synchronous burst: React cannot re-render the button as disabled between them,
  // so only the screen's own guard can stop the second. (Concurrent fireEvent calls overlap act().)
  await act(async () => {
    openButton.props.onClick({ nativeEvent: {} });
    openButton.props.onClick({ nativeEvent: {} });
  });
  // Let every open that started run to the end before counting.
  await act(async () => { await slowWrite; });
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/opening'));
  expect(mockReplace).toHaveBeenCalledTimes(1);
});

it('shows an error and stays put when choosing the budget fails', async () => {
  await show();
  await fillAndConnect('budget.example.com');
  await screen.findByText('Household');
  // Only the write made by choosing fails; connecting has already saved.
  (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(new Error('keychain unavailable'));
  await fireEvent.press(screen.getByRole('button', { name: 'Open Household' }));
  expect(await screen.findByText('Something went wrong. Try again.')).toBeTruthy();
  expect(mockReplace).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Open Household' })).toBeEnabled();
});
