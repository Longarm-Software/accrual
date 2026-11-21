import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';

import { EngineError } from '../engine/types';
import type { ActivityRow, Engine, PlanMonth } from '../engine/types';
import { announceSaved, setPlanShown, setPlanToday } from '../features/plan/planSignal';
import { fakeBudgets, fakeEngine, fakePlanMonth } from '../session/fakeEngine';
import { SessionProvider, useSession } from '../session/SessionProvider';
import { saveSession } from '../session/storage';
import { space } from '../theme/tokens';
import Category from '../app/category/[id]';

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

beforeEach(() => {
  (SecureStore as any).__reset();
  jest.clearAllMocks();
  setPlanToday(nov19);
  setPlanShown({ month: '2026-11', plan: fakePlanMonth });
});

afterEach(() => {
  setPlanToday(null);
  setPlanShown(null);
});

function OpenThenCategory() {
  const session = useSession();
  useEffect(() => {
    if (session.status === 'closed') void session.open();
  }, [session]);
  return <Category />;
}

async function showCategory(id: string, engine: Engine = fakeEngine()) {
  mockParams = { id };
  await saveSession({ serverURL: 'https://budget.example.com', sessionToken: 'token-for-tests', budget: fakeBudgets[0] });
  await render(<SessionProvider create={async () => engine}><OpenThenCategory /></SessionProvider>);
}

const flat = (style: unknown) => (StyleSheet.flatten([style].flat(Infinity) as object[]) ?? {}) as Record<string, unknown>;

it('shows a back control, the name, the month, the balance and its note, and how it came about', async () => {
  await showCategory('cat-dining');
  expect(await screen.findByRole('header', { name: 'Dining out' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();
  expect(screen.getByText('November 2026')).toBeTruthy();
  expect(screen.getByLabelText('Dining out, overspent by $28.10')).toBeTruthy();
  expect(screen.getByText('Overspent')).toBeTruthy();
  expect(screen.getByLabelText('Budgeted, $220.00')).toBeTruthy();
  expect(screen.getByLabelText('Spent, −$248.10')).toBeTruthy();
  expect(screen.getByLabelText('Left, −$28.10')).toBeTruthy();
});

it('goes back to the Plan from the back control', async () => {
  await showCategory('cat-dining');
  await fireEvent.press(await screen.findByRole('button', { name: 'Back' }));
  expect(router.back).toHaveBeenCalledTimes(1);
});

it('offers Cover for an overspent category', async () => {
  await showCategory('cat-dining');
  await fireEvent.press(await screen.findByRole('button', { name: 'Cover' }));
  expect(router.push).toHaveBeenCalledWith('/cover?category=cat-dining');
  expect(screen.queryByRole('button', { name: 'Move money' })).toBeNull();
});

it('offers Move money for a healthy category', async () => {
  await showCategory('cat-groceries');
  await fireEvent.press(await screen.findByRole('button', { name: 'Move money' }));
  expect(router.push).toHaveBeenCalledWith('/move?from=cat-groceries');
  expect(screen.queryByRole('button', { name: 'Cover' })).toBeNull();
});

it('lists this month’s transactions, newest first, under This month', async () => {
  const getCategoryActivity = jest.fn(fakeEngine().getCategoryActivity);
  await showCategory('cat-dining', fakeEngine({ getCategoryActivity }));
  expect(await screen.findByText('This month')).toBeTruthy();
  const rows = await screen.findAllByTestId('activity-row');
  expect(rows).toHaveLength(4);
  expect(rows[0].props.accessibilityLabel).toMatch(/^Noodle Bar, −\$42\.10/);
  expect(getCategoryActivity).toHaveBeenCalledWith('cat-dining', '2026-11');
});

it('says so when nothing has been spent here', async () => {
  await showCategory('cat-groceries');
  expect(await screen.findByText('Nothing spent here yet.')).toBeTruthy();
});

it('says so when the category is not in this month’s plan, with a way back', async () => {
  await showCategory('cat-nope');
  expect(await screen.findByText('This category is not in this budget.')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Cover' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
  expect(router.back).toHaveBeenCalled();
});

it('treats a malformed id as not in this budget', async () => {
  await showCategory('../x');
  expect(await screen.findByText('This category is not in this budget.')).toBeTruthy();
});

it('keeps the header and rows when the transactions cannot be read, and tries again', async () => {
  const getCategoryActivity = jest
    .fn<Promise<ActivityRow[]>, [string, string]>()
    .mockRejectedValueOnce(new EngineError('internal', 'x'))
    .mockResolvedValue([]);
  await showCategory('cat-groceries', fakeEngine({ getCategoryActivity }));
  expect(await screen.findByText('Could not read this category.')).toBeTruthy();
  expect(screen.getByRole('header', { name: 'Groceries' })).toBeTruthy();
  expect(screen.getByLabelText('Budgeted, $720.00')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('Nothing spent here yet.')).toBeTruthy();
  expect(getCategoryActivity).toHaveBeenCalledTimes(2);
});

it('shows a past month read-only, with its name over the transactions', async () => {
  setPlanShown({ month: '2026-10', plan: { ...fakePlanMonth, month: '2026-10' } });
  await showCategory('cat-dining');
  expect(await screen.findByText('October 2026')).toBeTruthy();
  expect(screen.getByText('October')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Cover' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Move money' })).toBeNull();
});

it('shows the Plan’s new numbers after a change, and reads the transactions once per change, not per render', async () => {
  const getCategoryActivity = jest.fn(fakeEngine().getCategoryActivity);
  const getPlanMonth = jest.fn(async () => fakePlanMonth);
  await showCategory('cat-dining', fakeEngine({ getCategoryActivity, getPlanMonth }));
  await screen.findAllByTestId('activity-row');
  expect(getCategoryActivity).toHaveBeenCalledTimes(1);
  // A save elsewhere does not make this screen read the month itself: the Plan does, and publishes it.
  await act(async () => announceSaved());
  expect(getPlanMonth).not.toHaveBeenCalled();
  const [bills, everyday, goals] = fakePlanMonth.groups;
  const covered: PlanMonth = {
    ...fakePlanMonth,
    toBudget: 28390,
    groups: [bills, { ...everyday, categories: [everyday.categories[0], { ...everyday.categories[1], budgeted: 24810, balance: 0 }] }, goals],
  };
  await act(async () => setPlanShown({ month: '2026-11', plan: covered }));
  expect(await screen.findByLabelText('Left, $0.00')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Move money' })).toBeTruthy();
  await waitFor(() => expect(getCategoryActivity).toHaveBeenCalledTimes(2));
  await act(async () => {});
  expect(getCategoryActivity).toHaveBeenCalledTimes(2);
});

it('keeps its month’s numbers when the Plan moves to another month under it', async () => {
  await showCategory('cat-dining');
  await screen.findByText('Overspent');
  await act(async () => setPlanShown({ month: '2026-12', plan: null }));
  expect(screen.getByText('November 2026')).toBeTruthy();
  expect(screen.getByText('Overspent')).toBeTruthy();
});

it('scrolls clear of the navigation bar', async () => {
  await showCategory('cat-dining');
  await screen.findByText('Overspent');
  expect(flat(screen.getByTestId('category-scroll').props.contentContainerStyle).paddingBottom).toBe(space.xl + 48);
});

it('sends a deep link to the Plan when the Plan is not showing', async () => {
  setPlanShown(null);
  const getCategoryActivity = jest.fn(async () => []);
  await showCategory('cat-dining', fakeEngine({ getCategoryActivity }));
  await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/'));
  expect(getCategoryActivity).not.toHaveBeenCalled();
});

it('sends a deep link with no open budget to the Plan', async () => {
  mockParams = { id: 'cat-dining' };
  await render(<SessionProvider create={async () => fakeEngine()}><Category /></SessionProvider>);
  await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/'));
});
