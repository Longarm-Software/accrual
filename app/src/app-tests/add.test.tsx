import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { useEffect } from 'react';

import type { Engine, NewTransaction, PlanMonth } from '../engine/types';
import { setPlanToday } from '../features/plan/quickAddSignal';
import { fakeBudgets, fakeEngine, fakePlanMonth, fakeQuickAddLists } from '../session/fakeEngine';
import { SessionProvider, useSession } from '../session/SessionProvider';
import { saveSession } from '../session/storage';
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
  await fireEvent.press(save());
  await fireEvent.press(save());
  expect(save().props.accessibilityState).toMatchObject({ disabled: true });
  await act(async () => finish());
  expect(addTransaction).toHaveBeenCalledTimes(1);
  expect(router.back).toHaveBeenCalledTimes(1);
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
