import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, Dimensions } from 'react-native';
import type { AppStateStatus } from 'react-native';

import { EngineError } from '../engine/types';
import type { Engine, PlanMonth } from '../engine/types';
import { fakeBudgets, fakeEngine, fakePlanMonth } from '../session/fakeEngine';
import { SessionProvider, useSession } from '../session/SessionProvider';
import { loadSession, saveSession } from '../session/storage';
import { announceSaved } from '../features/plan/quickAddSignal';
import { size, space } from '../theme/tokens';
import Add from '../app/add';
import Home from '../app/index';

const mockRedirect = jest.fn();
jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    mockRedirect(href);
    return null;
  },
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
}));

// Three-button navigation on Android: the page is drawn under a 48-point bar.
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 48, left: 0 }),
}));

// The account menu's card waits until its button has been measured; Jest's stand-in View
// never answers, so answer for it: a 40-point button in the top-right corner.
const nativeMethods = jest.requireActual('@react-native/jest-preset/jest/MockNativeMethods').default;

// The preset's stand-in screen has a font scale of 2; most tests want ordinary text.
const window = Dimensions.get('window');
const textSize = (fontScale: number) =>
  Dimensions.set({ window: { ...window, fontScale }, screen: { ...window, fontScale } });

// The Jest preset's AppState never changes; these tests say when it does.
const appStateListeners = new Set<(state: AppStateStatus) => void>();
const appGoes = async (...states: AppStateStatus[]) => {
  for (const state of states) {
    await act(async () => {
      for (const listener of [...appStateListeners]) listener(state);
    });
  }
};

beforeEach(() => {
  (SecureStore as any).__reset();
  jest.clearAllMocks();
  appStateListeners.clear();
  (AppState.addEventListener as jest.Mock).mockImplementation((type: string, listener: (state: AppStateStatus) => void) => {
    if (type === 'change') appStateListeners.add(listener);
    return { remove: () => appStateListeners.delete(listener) };
  });
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

// Amounts pushed to the bottom of tiles of one height share a baseline only at one size:
// $1,000 or more is drawn a size down, so its neighbour drops with it.
it('draws the amounts in a row at one size, so they share a baseline', async () => {
  const [bills, ...rest] = fakePlanMonth.groups;
  const phone = { ...bills.categories[1], id: 'cat-phone', name: 'Phone', budgeted: 120703, balance: 120703 };
  const internet = { ...bills.categories[1], id: 'cat-internet', name: 'Internet', budgeted: 15400, balance: 15400 };
  const month = { ...fakePlanMonth, groups: [{ ...bills, categories: [phone, internet] }, ...rest] };
  await showPlan(fakeEngine({ getPlanMonth: async () => month }));
  await screen.findByText('Phone');
  const sizeOf = (dollars: string) => screen.getByText(dollars).parent?.props.style.fontSize;
  expect(sizeOf('$154')).toBe(sizeOf('$1,207'));
});

it('keeps the last tile clear of the navigation bar and of the add button', async () => {
  await showPlan(fakeEngine());
  await screen.findByText('Groceries');
  expect(screen.getByTestId('plan-scroll').props.contentContainerStyle).toMatchObject({
    paddingBottom: space.lg + 48 + size.fab + space.lg,
  });
});

it('uses one column when the text is large', async () => {
  textSize(1.3);
  await showPlan(fakeEngine());
  await screen.findByText('Groceries');
  expect(screen.getAllByTestId('tile-row')).toHaveLength(6);
});

// Android keeps the font scale as a 32-bit float, so its largest setting, 1.3, arrives as
// 1.2999999523162842. Seen on the emulator: two columns at the largest text size.
it('uses one column at Android’s largest text size, which arrives a hair under 1.3', async () => {
  textSize(Math.fround(1.3));
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

it('centres the Offline chip on the top bar’s centre line, with the month and account button', async () => {
  await showPlan(fakeEngine({ offline: true }));
  await screen.findByText('Groceries');
  expect(screen.getByTestId('sync-chip')).toHaveStyle({ alignSelf: 'center' });
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

it('shows the error, not a spinner or the old month, when the next month cannot be read', async () => {
  const getPlanMonth = jest.fn(async (month: string) => {
    if (month === '2026-12') throw new EngineError('internal', 'x');
    return fakePlanMonth;
  });
  await showPlan(fakeEngine({ getPlanMonth }));
  await screen.findByText('Groceries');
  await waitFor(() => expect(nextEnabled()).toBe(true));
  await fireEvent.press(screen.getByRole('button', { name: 'Next month' }));
  expect(await screen.findByText('Could not read this month.')).toBeTruthy();
  expect(screen.getByText('December')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  expect(screen.queryByLabelText('Working')).toBeNull();
  expect(screen.queryByText('Groceries')).toBeNull();
  expect(screen.queryByText('$312')).toBeNull();
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

// --- Quick add: the way in, and the Plan after a save ---

it('floats a + button above the navigation bar that opens quick add', async () => {
  await showPlan(fakeEngine());
  await screen.findByText('Groceries');
  const button = screen.getByRole('button', { name: 'Add a transaction' });
  expect(screen.getByTestId('add-button')).toHaveStyle({ position: 'absolute', right: space.lg, bottom: 48 + space.lg });
  await fireEvent.press(button);
  expect(router.push).toHaveBeenCalledWith('/add');
});

it('shows the + button in another month too', async () => {
  await showPlan(fakeEngine({ getPlanMonth: async month => (month === '2026-12' ? December : fakePlanMonth) }));
  await screen.findByText('Groceries');
  await fireEvent.press(screen.getByRole('button', { name: 'Next month' }));
  await screen.findByText('December');
  expect(screen.getByRole('button', { name: 'Add a transaction' })).toBeTruthy();
});

/** A budget whose Groceries balance goes down by what is saved, as Actual's would. */
function spendingEngine(overrides: Partial<Engine> = {}) {
  let groceries = 20762;
  const order: string[] = [];
  const getPlanMonth = jest.fn(async (month: string) => {
    order.push('read');
    const [bills, everyday, goals] = fakePlanMonth.groups;
    const [, dining] = everyday.categories;
    const grocery = { ...everyday.categories[0], balance: groceries };
    return { ...fakePlanMonth, month, groups: [bills, { ...everyday, categories: [grocery, dining] }, goals] };
  });
  const addTransaction = jest.fn(async (_account: string, t: { amount: number }) => {
    groceries += t.amount;
  });
  // The sync records when it starts; `overrides.sync`, if given, decides how it ends.
  const { sync: ends, ...rest } = overrides;
  const sync = jest.fn(async () => {
    order.push('sync');
    await ends?.();
  });
  return { engine: fakeEngine({ getPlanMonth, addTransaction, sync, ...rest }), getPlanMonth, sync, order };
}

/** The Plan with the sheet over it while it is open: "+" opens it, Save closes it. */
async function showPlanWithSheet(engine: Engine) {
  let setOpen!: (open: boolean) => void;
  function App() {
    const [open, set] = useState(false);
    setOpen = set;
    return (
      <>
        <OpenThenHome />
        {open && <Add />}
      </>
    );
  }
  (router.push as jest.Mock).mockImplementation(() => setOpen(true));
  (router.back as jest.Mock).mockImplementation(() => setOpen(false));
  await saveOpenable();
  await render(<SessionProvider create={async () => engine}><App /></SessionProvider>);
}

const addGroceries = async (...keys: string[]) => {
  await fireEvent.press(screen.getByRole('button', { name: 'Add a transaction' }));
  await screen.findByRole('button', { name: 'Save' });
  for (const k of keys) await fireEvent.press(screen.getByRole('button', { name: k }));
  await fireEvent.press(screen.getByRole('button', { name: 'No category, choose one' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Groceries, $207.62' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Save' })).toBeNull());
};

it('reads the month again after a save, then syncs once in the background, with no pull spinner', async () => {
  let finishSync!: () => void;
  const { engine, getPlanMonth, sync, order } = spendingEngine({
    sync: jest.fn(() => new Promise<void>(resolve => (finishSync = () => resolve()))),
  });
  await showPlanWithSheet(engine);
  expect(await screen.findByText('$207')).toBeTruthy();
  const readsBefore = getPlanMonth.mock.calls.length;
  await addGroceries('5', '0');
  // The new balance shows while the sync is still running.
  expect(await screen.findByText('$157')).toBeTruthy();
  expect(screen.getByTestId('plan-scroll').props.refreshControl.props.refreshing).toBe(false);
  await act(async () => finishSync());
  await waitFor(() => expect(getPlanMonth.mock.calls.length).toBe(readsBefore + 3));
  expect(sync).toHaveBeenCalledTimes(1);
  // The sheet's own read of the month, then the Plan's: at once, and after the sync.
  expect(order.slice(-3)).toEqual(['read', 'sync', 'read']);
});

it('does not read the month again when the sheet is cancelled', async () => {
  const { engine, getPlanMonth, sync } = spendingEngine();
  await showPlanWithSheet(engine);
  await screen.findByText('$207');
  await fireEvent.press(screen.getByRole('button', { name: 'Add a transaction' }));
  await screen.findByRole('button', { name: 'Save' });
  const reads = getPlanMonth.mock.calls.length;
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
  expect(getPlanMonth).toHaveBeenCalledTimes(reads);
  expect(sync).not.toHaveBeenCalled();
});

it('says Offline when the sync after a save cannot reach the server, and keeps the new balance', async () => {
  const { engine } = spendingEngine({
    sync: jest.fn(async () => {
      throw new EngineError('network-failure', 'x');
    }),
  });
  await showPlanWithSheet(engine);
  await screen.findByText('$207');
  await addGroceries('5', '0');
  expect(await screen.findByText('Offline')).toBeTruthy();
  expect(screen.getByText('$157')).toBeTruthy();
});

it('says Not synced when the sync after a save fails another way', async () => {
  const { engine } = spendingEngine({
    sync: jest.fn(async () => {
      throw new EngineError('internal', 'x');
    }),
  });
  await showPlanWithSheet(engine);
  await screen.findByText('$207');
  await addGroceries('5', '0');
  expect(await screen.findByText('Not synced')).toBeTruthy();
});

it('signs out when the sync after a save says the session has expired', async () => {
  const { engine } = spendingEngine({
    sync: jest.fn(async () => {
      throw new EngineError('token-expired', 'x');
    }),
  });
  await showPlanWithSheet(engine);
  await screen.findByText('$207');
  await addGroceries('5', '0');
  await waitFor(() => expect(mockRedirect).toHaveBeenCalledWith('/connect'));
  expect(await loadSession()).toBeNull();
});

it('reads the month again on each save, not on each render', async () => {
  const { engine, getPlanMonth, sync } = spendingEngine();
  await showPlan(engine);
  await screen.findByText('$207');
  const reads = getPlanMonth.mock.calls.length;
  await fireEvent.press(screen.getByRole('button', { name: 'Account' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Account' }));
  expect(getPlanMonth).toHaveBeenCalledTimes(reads);
  await act(async () => announceSaved());
  await waitFor(() => expect(sync).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(getPlanMonth).toHaveBeenCalledTimes(reads + 2));
});

it('a save during a pull joins its sync, which ends the pull as before, then owes one more', async () => {
  let finishSync!: () => void;
  const { engine, sync, getPlanMonth } = spendingEngine({
    sync: jest.fn(() => new Promise<void>(resolve => (finishSync = () => resolve()))),
  });
  await showPlan(engine);
  await screen.findByText('$207');
  const refreshControl = () => screen.getByTestId('plan-scroll').props.refreshControl;
  let pull!: Promise<void>;
  await act(async () => {
    pull = refreshControl().props.onRefresh();
  });
  await act(async () => announceSaved());
  expect(sync).toHaveBeenCalledTimes(1);
  // The pull still shows its spinner until the one sync, and the read after it, are done.
  expect(refreshControl().props.refreshing).toBe(true);
  const reads = getPlanMonth.mock.calls.length;
  await act(async () => {
    finishSync();
    await pull;
  });
  // The pull ends with its own sync and read, as a pull did before.
  expect(refreshControl().props.refreshing).toBe(false);
  expect(getPlanMonth.mock.calls.length).toBeGreaterThanOrEqual(reads + 1);
  // Then the sync the save is owed starts, in the background.
  await waitFor(() => expect(sync).toHaveBeenCalledTimes(2));
  expect(refreshControl().props.refreshing).toBe(false);
  await act(async () => finishSync());
});

it('a pull during the sync after a save joins it, and shows its spinner until it ends', async () => {
  let finishSync!: () => void;
  const { engine, sync } = spendingEngine({
    sync: jest.fn(() => new Promise<void>(resolve => (finishSync = () => resolve()))),
  });
  await showPlan(engine);
  await screen.findByText('$207');
  await act(async () => announceSaved());
  await waitFor(() => expect(sync).toHaveBeenCalledTimes(1));
  const refreshControl = () => screen.getByTestId('plan-scroll').props.refreshControl;
  expect(refreshControl().props.refreshing).toBe(false);
  let pull!: Promise<void>;
  await act(async () => {
    pull = refreshControl().props.onRefresh();
  });
  expect(refreshControl().props.refreshing).toBe(true);
  expect(sync).toHaveBeenCalledTimes(1);
  await act(async () => {
    finishSync();
    await pull;
  });
  expect(refreshControl().props.refreshing).toBe(false);
  expect(sync).toHaveBeenCalledTimes(1);
});

it('syncs again for a later save once the earlier sync has finished', async () => {
  const { engine, sync } = spendingEngine();
  await showPlan(engine);
  await screen.findByText('$207');
  await act(async () => announceSaved());
  await waitFor(() => expect(sync).toHaveBeenCalledTimes(1));
  await act(async () => announceSaved());
  await waitFor(() => expect(sync).toHaveBeenCalledTimes(2));
});

// --- A save made while a sync runs is owed one more sync, so it reaches the server ---

/** A sync that waits to be told how to end, then syncs that end at once as `rest` says. */
function heldThen(rest: () => Promise<void>) {
  let end!: (error?: Error) => void;
  const ends = jest
    .fn<Promise<void>, []>()
    .mockImplementationOnce(() => new Promise<void>((resolve, reject) => (end = e => (e ? reject(e) : resolve()))))
    .mockImplementation(rest);
  return { ends, end: (error?: Error) => end(error) };
}

/** Starts a pull and returns, wrapped so that awaiting this does not wait for the pull itself. */
const startPull = async (): Promise<{ pull: Promise<void> }> => {
  let pull!: Promise<void>;
  await act(async () => {
    pull = screen.getByTestId('plan-scroll').props.refreshControl.props.onRefresh();
  });
  return { pull };
};

it('runs one more sync after the running one for any number of saves made during it', async () => {
  const held = heldThen(async () => {});
  const { engine, sync } = spendingEngine({ sync: held.ends });
  await showPlan(engine);
  await screen.findByText('$207');
  const { pull } = await startPull();
  await act(async () => announceSaved());
  await act(async () => announceSaved());
  expect(sync).toHaveBeenCalledTimes(1);
  await act(async () => {
    held.end();
    await pull;
  });
  await waitFor(() => expect(sync).toHaveBeenCalledTimes(2));
  await act(async () => {});
  expect(sync).toHaveBeenCalledTimes(2);
});

it('runs the owed sync even when the running one fails, and shows the owed one’s result', async () => {
  const held = heldThen(async () => {});
  const { engine, sync } = spendingEngine({ sync: held.ends });
  await showPlan(engine);
  await screen.findByText('$207');
  const { pull } = await startPull();
  await act(async () => announceSaved());
  await act(async () => {
    held.end(new EngineError('network-failure', 'x'));
    await pull;
  });
  await waitFor(() => expect(sync).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.queryByText('Offline')).toBeNull());
});

it('does not keep syncing when the owed sync fails too', async () => {
  const held = heldThen(async () => {
    throw new EngineError('internal', 'x');
  });
  const { engine, sync } = spendingEngine({ sync: held.ends });
  await showPlan(engine);
  await screen.findByText('$207');
  const { pull } = await startPull();
  await act(async () => announceSaved());
  await act(async () => {
    held.end(new EngineError('network-failure', 'x'));
    await pull;
  });
  await waitFor(() => expect(sync).toHaveBeenCalledTimes(2));
  expect(await screen.findByText('Not synced')).toBeTruthy();
  await act(async () => {});
  expect(sync).toHaveBeenCalledTimes(2);
});

it('a pull during a running sync owes nothing', async () => {
  const held = heldThen(async () => {});
  const { engine, sync } = spendingEngine({ sync: held.ends });
  await showPlan(engine);
  await screen.findByText('$207');
  const { pull: first } = await startPull();
  const { pull: second } = await startPull();
  await act(async () => {
    held.end();
    await Promise.all([first, second]);
  });
  await act(async () => {});
  expect(sync).toHaveBeenCalledTimes(1);
});

// --- Coming back to the app ---

/** A time in November 2026 (or another month, counted from 0), on the phone's clock. */
const at = (day: number, time: [number, number, number] = [12, 0, 0], monthIndex = 10) =>
  new Date(2026, monthIndex, day, ...time);
/** Out to another app and back, as Android reports it; iOS passes through `inactive` both ways. */
const leaveAndReturn = () => appGoes('background', 'active');

it('reads today again on coming back on a later day, and refreshes as a pull does, without its spinner', async () => {
  let finishSync!: () => void;
  const sync = jest.fn(() => new Promise<void>(resolve => (finishSync = resolve)));
  await showPlan(fakeEngine({ sync }));
  expect(await screen.findByText('$17 a day for 12 days')).toBeTruthy();
  jest.setSystemTime(at(20, [8, 0, 0]));
  await leaveAndReturn();
  expect(await screen.findByText('$18 a day for 11 days')).toBeTruthy();
  expect(sync).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('plan-scroll').props.refreshControl.props.refreshing).toBe(false);
  await act(async () => finishSync());
});

it('does nothing on coming back within a minute of the last sync, on the same day', async () => {
  const sync = jest.fn(async () => {});
  const getPlanMonth = jest.fn(async () => fakePlanMonth);
  await showPlan(fakeEngine({ sync, getPlanMonth }));
  await screen.findByText('Groceries');
  const reads = getPlanMonth.mock.calls.length;
  // The budget was opened, and synced, at noon.
  jest.setSystemTime(at(19, [12, 0, 59]));
  await leaveAndReturn();
  expect(sync).not.toHaveBeenCalled();
  expect(getPlanMonth).toHaveBeenCalledTimes(reads);
});

it('syncs once on coming back a minute or more after the last sync', async () => {
  const sync = jest.fn(async () => {});
  await showPlan(fakeEngine({ sync }));
  await screen.findByText('Groceries');
  jest.setSystemTime(at(19, [12, 1, 0]));
  await leaveAndReturn();
  expect(sync).toHaveBeenCalledTimes(1);
  // That sync, like a pull's, starts the minute again.
  jest.setSystemTime(at(19, [12, 1, 30]));
  await leaveAndReturn();
  expect(sync).toHaveBeenCalledTimes(1);
});

it('counts the minute from a pull too', async () => {
  const sync = jest.fn(async () => {});
  await showPlan(fakeEngine({ sync }));
  await screen.findByText('Groceries');
  jest.setSystemTime(at(19, [12, 5, 0]));
  await pullToRefresh();
  jest.setSystemTime(at(19, [12, 5, 30]));
  await leaveAndReturn();
  expect(sync).toHaveBeenCalledTimes(1);
});

it('syncs on any return while the last sync did not succeed, and shows Offline as a pull would', async () => {
  const sync = jest.fn(async () => {
    throw new EngineError('network-failure', 'x');
  });
  await showPlan(fakeEngine({ offline: true, sync }));
  await screen.findByText('Groceries');
  jest.setSystemTime(at(19, [12, 0, 10]));
  await leaveAndReturn();
  expect(sync).toHaveBeenCalledTimes(1);
  jest.setSystemTime(at(19, [12, 0, 20]));
  await leaveAndReturn();
  expect(sync).toHaveBeenCalledTimes(2);
  expect(screen.getByText('Offline')).toBeTruthy();
  expect(screen.getByText('Groceries')).toBeTruthy();
});

it('signs out when the sync on coming back says the session has expired', async () => {
  const sync = jest.fn(async () => {
    throw new EngineError('token-expired', 'x');
  });
  await showPlan(fakeEngine({ sync }));
  await screen.findByText('Groceries');
  jest.setSystemTime(at(19, [13, 0, 0]));
  await leaveAndReturn();
  await waitFor(() => expect(mockRedirect).toHaveBeenCalledWith('/connect'));
  expect(await loadSession()).toBeNull();
  // The Plan has gone, and stopped listening for the app coming back.
  expect(appStateListeners.size).toBe(0);
});

it('does not count a brief inactive spell (the app switcher, a notification) as coming back', async () => {
  const sync = jest.fn(async () => {});
  await showPlan(fakeEngine({ sync }));
  await screen.findByText('Groceries');
  jest.setSystemTime(at(20, [8, 0, 0]));
  await appGoes('inactive', 'active');
  expect(sync).not.toHaveBeenCalled();
  expect(screen.getByText('$17 a day for 12 days')).toBeTruthy();
  // iOS on the way out to another app and back.
  await appGoes('inactive', 'background', 'inactive', 'active');
  expect(sync).toHaveBeenCalledTimes(1);
  expect(await screen.findByText('$18 a day for 11 days')).toBeTruthy();
});

it('joins a sync already running rather than starting another', async () => {
  let finishSync!: () => void;
  const sync = jest.fn(() => new Promise<void>(resolve => (finishSync = resolve)));
  await showPlan(fakeEngine({ sync }));
  await screen.findByText('Groceries');
  jest.setSystemTime(at(19, [12, 5, 0]));
  const { pull } = await startPull();
  await leaveAndReturn();
  expect(sync).toHaveBeenCalledTimes(1);
  await act(async () => {
    finishSync();
    await pull;
  });
  await act(async () => {});
  expect(sync).toHaveBeenCalledTimes(1);
});

it('moves to the new month when it was showing the current one and the month has ended', async () => {
  jest.setSystemTime(at(30, [23, 59, 0]));
  const getPlanMonth = jest.fn(async (month: string) => (month === '2026-12' ? December : fakePlanMonth));
  await showPlan(fakeEngine({ getPlanMonth }));
  await screen.findByText('Groceries');
  expect(screen.getByText('November')).toBeTruthy();
  jest.setSystemTime(at(1, [7, 0, 0], 11));
  await leaveAndReturn();
  expect(await screen.findByText('December')).toBeTruthy();
  expect(await screen.findAllByText('$50')).toBeTruthy();
  expect(getPlanMonth).toHaveBeenLastCalledWith('2026-12');
});

it('stays on a month the person chose when the month ends', async () => {
  jest.setSystemTime(at(30, [23, 59, 0]));
  const October: PlanMonth = { ...fakePlanMonth, month: '2026-10' };
  const getPlanMonth = jest.fn(async (month: string) => (month === '2026-10' ? October : fakePlanMonth));
  await showPlan(fakeEngine({ getPlanMonth }));
  await screen.findByText('Groceries');
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Previous month' }).props.accessibilityState.disabled).toBe(false),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Previous month' }));
  expect(await screen.findByText('October')).toBeTruthy();
  jest.setSystemTime(at(1, [7, 0, 0], 11));
  await leaveAndReturn();
  await act(async () => {});
  expect(screen.getByText('October')).toBeTruthy();
  expect(getPlanMonth).not.toHaveBeenCalledWith('2026-12');
});

it('dates a transaction the new day when the sheet is opened after coming back on a later day', async () => {
  const { engine } = spendingEngine();
  await showPlanWithSheet(engine);
  await screen.findByText('$207');
  jest.setSystemTime(at(20, [8, 0, 0]));
  await leaveAndReturn();
  await fireEvent.press(screen.getByRole('button', { name: 'Add a transaction' }));
  expect(await screen.findByLabelText('Date, Today')).toBeTruthy();
  // It can step back to the 19th and forward to the 20th again, and no further.
  expect(screen.getByRole('button', { name: 'Later day' }).props.accessibilityState).toMatchObject({ disabled: true });
  await fireEvent.press(screen.getByRole('button', { name: 'Earlier day' }));
  expect(screen.getByLabelText('Date, Yesterday')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Later day' }));
  expect(screen.getByLabelText('Date, Today')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Later day' }).props.accessibilityState).toMatchObject({ disabled: true });
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
  await addGroceries('5', '0');
  expect(engine.addTransaction).toHaveBeenLastCalledWith(
    expect.any(String),
    expect.objectContaining({ date: '2026-11-20' }),
  );
});

it('leaves an open sheet and its draft alone, and refreshes the Plan behind it', async () => {
  const { engine, sync } = spendingEngine();
  await showPlanWithSheet(engine);
  await screen.findByText('$207');
  await fireEvent.press(screen.getByRole('button', { name: 'Add a transaction' }));
  await screen.findByRole('button', { name: 'Save' });
  await fireEvent.press(screen.getByRole('button', { name: '7' }));
  jest.setSystemTime(at(20, [8, 0, 0]));
  await leaveAndReturn();
  await waitFor(() => expect(sync).toHaveBeenCalledTimes(1));
  // The Plan behind has moved to the new day.
  expect(await screen.findByText('$18 a day for 11 days')).toBeTruthy();
  // The sheet keeps what was typed, and the day it was opened on.
  expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  expect(screen.getByTestId('amount-display')).toHaveTextContent(/7/);
  expect(screen.getByLabelText('Date, Today')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'No category, choose one' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Groceries, $207.62' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(engine.addTransaction).toHaveBeenCalledTimes(1));
  expect(engine.addTransaction).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ date: '2026-11-19' }));
});
