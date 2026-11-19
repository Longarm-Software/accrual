import { Stack, router } from 'expo-router';
import { act, renderRouter, screen } from 'expo-router/testing-library';

import { fakeEngine } from '../session/fakeEngine';
import { SessionProvider } from '../session/SessionProvider';
import DevCheck from '../app/dev-check';
import Home from '../app/index';

// The scripted check, switched on as `EXPO_PUBLIC_SPIKE_AUTORUN=1` in app/.env.local does. The
// value is read when src/dev/autorun.ts loads, so it is set as the real module is loaded. One
// test file is one launch: the module, and whatever it remembers, lives as long as the file.
jest.mock('../dev/autorun', () => {
  process.env.EXPO_PUBLIC_SPIKE_AUTORUN = '1';
  process.env.EXPO_PUBLIC_SPIKE_PASSWORD = 'not-a-real-password';
  return jest.requireActual('../dev/autorun');
});
// The run's engine never finishes signing in, so a second start would overlap the first, as
// the two interleaved runs recorded on one launch did. Each start creates one engine.
const mockCreateEngine = jest.fn(() => new Promise<never>(() => {}));
jest.mock('../engine/adapter', () => ({ createEngine: () => mockCreateEngine() }));
jest.mock('expo-file-system', () => ({
  Paths: { document: 'documents' },
  File: class {
    exists = false;
  },
}));

afterAll(() => {
  delete process.env.EXPO_PUBLIC_SPIKE_AUTORUN;
  delete process.env.EXPO_PUBLIC_SPIKE_PASSWORD;
});

function Layout() {
  // The real layout's provider: Home renders again once it has read the saved session.
  return (
    <SessionProvider create={async () => fakeEngine()}>
      <Stack screenOptions={{ headerShown: false }} />
    </SessionProvider>
  );
}

const settle = async () => {
  for (let i = 0; i < 5; i++) await act(async () => {});
};

// Each arrival at /dev-check mounts a new screen. Home's <Redirect> issues its replace again
// whenever Home renders while it is still the focused route, and a launch URL can bring the
// app back to "/", which redirects again. A screen that started the run on mount started
// another each time, and the first never stopped.
it('starts the scripted check once per launch, however many times its screen is mounted', async () => {
  await renderRouter({ _layout: Layout, index: Home, 'dev-check': DevCheck, connect: () => null });
  await settle();
  expect(screen).toHavePathname('/dev-check');
  expect(mockCreateEngine).toHaveBeenCalledTimes(1);

  await act(async () => router.replace('/dev-check'));
  await settle();
  await act(async () => router.replace('/'));
  await settle();
  expect(screen).toHavePathname('/dev-check');
  expect(mockCreateEngine).toHaveBeenCalledTimes(1);
  // The screen mounted last shows the one run's log so far.
  expect(screen.getAllByText(/^autorun: full run against/)).toHaveLength(1);
  expect(screen.getAllByText(/load engine bundle/)).toHaveLength(1);
});
