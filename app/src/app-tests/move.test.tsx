import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Dimensions } from 'react-native';

import { EngineError, READY } from '../engine/types';
import type { Engine, PlanMonth } from '../engine/types';
import { onSaved, setPlanShown, setPlanToday } from '../features/plan/planSignal';
import { fakeBudgets, fakeEngine, fakePlanMonth, withCategory } from '../session/fakeEngine';
import { SessionProvider, useSession } from '../session/SessionProvider';
import { saveSession } from '../session/storage';
import { sheet as sheetTokens } from '../theme/tokens';
import Home from '../app/index';
import Move from '../app/move';

const mockRedirect = jest.fn();
let mockParams: Record<string, unknown> = {};
jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    mockRedirect(href);
    return null;
  },
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn(), dismissTo: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));

jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 48, left: 0 }),
}));

const nov19 = new Date(2026, 10, 19, 12);
const original = Dimensions.get('window');
const windowOf = (width: number, height: number) => {
  const window = { ...original, width, height, fontScale: 1 };
  Dimensions.set({ window, screen: window });
};

beforeEach(() => {
  (SecureStore as any).__reset();
  jest.clearAllMocks();
  setPlanToday(nov19);
  setPlanShown({ month: '2026-11', plan: fakePlanMonth });
  windowOf(411, 914);
});

afterEach(() => {
  setPlanToday(null);
  setPlanShown(null);
  Dimensions.set({ window: original, screen: original });
});

function OpenThen({ children }: { children: React.ReactNode }) {
  const session = useSession();
  useEffect(() => {
    if (session.status === 'closed') void session.open();
  }, [session]);
  return <>{children}</>;
}

const saveOpenable = () =>
  saveSession({ serverURL: 'https://budget.example.com', sessionToken: 'token-for-tests', budget: fakeBudgets[0] });

async function showSheet(params: Record<string, unknown>, engine: Engine = fakeEngine()) {
  mockParams = params;
  await saveOpenable();
  await render(<SessionProvider create={async () => engine}><OpenThen><Move /></OpenThen></SessionProvider>);
}

const keypad = () => screen.findByRole('button', { name: 'Delete' });
const key = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const type = async (...keys: string[]) => {
  for (const k of keys) await key(k === '.' ? 'Decimal point' : k);
};
const card = (label: 'From' | 'To') =>
  screen.getAllByRole('button').find(b => String(b.props.accessibilityLabel).startsWith(`${label}:`))!;

it('opens from its link with the pots and the amount, and no sign key', async () => {
  await showSheet({ from: 'cat-groceries', to: READY, amount: '1500' });
  await keypad();
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
  expect(screen.getByRole('header', { name: 'Move money' })).toBeTruthy();
  expect(screen.getByLabelText('$15.00')).toBeTruthy();
  expect(card('From').props.accessibilityLabel).toBe('From: Groceries, $207.62 now, $192.62 after');
  expect(card('To').props.accessibilityLabel).toBe('To: Ready to budget, $312.00 now, $327.00 after');
  expect(screen.queryByRole('button', { name: 'Expense or income' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Move' })).toBeTruthy();
});

it('is Assign, with an Assign key, from Ready to budget', async () => {
  await showSheet({ from: READY });
  await keypad();
  expect(screen.getByRole('header', { name: 'Assign' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Assign' })).toBeTruthy();
  expect(card('To').props.accessibilityLabel).toBe('To: none chosen, choose one');
});

it('ignores a pot the plan does not have, and a malformed amount', async () => {
  await showSheet({ from: 'cat-gone', to: 'cat-rent', amount: '12.5' });
  await keypad();
  expect(card('From').props.accessibilityLabel).toBe('From: none chosen, choose one');
  expect(card('To').props.accessibilityLabel).toMatch(/^To: Rent,/);
  expect(screen.getByLabelText('$0.00')).toBeTruthy();
});

it('the same pot twice in a link is kept as From only', async () => {
  await showSheet({ from: 'cat-rent', to: 'cat-rent' });
  await keypad();
  expect(card('From').props.accessibilityLabel).toMatch(/^From: Rent/);
  expect(card('To').props.accessibilityLabel).toBe('To: none chosen, choose one');
});

it('replaces a pre-filled amount with the first key', async () => {
  await showSheet({ from: 'cat-groceries', to: READY, amount: '1500' });
  await keypad();
  await type('7');
  expect(screen.getByLabelText('$7.00')).toBeTruthy();
});

it('swaps the pots', async () => {
  await showSheet({ from: 'cat-groceries', to: 'cat-rent' });
  await keypad();
  await key('Swap From and To');
  expect(card('From').props.accessibilityLabel).toMatch(/^From: Rent/);
  expect(card('To').props.accessibilityLabel).toMatch(/^To: Groceries/);
});

it('picks a pot from the From list, which leaves out the To pot and cannot pick an empty one', async () => {
  await showSheet({ to: 'cat-rent' });
  await keypad();
  await fireEvent.press(card('From'));
  expect(screen.getByText('Move from')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Rent, $0.00' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Dining out, −$28.10' }).props.accessibilityState).toMatchObject({ disabled: true });
  await fireEvent.press(screen.getByRole('button', { name: 'Electricity, $120.00' }));
  expect(card('From').props.accessibilityLabel).toMatch(/^From: Electricity/);
});

it('picks a pot from the To list, which leaves out the From pot', async () => {
  await showSheet({ from: 'cat-electricity' });
  await keypad();
  await fireEvent.press(card('To'));
  expect(screen.getByText('Move to')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Electricity, $120.00' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Dining out, −$28.10' }));
  expect(card('To').props.accessibilityLabel).toMatch(/^To: Dining out/);
});

it('warns when the amount is more than the From pot has, and Move does nothing', async () => {
  const moveMoney = jest.fn(async () => {});
  await showSheet({ from: 'cat-electricity', to: 'cat-rent' }, fakeEngine({ moveMoney }));
  await keypad();
  await type('2', '0', '0');
  expect(screen.getByText('That is $80.00 more than Electricity has', { includeHiddenElements: true })).toBeTruthy();
  expect(card('From').props.accessibilityLabel).toMatch(/That is \$80\.00 more than Electricity has$/);
  const move = screen.getByRole('button', { name: 'Move' });
  expect(move.props.accessibilityState).toMatchObject({ disabled: true });
  await fireEvent.press(move);
  expect(moveMoney).not.toHaveBeenCalled();
});

it('moves the money, then goes back to the Plan and tells it', async () => {
  const moveMoney = jest.fn(async () => {});
  const saved = jest.fn();
  const stop = onSaved(saved);
  await showSheet({ from: 'cat-groceries', to: 'cat-rent' }, fakeEngine({ moveMoney }));
  await keypad();
  await type('5', '0');
  await key('Move');
  await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
  expect(moveMoney).toHaveBeenCalledWith({
    month: '2026-11', from: 'cat-groceries', to: 'cat-rent', amount: 5000, seen: { from: 20762, to: 0 },
  });
  expect(saved).toHaveBeenCalledTimes(1);
  stop();
});

it('moves only once, however often the key is pressed, and Cancel is off meanwhile', async () => {
  let finish!: () => void;
  const moveMoney = jest.fn(() => new Promise<void>(resolve => (finish = resolve)));
  await showSheet({ from: 'cat-groceries', to: 'cat-rent' }, fakeEngine({ moveMoney }));
  await keypad();
  await type('5');
  await key('Move');
  await key('Move');
  expect(moveMoney).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Cancel' }).props.accessibilityState).toMatchObject({ disabled: true });
  await act(async () => finish());
});

it('still tells the Plan, and does not navigate, when the sheet was dismissed before the write finished', async () => {
  let finish!: () => void;
  const moveMoney = jest.fn(() => new Promise<void>(resolve => (finish = resolve)));
  const saved = jest.fn();
  const stop = onSaved(saved);
  await showSheet({ from: 'cat-groceries', to: 'cat-rent' }, fakeEngine({ moveMoney }));
  await keypad();
  await type('5');
  await key('Move');
  await screen.unmount();
  await act(async () => finish());
  expect(saved).toHaveBeenCalledTimes(1);
  expect(router.back).not.toHaveBeenCalled();
  stop();
});

it('says so in an alert when the write fails after the sheet was dismissed', async () => {
  let fail!: (e: Error) => void;
  const moveMoney = jest.fn(() => new Promise<void>((_resolve, reject) => (fail = reject)));
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await showSheet({ from: 'cat-groceries', to: 'cat-rent' }, fakeEngine({ moveMoney }));
  await keypad();
  await type('5');
  await key('Move');
  await screen.unmount();
  await act(async () => fail(new Error('disk full')));
  expect(alert).toHaveBeenCalledWith('Not done', 'Could not do that. Try again.');
  alert.mockRestore();
});

it('stays open with a message, and keeps the form, when the write fails', async () => {
  const moveMoney = jest.fn(async () => {
    throw new Error('disk full');
  });
  const getPlanMonth = jest.fn(async () => fakePlanMonth);
  await showSheet({ from: 'cat-groceries', to: 'cat-rent' }, fakeEngine({ moveMoney, getPlanMonth }));
  await keypad();
  await type('1', '8', '.', '4');
  await key('Move');
  expect(await screen.findByText('Could not do that. Try again.')).toBeTruthy();
  expect(router.back).not.toHaveBeenCalled();
  expect(screen.getByLabelText('$18.40')).toBeTruthy();
  expect(card('From').props.accessibilityLabel).toMatch(/^From: Groceries/);
  expect(screen.getByRole('button', { name: 'Move' }).props.accessibilityState).toMatchObject({ disabled: false });
  expect(getPlanMonth).toHaveBeenCalledTimes(1);
});

const STALE = 'That changed while you were here. Check the numbers and try again.';
const from = () => card('From').props.accessibilityLabel as string;

it('refuses a move the budget no longer allows, reads it again, keeps the form, and says so', async () => {
  const engine = fakeEngine();
  const getPlanMonth = jest.spyOn(engine, 'getPlanMonth');
  await showSheet({ from: 'cat-groceries', to: 'cat-rent' }, engine);
  await keypad();
  await type('5', '0');
  // The other device spent from Groceries; the sync before the write brings it in.
  engine.elsewhere(plan => withCategory(plan, 'cat-groceries', { balance: 1000 }));
  await key('Move');
  expect(await screen.findByText(STALE)).toBeTruthy();
  expect(getPlanMonth).toHaveBeenCalledTimes(2);
  expect(getPlanMonth).toHaveBeenLastCalledWith('2026-11');
  // The new numbers: Groceries now has $10.00, so $50.00 is too much.
  expect(from()).toMatch(/^From: Groceries, \$10\.00 now/);
  expect(screen.getByLabelText('$50.00')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Move' }).props.accessibilityState).toMatchObject({ disabled: true });
  expect(router.back).not.toHaveBeenCalled();
});

it('refuses a move that is still allowed when the figures are not what the sheet showed, and a retry goes through', async () => {
  const engine = fakeEngine();
  await showSheet({ from: 'cat-groceries', to: 'cat-rent' }, engine);
  await keypad();
  await type('5', '0');
  engine.elsewhere(plan => withCategory(plan, 'cat-groceries', { balance: 20000 }));
  await key('Move');
  expect(await screen.findByText(STALE)).toBeTruthy();
  expect(from()).toBe('From: Groceries, $200.00 now, $150.00 after');
  expect(router.back).not.toHaveBeenCalled();
  // Pressed again on the numbers now shown, it goes through.
  await key('Move');
  await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
  const after = (await engine.getPlanMonth('2026-11')).groups.flatMap(g => g.categories);
  expect(after.find(c => c.id === 'cat-groceries')!.balance).toBe(15000);
  expect(after.find(c => c.id === 'cat-rent')!.balance).toBe(5000);
});

it('keeps the numbers on screen and the message when reading the budget again fails', async () => {
  const engine = fakeEngine();
  const read = engine.getPlanMonth;
  let readFails = false;
  engine.getPlanMonth = async month => {
    if (readFails) throw new Error('disk full');
    return read(month);
  };
  await showSheet({ from: 'cat-groceries', to: 'cat-rent' }, engine);
  await keypad();
  await type('5', '0');
  engine.elsewhere(plan => withCategory(plan, 'cat-groceries', { balance: 1000 }));
  readFails = true;
  await key('Move');
  expect(await screen.findByText(STALE)).toBeTruthy();
  expect(from()).toBe('From: Groceries, $207.62 now, $157.62 after');
  expect(screen.getByLabelText('$50.00')).toBeTruthy();
});

it('freezes the form while the move is under way: keys, cards and swap do nothing, and Move shows progress', async () => {
  let finish!: () => void;
  const moveMoney = jest.fn(() => new Promise<void>(resolve => (finish = resolve)));
  await showSheet({ from: 'cat-groceries', to: 'cat-rent' }, fakeEngine({ moveMoney }));
  await keypad();
  await type('5');
  await key('Move');
  expect(moveMoney).toHaveBeenCalledWith(expect.objectContaining({ from: 'cat-groceries', to: 'cat-rent', amount: 500 }));
  for (const name of ['7', 'Delete', 'Swap From and To']) {
    expect(screen.getByRole('button', { name }).props.accessibilityState).toMatchObject({ disabled: true });
  }
  expect(card('From').props.accessibilityState).toMatchObject({ disabled: true });
  expect(card('To').props.accessibilityState).toMatchObject({ disabled: true });
  await key('7');
  await key('Delete');
  await key('Swap From and To');
  await fireEvent.press(card('From'));
  expect(screen.getByLabelText('$5.00')).toBeTruthy();
  expect(from()).toMatch(/^From: Groceries/);
  expect(screen.queryByText('Move from')).toBeNull();
  expect(within(screen.getByTestId('move-footer')).getByLabelText('Working')).toBeTruthy();
  await act(async () => finish());
  expect(moveMoney).toHaveBeenCalledTimes(1);
});

it('writes nothing, and says so with a way back, when the month has ended while the sheet was open', async () => {
  const moveMoney = jest.fn(async () => {});
  await showSheet({ from: 'cat-groceries', to: 'cat-rent' }, fakeEngine({ moveMoney }));
  await keypad();
  await type('5');
  // The Plan renews its "today" (the app came back after midnight on the last day of November).
  await act(async () => setPlanToday(new Date(2026, 11, 1, 0, 5)));
  await key('Move');
  expect(await screen.findByText('This month has ended. Changes to past months are not made here.')).toBeTruthy();
  expect(moveMoney).not.toHaveBeenCalled();
  await key('Close');
  expect(router.back).toHaveBeenCalledTimes(1);
});

it('titles the lists after the sheet: Take from and Assign to when assigning', async () => {
  await showSheet({ from: READY });
  await keypad();
  await fireEvent.press(card('To'));
  expect(screen.getByText('Assign to')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Rent, $0.00' }));
  await fireEvent.press(card('From'));
  expect(screen.getByText('Take from')).toBeTruthy();
  expect(screen.queryByText('Move from')).toBeNull();
});

it('puts a failed move\'s message just above the keypad, where it is seen, not at the end of the scroll', async () => {
  const moveMoney = jest.fn(async () => {
    throw new EngineError('stale', 'x');
  });
  await showSheet({ from: 'cat-groceries', to: 'cat-rent' }, fakeEngine({ moveMoney }));
  await keypad();
  await type('5');
  await key('Move');
  const message = 'That changed while you were here. Check the numbers and try again.';
  await screen.findByText(message);
  expect(within(screen.getByTestId('move-footer')).getByText(message)).toBeTruthy();
  expect(within(screen.getByTestId('sheet-scroll')).queryByText(message)).toBeNull();
});

it('closes without moving on Cancel', async () => {
  const moveMoney = jest.fn(async () => {});
  await showSheet({ from: 'cat-groceries', to: 'cat-rent' }, fakeEngine({ moveMoney }));
  await keypad();
  await type('5');
  await key('Cancel');
  expect(router.back).toHaveBeenCalledTimes(1);
  expect(moveMoney).not.toHaveBeenCalled();
});

it('is compact on a short screen, as quick add is', async () => {
  windowOf(360, 640);
  await showSheet({ from: 'cat-groceries' });
  await keypad();
  expect(screen.getByTestId('amount-display')).toHaveStyle({ height: sheetTokens.compact.amountBox });
});

it('reads the month the Plan is showing', async () => {
  setPlanShown({ month: '2026-12', plan: { ...fakePlanMonth, month: '2026-12' } });
  const getPlanMonth = jest.fn(async (month: string) => ({ ...fakePlanMonth, month }));
  await showSheet({ from: READY }, fakeEngine({ getPlanMonth }));
  await keypad();
  expect(getPlanMonth).toHaveBeenCalledWith('2026-12');
});

it('says so, and tries again, when the plan cannot be read', async () => {
  const getPlanMonth = jest.fn<Promise<PlanMonth>, [string]>().mockRejectedValueOnce(new Error('x')).mockResolvedValue(fakePlanMonth);
  await showSheet({ from: READY }, fakeEngine({ getPlanMonth }));
  expect(await screen.findByText('Could not read this budget.')).toBeTruthy();
  await key('Try again');
  expect(await keypad()).toBeTruthy();
});

describe('sending a sheet with nothing to act on back to the Plan', () => {
  it('a past month', async () => {
    setPlanShown({ month: '2026-10', plan: { ...fakePlanMonth, month: '2026-10' } });
    const getPlanMonth = jest.fn(async () => fakePlanMonth);
    await showSheet({ from: READY }, fakeEngine({ getPlanMonth }));
    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/'));
    expect(getPlanMonth).not.toHaveBeenCalled();
    // Down the stack to the Plan already under the sheet: a redirect replaced the sheet with a
    // second Plan over the first.
    expect(mockRedirect).not.toHaveBeenCalledWith('/');
  });
  it('no Plan showing', async () => {
    setPlanShown(null);
    await showSheet({ from: READY });
    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/'));
  });
  it('no open budget', async () => {
    mockParams = { from: READY };
    await render(<SessionProvider create={async () => fakeEngine()}><Move /></SessionProvider>);
    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/'));
  });
});

it('the Plan shows the new balances after a move', async () => {
  let setOpen!: (open: boolean) => void;
  function App() {
    const [open, set] = useState(false);
    setOpen = set;
    return (
      <OpenThen>
        <Home />
        {open && <Move />}
      </OpenThen>
    );
  }
  (router.back as jest.Mock).mockImplementation(() => setOpen(false));
  setPlanShown(null);
  setPlanToday(null);
  mockParams = { from: 'cat-groceries', to: 'cat-rent' };
  jest.useFakeTimers({ now: nov19, doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame'] });
  try {
    await saveOpenable();
    await render(<SessionProvider create={async () => fakeEngine()}><App /></SessionProvider>);
    expect(await screen.findByText('$207')).toBeTruthy();
    await act(async () => setOpen(true));
    await keypad();
    await type('5', '0');
    await key('Move');
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull());
    expect(await screen.findByText('$157')).toBeTruthy();
    expect(screen.getAllByText('$50').length).toBeGreaterThan(0);
  } finally {
    jest.useRealTimers();
  }
});
