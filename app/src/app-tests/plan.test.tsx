import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { useEffect } from 'react';
import { Dimensions } from 'react-native';

import { EngineError } from '../engine/types';
import type { Engine, PlanMonth } from '../engine/types';
import { fakeBudgets, fakeEngine, fakePlanMonth } from '../session/fakeEngine';
import { SessionProvider, useSession } from '../session/SessionProvider';
import { loadSession, saveSession } from '../session/storage';
import Home from '../app/index';

const mockRedirect = jest.fn();
jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    mockRedirect(href);
    return null;
  },
  router: { replace: jest.fn() },
}));

// The account menu's card waits until its button has been measured; Jest's stand-in View
// never answers, so answer for it: a 40-point button in the top-right corner.
const nativeMethods = jest.requireActual('@react-native/jest-preset/jest/MockNativeMethods').default;

// The preset's stand-in screen has a font scale of 2; most tests want ordinary text.
const window = Dimensions.get('window');
const textSize = (fontScale: number) =>
  Dimensions.set({ window: { ...window, fontScale }, screen: { ...window, fontScale } });

beforeEach(() => {
  (SecureStore as any).__reset();
  jest.clearAllMocks();
  // "Today" is 19 November 2026, noon, so the pace notes are fixed. Only Date is faked:
  // timers stay real, so the testing library's waits and the engine's promises run as usual.
  jest.useFakeTimers({
    now: new Date(2026, 10, 19, 12),
    doNotFake: [
      'hrtime', 'nextTick', 'performance', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame',
      'requestIdleCallback', 'cancelIdleCallback', 'setImmediate', 'clearImmediate', 'setInterval',
      'clearInterval', 'setTimeout', 'clearTimeout',
    ],
  });
  nativeMethods.measureInWindow.mockImplementation((done: (x: number, y: number, w: number, h: number) => void) =>
    done(335, 60, 40, 40),
  );
  textSize(1);
});

afterEach(() => {
  jest.useRealTimers();
  nativeMethods.measureInWindow.mockReset();
  Dimensions.set({ window, screen: window });
});

const saveOpenable = () =>
  saveSession({ serverURL: 'https://budget.example.com', sessionToken: 'token-for-tests', budget: fakeBudgets[0] });

// Stands in for the Opening screen: opens the budget, then Home takes over.
function OpenThenHome() {
  const session = useSession();
  useEffect(() => {
    if (session.status === 'closed') void session.open();
  }, [session]);
  return <Home />;
}

/** Shows Home for an open budget, on the given engine. */
async function showPlan(engine: Engine) {
  await saveOpenable();
  await render(<SessionProvider create={async () => engine}><OpenThenHome /></SessionProvider>);
}

const pullToRefresh = async () => {
  const refreshControl = screen.getByTestId('plan-scroll').props.refreshControl;
  await act(async () => {
    await refreshControl.props.onRefresh();
  });
};

const December: PlanMonth = { ...fakePlanMonth, month: '2026-12', toBudget: 5000 };

// --- Routing, kept from the placeholder Home ---

it('sends a signed-out person to Connect', async () => {
  await render(<SessionProvider create={async () => fakeEngine()}><Home /></SessionProvider>);
  await waitFor(() => expect(mockRedirect).toHaveBeenCalledWith('/connect'));
});

it('sends a saved session to Opening', async () => {
  await saveOpenable();
  await render(<SessionProvider create={async () => fakeEngine()}><Home /></SessionProvider>);
  await waitFor(() => expect(mockRedirect).toHaveBeenCalledWith('/opening'));
});

it('shows Ready to budget once the budget is open', async () => {
  await showPlan(fakeEngine());
  expect(await screen.findAllByText('$312')).toBeTruthy();
  expect(screen.getByText('Ready to budget')).toBeTruthy();
  // The budget's name now lives in the account menu.
  await fireEvent.press(screen.getByRole('button', { name: 'Account' }));
  expect(screen.getByText('Household')).toBeTruthy();
});

// --- The Plan screen ---

it('shows the top card, the notice, the groups and the tiles', async () => {
  await showPlan(fakeEngine());
  expect(await screen.findByText('Ready to budget')).toBeTruthy();
  expect(screen.getAllByText('$312').length).toBeGreaterThan(0);
  expect(screen.getByText('Dining out is $28.10 over')).toBeTruthy();
  for (const name of ['Bills', 'Everyday', 'Goals']) expect(screen.getByText(name)).toBeTruthy();
  expect(screen.getByText('Groceries')).toBeTruthy();
  expect(screen.getByText('$207')).toBeTruthy();
  expect(screen.getByText('$17 a day for 12 days')).toBeTruthy();
  expect(screen.getByText('November')).toBeTruthy();
});

it('shows the month switcher and a spinner while the month first loads', async () => {
  await showPlan(fakeEngine({ getPlanMonth: () => new Promise<PlanMonth>(() => {}) }));
  expect(await screen.findByLabelText('Working')).toBeTruthy();
  expect(screen.getByText('November')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Account' })).toBeTruthy();
});

it('lays the tiles out two to a row, with every row as tall as its tallest tile', async () => {
  await showPlan(fakeEngine());
  await screen.findByText('Groceries');
  // Bills has 3 categories (2 rows), Everyday 2 (1 row), Goals 1 (1 row).
  const rows = screen.getAllByTestId('tile-row');
  expect(rows).toHaveLength(4);
  for (const row of rows) expect(row.props.style).toMatchObject({ flexDirection: 'row', alignItems: 'stretch' });
});

it('uses one column when the text is large', async () => {
  textSize(1.3);
  await showPlan(fakeEngine());
  await screen.findByText('Groceries');
  expect(screen.getAllByTestId('tile-row')).toHaveLength(6);
});

it('moves to the next month and reads it', async () => {
  const getPlanMonth = jest.fn(async (month: string) => (month === '2026-12' ? December : fakePlanMonth));
  await showPlan(fakeEngine({ getPlanMonth }));
  await screen.findByText('Groceries');
  await fireEvent.press(screen.getByRole('button', { name: 'Next month' }));
  expect(await screen.findByText('December')).toBeTruthy();
  expect(getPlanMonth).toHaveBeenLastCalledWith('2026-12');
  expect(await screen.findAllByText('$50')).toBeTruthy();
});

it('does not show the old month under the new month’s name', async () => {
  const getPlanMonth = jest.fn((month: string) =>
    month === '2026-12' ? new Promise<PlanMonth>(() => {}) : Promise.resolve(fakePlanMonth),
  );
  await showPlan(fakeEngine({ getPlanMonth }));
  await screen.findByText('Groceries');
  await fireEvent.press(screen.getByRole('button', { name: 'Next month' }));
  expect(screen.getByText('December')).toBeTruthy();
  expect(screen.queryByText('Groceries')).toBeNull();
  expect(screen.getByLabelText('Working')).toBeTruthy();
});

it('disables Next month at the last month in the budget', async () => {
  await showPlan(fakeEngine({ getMonthBounds: async () => ({ start: '2026-01', end: '2026-11' }) }));
  await screen.findByText('Groceries');
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Next month' }).props.accessibilityState).toMatchObject({ disabled: true }),
  );
  expect(screen.getByRole('button', { name: 'Previous month' }).props.accessibilityState).toMatchObject({ disabled: false });
});

it('syncs, then reads the month again, on a pull to refresh', async () => {
  const order: string[] = [];
  const sync = jest.fn(async () => void order.push('sync'));
  const getPlanMonth = jest.fn(async () => {
    order.push('read');
    return fakePlanMonth;
  });
  await showPlan(fakeEngine({ sync, getPlanMonth }));
  await screen.findByText('Groceries');
  await pullToRefresh();
  expect(sync).toHaveBeenCalledTimes(1);
  expect(order).toEqual(['read', 'sync', 'read']);
});

it('shows the pull-to-refresh spinner while the refresh runs', async () => {
  let finish!: () => void;
  const sync = jest.fn(() => new Promise<void>(resolve => (finish = resolve)));
  await showPlan(fakeEngine({ sync }));
  await screen.findByText('Groceries');
  const refreshControl = () => screen.getByTestId('plan-scroll').props.refreshControl;
  expect(refreshControl().props.refreshing).toBe(false);
  let done!: Promise<void>;
  await act(async () => {
    done = refreshControl().props.onRefresh();
  });
  expect(refreshControl().props.refreshing).toBe(true);
  await act(async () => {
    finish();
    await done;
  });
  expect(refreshControl().props.refreshing).toBe(false);
});

it('says Offline and keeps the numbers when the sync cannot reach the server', async () => {
  const sync = jest.fn(async () => {
    throw new EngineError('network-failure', 'x');
  });
  await showPlan(fakeEngine({ sync }));
  await screen.findByText('Groceries');
  expect(screen.queryByText('Offline')).toBeNull();
  await pullToRefresh();
  expect(screen.getByText('Offline')).toBeTruthy();
  expect(screen.getByText('Groceries')).toBeTruthy();
  expect(screen.getByText('$207')).toBeTruthy();
});

it('says Offline from the start when the engine opened offline, and clears it after a sync', async () => {
  await showPlan(fakeEngine({ offline: true }));
  await screen.findByText('Groceries');
  expect(screen.getByText('Offline')).toBeTruthy();
  await pullToRefresh();
  expect(screen.queryByText('Offline')).toBeNull();
});

it('does not call another sync failure Offline, and says the numbers may be out of date', async () => {
  const sync = jest.fn(async () => {
    throw new EngineError('internal', 'x');
  });
  await showPlan(fakeEngine({ sync }));
  await screen.findByText('Groceries');
  await pullToRefresh();
  expect(screen.queryByText('Offline')).toBeNull();
  expect(screen.getByText('Not synced')).toBeTruthy();
  expect(screen.getByText('Groceries')).toBeTruthy();
});

it('says a tracking budget is not supported yet, and nothing else but the account button', async () => {
  await showPlan(
    fakeEngine({
      getPlanMonth: async () => {
        throw new EngineError('tracking-budget', 'x');
      },
    }),
  );
  expect(await screen.findByText('This budget uses tracking, which Accrual does not support yet.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Account' })).toBeTruthy();
  expect(screen.queryByText('November')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
});

it('offers Try again when the month cannot be read, and reads it again', async () => {
  const getPlanMonth = jest
    .fn<Promise<PlanMonth>, [string]>()
    .mockRejectedValueOnce(new EngineError('internal', 'x'))
    .mockResolvedValue(fakePlanMonth);
  await showPlan(fakeEngine({ getPlanMonth }));
  expect(await screen.findByText('Could not read this month.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('Groceries')).toBeTruthy();
  expect(getPlanMonth).toHaveBeenCalledTimes(2);
  expect(getPlanMonth).toHaveBeenLastCalledWith('2026-11');
});

it('says so when the budget has no categories', async () => {
  await showPlan(fakeEngine({ getPlanMonth: async () => ({ ...fakePlanMonth, groups: [] }) }));
  expect(await screen.findByText('This budget has no categories yet. Add them in Actual.')).toBeTruthy();
});

it('signs out from the account menu', async () => {
  let status = '';
  function Watch() {
    status = useSession().status;
    return null;
  }
  await saveOpenable();
  await render(
    <SessionProvider create={async () => fakeEngine()}>
      <OpenThenHome />
      <Watch />
    </SessionProvider>,
  );
  await screen.findByText('Groceries');
  await fireEvent.press(screen.getByRole('button', { name: 'Account' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
  await waitFor(() => expect(status).toBe('signedOut'));
  await waitFor(() => expect(mockRedirect).toHaveBeenCalledWith('/connect'));
});

it('ignores a month that arrives after the person has moved on', async () => {
  let releaseNovember!: (month: PlanMonth) => void;
  const getPlanMonth = jest.fn((month: string) =>
    month === '2026-11' ? new Promise<PlanMonth>(resolve => (releaseNovember = resolve)) : Promise.resolve(December),
  );
  await showPlan(fakeEngine({ getPlanMonth }));
  await waitFor(() => expect(getPlanMonth).toHaveBeenCalledWith('2026-11'));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Next month' }).props.accessibilityState).toMatchObject({ disabled: false }),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Next month' }));
  expect(await screen.findAllByText('$50')).toBeTruthy();
  await act(async () => releaseNovember(fakePlanMonth));
  expect(screen.getByText('December')).toBeTruthy();
  expect(screen.getAllByText('$50').length).toBeGreaterThan(0);
  expect(screen.queryByText('$312')).toBeNull();
});

// --- Fix round 1: refresh and month changes, refresh failures, bounds, an expired token ---

const nextEnabled = () =>
  screen.getByRole('button', { name: 'Next month' }).props.accessibilityState.disabled === false;

it('shows the new month when the person changes month during a refresh', async () => {
  let finishSync!: () => void;
  const sync = jest.fn(() => new Promise<void>(resolve => (finishSync = resolve)));
  const getPlanMonth = jest.fn(async (month: string) => (month === '2026-12' ? December : fakePlanMonth));
  await showPlan(fakeEngine({ sync, getPlanMonth }));
  await screen.findByText('Groceries');
  await waitFor(() => expect(nextEnabled()).toBe(true));
  let done!: Promise<void>;
  await act(async () => {
    done = screen.getByTestId('plan-scroll').props.refreshControl.props.onRefresh();
  });
  await fireEvent.press(screen.getByRole('button', { name: 'Next month' }));
  await act(async () => {
    finishSync();
    await done;
  });
  expect(screen.getByText('December')).toBeTruthy();
  expect(screen.getAllByText('$50').length).toBeGreaterThan(0);
  expect(screen.queryByText('$312')).toBeNull();
  expect(screen.queryByLabelText('Working')).toBeNull();
});

it('never shows a refresh’s late read of the old month under the new month', async () => {
  let releaseRefreshRead!: (month: PlanMonth) => void;
  let novemberReads = 0;
  const getPlanMonth = jest.fn((month: string) => {
    if (month === '2026-12') return Promise.resolve(December);
    novemberReads++;
    return novemberReads === 1
      ? Promise.resolve(fakePlanMonth)
      : new Promise<PlanMonth>(resolve => (releaseRefreshRead = resolve));
  });
  await showPlan(fakeEngine({ getPlanMonth }));
  await screen.findByText('Groceries');
  await waitFor(() => expect(nextEnabled()).toBe(true));
  let done!: Promise<void>;
  await act(async () => {
    done = screen.getByTestId('plan-scroll').props.refreshControl.props.onRefresh();
  });
  await waitFor(() => expect(novemberReads).toBe(2));
  await fireEvent.press(screen.getByRole('button', { name: 'Next month' }));
  expect(await screen.findAllByText('$50')).toBeTruthy();
  await act(async () => {
    releaseRefreshRead(fakePlanMonth);
    await done;
  });
  expect(screen.getByText('December')).toBeTruthy();
  expect(screen.getAllByText('$50').length).toBeGreaterThan(0);
  expect(screen.queryByText('$312')).toBeNull();
});

it('keeps the numbers when the read after a refresh fails', async () => {
  const getPlanMonth = jest
    .fn<Promise<PlanMonth>, [string]>()
    .mockResolvedValueOnce(fakePlanMonth)
    .mockRejectedValue(new EngineError('internal', 'x'));
  await showPlan(fakeEngine({ getPlanMonth }));
  await screen.findByText('Groceries');
  await pullToRefresh();
  expect(getPlanMonth).toHaveBeenCalledTimes(2);
  expect(screen.getByText('Groceries')).toBeTruthy();
  expect(screen.queryByText('Could not read this month.')).toBeNull();
});

it('reads the month bounds again after a refresh, and keeps them if that read fails', async () => {
  const getMonthBounds = jest
    .fn<Promise<{ start: string; end: string }>, []>()
    .mockResolvedValueOnce({ start: '2026-01', end: '2026-11' })
    .mockResolvedValueOnce({ start: '2026-01', end: '2026-12' })
    .mockRejectedValue(new EngineError('internal', 'x'));
  await showPlan(fakeEngine({ getMonthBounds }));
  await screen.findByText('Groceries');
  await waitFor(() => expect(getMonthBounds).toHaveBeenCalledTimes(1));
  expect(nextEnabled()).toBe(false);
  await pullToRefresh();
  await waitFor(() => expect(nextEnabled()).toBe(true));
  await pullToRefresh();
  expect(getMonthBounds).toHaveBeenCalledTimes(3);
  expect(nextEnabled()).toBe(true);
});

it('signs out when the sync says the session has expired', async () => {
  let status = '';
  function Watch() {
    status = useSession().status;
    return null;
  }
  const sync = jest.fn(async () => {
    throw new EngineError('token-expired', 'x');
  });
  await saveOpenable();
  await render(
    <SessionProvider create={async () => fakeEngine({ sync })}>
      <OpenThenHome />
      <Watch />
    </SessionProvider>,
  );
  await screen.findByText('Groceries');
  await pullToRefresh();
  await waitFor(() => expect(status).toBe('signedOut'));
  await waitFor(() => expect(mockRedirect).toHaveBeenCalledWith('/connect'));
  expect(await loadSession()).toBeNull();
});
