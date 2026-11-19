import { render, screen, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { useEffect } from 'react';

import { fakeBudgets, fakeEngine } from '../session/fakeEngine';
import { SessionProvider, useSession } from '../session/SessionProvider';
import { saveSession } from '../session/storage';
import Home from '../app/index';

const mockRedirect = jest.fn();
jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    mockRedirect(href);
    return null;
  },
  router: { replace: jest.fn() },
}));

beforeEach(() => {
  (SecureStore as any).__reset();
  mockRedirect.mockClear();
});

it('sends a signed-out person to Connect', async () => {
  await render(<SessionProvider create={async () => fakeEngine()}><Home /></SessionProvider>);
  await waitFor(() => expect(mockRedirect).toHaveBeenCalledWith('/connect'));
});

it('sends a saved session to Opening', async () => {
  await saveSession({ serverURL: 'https://budget.example.com', sessionToken: 'token-for-tests', budget: fakeBudgets[0] });
  await render(<SessionProvider create={async () => fakeEngine()}><Home /></SessionProvider>);
  await waitFor(() => expect(mockRedirect).toHaveBeenCalledWith('/opening'));
});

it('shows Ready to budget once the budget is open', async () => {
  await saveSession({ serverURL: 'https://budget.example.com', sessionToken: 'token-for-tests', budget: fakeBudgets[0] });
  // Stands in for the Opening screen: opens the budget, then Home takes over.
  function OpenThenHome() {
    const session = useSession();
    useEffect(() => {
      if (session.status === 'closed') void session.open();
    }, [session]);
    return <Home />;
  }
  await render(<SessionProvider create={async () => fakeEngine()}><OpenThenHome /></SessionProvider>);
  expect(await screen.findByText('Household')).toBeTruthy();
  expect(await screen.findByText('$312')).toBeTruthy();
  expect(screen.getByText('Ready to budget')).toBeTruthy();
});
