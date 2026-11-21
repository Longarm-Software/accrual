import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Dimensions, Platform, StyleSheet } from 'react-native';

import type { Engine, NewTransaction, PlanMonth } from '../engine/types';
import { onSaved, setPlanToday } from '../features/plan/planSignal';
import { fakeBudgets, fakeEngine, fakePlanMonth, fakeQuickAddLists } from '../session/fakeEngine';
import { SessionProvider, useSession } from '../session/SessionProvider';
import { saveSession } from '../session/storage';
import { sheet as sheetTokens } from '../theme/tokens';
import Add from '../app/add';

const mockRedirect = jest.fn();
jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    mockRedirect(href);
    return null;
  },
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 48, left: 0 }),
}));

const nov19 = new Date(2026, 10, 19, 12);

beforeEach(() => {
  (SecureStore as any).__reset();
  jest.clearAllMocks();
  setPlanToday(nov19);
});

afterEach(() => setPlanToday(null));

function OpenThenAdd() {
  const session = useSession();
  useEffect(() => {
    if (session.status === 'closed') void session.open();
  }, [session]);
  return <Add />;
}

/** The sheet over an open budget, on the given engine, ready for typing. */
async function showSheet(engine: Engine = fakeEngine()) {
  await saveSession({ serverURL: 'https://budget.example.com', sessionToken: 'token-for-tests', budget: fakeBudgets[0] });
  await render(<SessionProvider create={async () => engine}><OpenThenAdd /></SessionProvider>);
}

const ready = () => screen.findByRole('button', { name: 'Save' });
const key = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const type = async (...keys: string[]) => {
  for (const k of keys) await key(k === '.' ? 'Decimal point' : k);
};
const card = () => screen.getByTestId('category-card');
const pickPayee = async (text: string, name: string) => {
  const field = screen.getByLabelText('Payee');
  await fireEvent(field, 'focus');
  await fireEvent.changeText(field, text);
  await fireEvent.press(screen.getByRole('button', { name }));
};
const save = () => screen.getByRole('button', { name: 'Save' });

it('opens with the header, $0.00 and the keypad', async () => {
  await showSheet();
  await ready();
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
  expect(screen.getByText('New transaction')).toBeTruthy();
  expect(screen.getByLabelText('$0.00')).toBeTruthy();
  expect(screen.getByLabelText('Date, Today')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Account, Everyday Checking' })).toBeTruthy();
});

it('reads the lists and this month’s plan', async () => {
  const getPlanMonth = jest.fn(async () => fakePlanMonth);
  const getQuickAddLists = jest.fn(async () => fakeQuickAddLists);
  await showSheet(fakeEngine({ getPlanMonth, getQuickAddLists }));
  await ready();
  expect(getPlanMonth).toHaveBeenCalledWith('2026-11');
  expect(getQuickAddLists).toHaveBeenCalledTimes(1);
});

it('follows the keys: 1 8 . 4 0 is −$18.40, and +/− makes it income', async () => {
  await showSheet();
  await ready();
  await type('1', '8', '.', '4', '0');
  expect(screen.getByLabelText('−$18.40')).toBeTruthy();
  await key('Expense or income');
  expect(screen.getByLabelText('+$18.40')).toBeTruthy();
});

it('picking a payee fills in its last category, marked Suggested', async () => {
  await showSheet();
  await ready();
  await pickPayee('Cor', 'Corner Shop');
  expect(screen.getByLabelText('Payee').props.value).toBe('Corner Shop');
  expect(screen.getByText('Groceries')).toBeTruthy();
  expect(screen.getByText('Suggested')).toBeTruthy();
});

it('keeps a category chosen by hand when a payee is picked after it', async () => {
  await showSheet();
  await ready();
  await fireEvent.press(screen.getByRole('button', { name: 'No category, choose one' }));
  expect(screen.getByText('Choose a category')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Dining out, −$28.10' }));
  await pickPayee('Cor', 'Corner Shop');
  expect(screen.getByText('Dining out')).toBeTruthy();
  expect(screen.getByText('Change')).toBeTruthy();
  expect(screen.queryByText('Suggested')).toBeNull();
});

it('lists the plan’s categories with their balances, after No category', async () => {
  await showSheet();
  await ready();
  await fireEvent.press(screen.getByRole('button', { name: 'No category, choose one' }));
  expect(screen.getByRole('button', { name: 'No category' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Groceries, $207.62' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Rent, $0.00' })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
  expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
});

it('offers the income categories for income', async () => {
  await showSheet();
  await ready();
  await key('Expense or income');
  await fireEvent.press(screen.getByRole('button', { name: 'No category, choose one' }));
  expect(screen.getByRole('button', { name: 'Salary' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Groceries, $207.62' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Salary' }));
  expect(screen.getByText('Salary')).toBeTruthy();
  expect(screen.queryByTestId('bite-bar')).toBeNull();
});

it('shows what will be left when the amount fits', async () => {
  await showSheet();
  await ready();
  await pickPayee('Cor', 'Corner Shop');
  await type('1', '8', '.', '4', '0');
  expect(screen.getByTestId('bite-bar')).toBeTruthy();
  expect(screen.getByText('$207.62')).toBeTruthy();
  expect(screen.getByText('$189.22 after')).toBeTruthy();
});

it('warns when the amount is more than the category has', async () => {
  await showSheet();
  await ready();
  await fireEvent.press(screen.getByRole('button', { name: 'No category, choose one' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Electricity, $120.00' }));
  await type('1', '5', '0');
  expect(screen.getByText('That is $30.00 more than Electricity has', { includeHiddenElements: true })).toBeTruthy();
  expect(screen.getByText('−$30.00 after')).toBeTruthy();
});

it('shows the category without the bite for a date in an earlier month', async () => {
  const nov1 = new Date(2026, 10, 1, 12);
  setPlanToday(nov1);
  await showSheet();
  await ready();
  await pickPayee('Cor', 'Corner Shop');
  await type('5');
  expect(screen.getByTestId('bite-bar')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Earlier day' }));
  expect(screen.getByLabelText('Date, Yesterday')).toBeTruthy();
  expect(screen.getByText('Groceries')).toBeTruthy();
  expect(screen.queryByTestId('bite-bar')).toBeNull();
  expect(screen.queryByText('$207.62')).toBeNull();
});

it('follows the Plan into the next day when left open past midnight, keeping the draft and its date', async () => {
  const getQuickAddLists = jest.fn(async () => fakeQuickAddLists);
  const getPlanMonth = jest.fn(async () => fakePlanMonth);
  await showSheet(fakeEngine({ getQuickAddLists, getPlanMonth }));
  await ready();
  await type('1', '8');
  const later = () => screen.getByRole('button', { name: 'Later day' });
  expect(screen.getByLabelText('Date, Today')).toBeTruthy();
  expect(later().props.accessibilityState).toMatchObject({ disabled: true });
  // The Plan renews its day (the app came back to the foreground after midnight).
  await act(async () => setPlanToday(new Date(2026, 10, 20, 0, 5)));
  expect(screen.getByLabelText('Date, Yesterday')).toBeTruthy();
  expect(later().props.accessibilityState).toMatchObject({ disabled: false });
  expect(screen.getByLabelText('−$18.00')).toBeTruthy();
  expect(getQuickAddLists).toHaveBeenCalledTimes(1);
  expect(getPlanMonth).toHaveBeenCalledTimes(1);
  await fireEvent.press(later());
  expect(screen.getByLabelText('Date, Today')).toBeTruthy();
});

it('keeps its day while the Plan is between days (its day is briefly unset)', async () => {
  await showSheet();
  await ready();
  mockRedirect.mockClear(); // the session's own opening redirects first; only what follows counts
  await act(async () => setPlanToday(null));
  expect(mockRedirect).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Date, Today')).toBeTruthy();
});

it('changes the account from the account picker', async () => {
  await showSheet();
  await ready();
  await fireEvent.press(screen.getByRole('button', { name: 'Account, Everyday Checking' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Travel Card' }));
  expect(screen.getByRole('button', { name: 'Account, Travel Card' })).toBeTruthy();
});

it('cannot save $0.00', async () => {
  await showSheet();
  await ready();
  expect(save().props.accessibilityState).toMatchObject({ disabled: true });
  await type('5');
  expect(save().props.accessibilityState).toMatchObject({ disabled: false });
});

it('saves the transaction to the account, then goes back to the Plan', async () => {
  const addTransaction = jest.fn(async (_account: string, _t: NewTransaction) => {});
  await showSheet(fakeEngine({ addTransaction }));
  await ready();
  await type('1', '8', '.', '4', '0');
  await pickPayee('Cor', 'Corner Shop');
  await fireEvent.press(screen.getByRole('button', { name: 'Earlier day' }));
  await fireEvent.press(save());
  await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
  expect(addTransaction).toHaveBeenCalledTimes(1);
  expect(addTransaction).toHaveBeenCalledWith('acct-checking', {
    date: '2026-11-18',
    amount: -1840,
    cleared: false,
    category: 'cat-groceries',
    payee: 'payee-corner-shop',
  });
});

it('sends an existing payee’s id when its name is typed rather than picked', async () => {
  const addTransaction = jest.fn(async (_account: string, _t: NewTransaction) => {});
  await showSheet(fakeEngine({ addTransaction }));
  await ready();
  await type('7');
  await fireEvent.changeText(screen.getByLabelText('Payee'), ' noodle bar ');
  await fireEvent.press(save());
  await waitFor(() => expect(router.back).toHaveBeenCalled());
  expect(addTransaction).toHaveBeenCalledWith('acct-checking', { date: '2026-11-19', amount: -700, cleared: false, payee: 'payee-noodle-bar' });
});

it('saves only once, however often Save is pressed', async () => {
  let finish!: () => void;
  const addTransaction = jest.fn(() => new Promise<void>(resolve => (finish = resolve)));
  await showSheet(fakeEngine({ addTransaction }));
  await ready();
  await type('5');
  // Both presses land on the enabled Save, before React re-renders it disabled: only the
  // hook's own guard can stop the second.
  const button = save();
  await act(async () => {
    void fireEvent.press(button);
    void fireEvent.press(button);
  });
  expect(save().props.accessibilityState).toMatchObject({ disabled: true });
  await act(async () => finish());
  expect(addTransaction).toHaveBeenCalledTimes(1);
  expect(router.back).toHaveBeenCalledTimes(1);
});

it('cannot be cancelled while the save is in flight', async () => {
  let finish!: () => void;
  const addTransaction = jest.fn(() => new Promise<void>(resolve => (finish = resolve)));
  await showSheet(fakeEngine({ addTransaction }));
  await ready();
  await type('5');
  await fireEvent.press(save());
  const cancel = screen.getByRole('button', { name: 'Cancel' });
  expect(cancel.props.accessibilityState).toMatchObject({ disabled: true });
  await fireEvent.press(cancel);
  expect(router.back).not.toHaveBeenCalled();
  await act(async () => finish());
  expect(router.back).toHaveBeenCalledTimes(1);
});

it('still tells the Plan, and does not navigate, when the sheet was dismissed before the write finished', async () => {
  let finish!: () => void;
  const addTransaction = jest.fn(() => new Promise<void>(resolve => (finish = resolve)));
  const saved = jest.fn();
  const stop = onSaved(saved);
  await showSheet(fakeEngine({ addTransaction }));
  await ready();
  await type('5');
  await fireEvent.press(save());
  // Swiped down, or the back button: the router removes the sheet.
  await screen.unmount();
  await act(async () => finish());
  expect(saved).toHaveBeenCalledTimes(1);
  expect(router.back).not.toHaveBeenCalled();
  stop();
});

it('says so in an alert when the write fails after the sheet was dismissed', async () => {
  let fail!: (e: Error) => void;
  const addTransaction = jest.fn(() => new Promise<void>((_resolve, reject) => (fail = reject)));
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const saved = jest.fn();
  const stop = onSaved(saved);
  await showSheet(fakeEngine({ addTransaction }));
  await ready();
  await type('5');
  await fireEvent.press(save());
  await screen.unmount();
  await act(async () => fail(new Error('disk full')));
  expect(alert).toHaveBeenCalledWith('Not saved', 'Could not save that transaction. Add it again.');
  expect(saved).not.toHaveBeenCalled();
  expect(router.back).not.toHaveBeenCalled();
  stop();
  alert.mockRestore();
});

it('stays open with a message, and keeps the form, when the save fails', async () => {
  const addTransaction = jest.fn(async () => {
    throw new Error('disk full');
  });
  await showSheet(fakeEngine({ addTransaction }));
  await ready();
  await type('1', '8', '.', '4', '0');
  await pickPayee('Cor', 'Corner Shop');
  await fireEvent.press(save());
  expect(await screen.findByText('Could not save that. Try again.')).toBeTruthy();
  expect(router.back).not.toHaveBeenCalled();
  expect(screen.getByLabelText('−$18.40')).toBeTruthy();
  expect(screen.getByLabelText('Payee').props.value).toBe('Corner Shop');
  expect(save().props.accessibilityState).toMatchObject({ disabled: false });
});

it('closes without saving on Cancel', async () => {
  const addTransaction = jest.fn(async () => {});
  await showSheet(fakeEngine({ addTransaction }));
  await ready();
  await type('5');
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
  expect(router.back).toHaveBeenCalledTimes(1);
  expect(addTransaction).not.toHaveBeenCalled();
});

it('puts the keypad away while the payee field has the keyboard', async () => {
  await showSheet();
  await ready();
  await fireEvent(screen.getByLabelText('Payee'), 'focus');
  expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  await fireEvent(screen.getByLabelText('Payee'), 'blur');
  expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
});

it('moves the form clear of the keyboard on Android too (it draws edge to edge, so its window does not shrink)', async () => {
  const os = jest.replaceProperty(Platform, 'OS', 'android');
  try {
    await showSheet();
    await ready();
    // With behavior "padding" the form carries a bottom padding that follows the keyboard (0 while it is down).
    expect(StyleSheet.flatten(screen.getByTestId('sheet-form').props.style)).toHaveProperty('paddingBottom', 0);
  } finally {
    os.restore();
  }
});

describe('fitting the screen', () => {
  const original = Dimensions.get('window');
  const windowOf = (width: number, height: number) => {
    const window = { ...original, width, height, fontScale: 1 };
    Dimensions.set({ window, screen: window });
  };
  afterEach(() => Dimensions.set({ window: original, screen: original }));
  const flat = (style: unknown) => (StyleSheet.flatten([style].flat(Infinity) as object[]) ?? {}) as Record<string, unknown>;
  const keyHeight = () => flat(screen.getByRole('button', { name: '1' }).props.style).minHeight;

  it('is compact on a 360 × 640 phone: touch-size keys, the smaller amount, tighter gaps', async () => {
    windowOf(360, 640);
    await showSheet();
    await ready();
    expect(keyHeight()).toBe(sheetTokens.compact.key);
    expect(screen.getByTestId('amount-display')).toHaveStyle({ height: sheetTokens.compact.amountBox });
    expect(flat(screen.getByTestId('sheet-scroll').props.contentContainerStyle).gap).toBe(sheetTokens.compact.gap);
  });

  it('is regular, as before, on a 411 × 914 phone', async () => {
    windowOf(411, 914);
    await showSheet();
    await ready();
    expect(keyHeight()).toBe(sheetTokens.regular.key);
    expect(screen.getByTestId('amount-display')).toHaveStyle({ height: sheetTokens.regular.amountBox });
    expect(flat(screen.getByTestId('sheet-scroll').props.contentContainerStyle).gap).toBe(sheetTokens.regular.gap);
  });

  it('fades the bottom of the form while more of it is below, and not once scrolled to the end', async () => {
    windowOf(360, 640);
    await showSheet();
    await ready();
    const scroll = screen.getByTestId('sheet-scroll');
    expect(screen.queryByTestId('more-below')).toBeNull();
    await fireEvent(scroll, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 300 } } });
    await fireEvent(scroll, 'contentSizeChange', 360, 360);
    expect(screen.getByTestId('more-below')).toBeTruthy();
    await fireEvent.scroll(scroll, {
      nativeEvent: { contentOffset: { x: 0, y: 60 }, contentSize: { width: 360, height: 360 }, layoutMeasurement: { width: 360, height: 300 } },
    });
    expect(screen.queryByTestId('more-below')).toBeNull();
  });

  it('draws no fade when the form fits', async () => {
    windowOf(411, 914);
    await showSheet();
    await ready();
    const scroll = screen.getByTestId('sheet-scroll');
    await fireEvent(scroll, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 411, height: 500 } } });
    await fireEvent(scroll, 'contentSizeChange', 411, 420);
    expect(screen.queryByTestId('more-below')).toBeNull();
  });
});

it('says to add an account first when there is no open on-budget account, with no keypad', async () => {
  await showSheet(fakeEngine({ getQuickAddLists: async () => ({ ...fakeQuickAddLists, accounts: [], lastAccountId: null }) }));
  expect(await screen.findByText('Add an account in Actual first.')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
  expect(router.back).toHaveBeenCalledTimes(1);
});

it('says so, and tries again, when the lists cannot be read', async () => {
  const getPlanMonth = jest
    .fn<Promise<PlanMonth>, [string]>()
    .mockRejectedValueOnce(new Error('x'))
    .mockResolvedValue(fakePlanMonth);
  await showSheet(fakeEngine({ getPlanMonth }));
  expect(await screen.findByText('Could not read this budget.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
  expect(await ready()).toBeTruthy();
});

it('sends a deep link with no open budget to the Plan', async () => {
  await render(<SessionProvider create={async () => fakeEngine()}><Add /></SessionProvider>);
  await waitFor(() => expect(mockRedirect).toHaveBeenCalledWith('/'));
});

it('sends a deep link to the Plan when the budget is open but the Plan is not showing', async () => {
  setPlanToday(null);
  const getQuickAddLists = jest.fn(async () => fakeQuickAddLists);
  await showSheet(fakeEngine({ getQuickAddLists }));
  await waitFor(() => expect(mockRedirect).toHaveBeenCalledWith('/'));
  expect(getQuickAddLists).not.toHaveBeenCalled();
});
