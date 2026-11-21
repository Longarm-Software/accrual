import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import type { ReactNode } from 'react';

import { EngineError, READY } from '../engine/types';
import type { Engine, PlanMonth } from '../engine/types';
import { onSaved, setPlanShown, setPlanToday } from '../features/plan/planSignal';
import { fakeBudgets, fakeEngine, fakePlanMonth } from '../session/fakeEngine';
import { SessionProvider, useSession } from '../session/SessionProvider';
import { saveSession } from '../session/storage';
import { space } from '../theme/tokens';
import Cover from '../app/cover';

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

function OpenThen({ children }: { children: ReactNode }) {
  const session = useSession();
  useEffect(() => {
    if (session.status === 'closed') void session.open();
  }, [session]);
  return <>{children}</>;
}

async function showSheet(params: Record<string, unknown>, engine: Engine = fakeEngine()) {
  mockParams = params;
  await saveSession({ serverURL: 'https://budget.example.com', sessionToken: 'token-for-tests', budget: fakeBudgets[0] });
  await render(<SessionProvider create={async () => engine}><OpenThen><Cover /></OpenThen></SessionProvider>);
}

const flat = (style: unknown) => (StyleSheet.flatten([style].flat(Infinity) as object[]) ?? {}) as Record<string, unknown>;
const source = (name: string) => screen.getAllByRole('radio').find(r => String(r.props.accessibilityLabel).startsWith(`${name},`))!;
const checked = (name: string) => source(name).props.accessibilityState.checked;

/** Ready to budget has only $10.00; Electricity ($120.00) is the first category that can cover all of it. */
const shortReady: PlanMonth = { ...fakePlanMonth, toBudget: 1000 };

it('opens with the target, the sources and Ready to budget chosen', async () => {
  await showSheet({ category: 'cat-dining' });
  expect(await screen.findByRole('header', { name: 'Cover Dining out' })).toBeTruthy();
  expect(screen.getByText('Take $28.10 from')).toBeTruthy();
  expect(screen.getByTestId('cover-target')).toBeTruthy();
  expect(screen.getByText('$0.00 after')).toBeTruthy();
  expect(screen.getByTestId('cover-sources').props.accessibilityRole).toBe('radiogroup');
  expect(checked('Ready to budget')).toBe(true);
  expect(checked('Groceries')).toBe(false);
  expect(screen.getByRole('button', { name: 'Cover $28.10' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
});

it('preselects the first category that can cover it all when Ready to budget cannot', async () => {
  await showSheet({ category: 'cat-dining' }, fakeEngine({ getPlanMonth: async () => shortReady }));
  await screen.findByRole('header', { name: 'Cover Dining out' });
  expect(checked('Electricity')).toBe(true);
});

it('choosing a source that cannot cover it all says how much it will', async () => {
  await showSheet({ category: 'cat-dining' }, fakeEngine({ getPlanMonth: async () => shortReady }));
  await screen.findByRole('header', { name: 'Cover Dining out' });
  await fireEvent.press(source('Ready to budget'));
  expect(checked('Ready to budget')).toBe(true);
  expect(checked('Electricity')).toBe(false);
  expect(screen.getByRole('button', { name: 'Cover $10.00 of $28.10' })).toBeTruthy();
  // The target only gets part of the way: still below zero after.
  expect(screen.getByText('−$18.10 after')).toBeTruthy();
});

it('choosing another source moves the choice and the button with it', async () => {
  await showSheet({ category: 'cat-dining' });
  await screen.findByRole('header', { name: 'Cover Dining out' });
  await fireEvent.press(source('Groceries'));
  expect(checked('Groceries')).toBe(true);
  expect(checked('Ready to budget')).toBe(false);
  expect(screen.getByRole('button', { name: 'Cover $28.10' })).toBeTruthy();
});

it('covers from the chosen source, then goes back to the Plan and tells it', async () => {
  const coverOverspending = jest.fn(async () => {});
  const saved = jest.fn();
  const stop = onSaved(saved);
  await showSheet({ category: 'cat-dining' }, fakeEngine({ coverOverspending, getPlanMonth: async () => shortReady }));
  await screen.findByRole('header', { name: 'Cover Dining out' });
  await fireEvent.press(source('Ready to budget'));
  await fireEvent.press(screen.getByRole('button', { name: 'Cover $10.00 of $28.10' }));
  await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
  expect(coverOverspending).toHaveBeenCalledWith({
    month: '2026-11', category: 'cat-dining', from: READY, amount: 1000, seen: { category: -2810, from: 1000 },
  });
  expect(saved).toHaveBeenCalledTimes(1);
  stop();
});

it('covers only once, and Cancel is off while it does', async () => {
  let finish!: () => void;
  const coverOverspending = jest.fn(() => new Promise<void>(resolve => (finish = resolve)));
  await showSheet({ category: 'cat-dining' }, fakeEngine({ coverOverspending }));
  const button = await screen.findByRole('button', { name: 'Cover $28.10' });
  await fireEvent.press(button);
  await fireEvent.press(button);
  expect(coverOverspending).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Cancel' }).props.accessibilityState).toMatchObject({ disabled: true });
  await act(async () => finish());
});

it('stays open with a message, and keeps the choice, when the write fails', async () => {
  const coverOverspending = jest.fn(async () => {
    throw new EngineError('invalid-move', 'x');
  });
  await showSheet({ category: 'cat-dining' }, fakeEngine({ coverOverspending }));
  await screen.findByRole('header', { name: 'Cover Dining out' });
  await fireEvent.press(source('Groceries'));
  await fireEvent.press(screen.getByRole('button', { name: 'Cover $28.10' }));
  expect(await screen.findByText('Could not do that. Try again.')).toBeTruthy();
  expect(checked('Groceries')).toBe(true);
  expect(router.back).not.toHaveBeenCalled();
});

it('reads the plan again when the budget changed under it, and keeps the choice', async () => {
  const getPlanMonth = jest.fn<Promise<PlanMonth>, [string]>().mockResolvedValueOnce(fakePlanMonth).mockResolvedValue(shortReady);
  const coverOverspending = jest.fn(async () => {
    throw new EngineError('stale', 'x');
  });
  await showSheet({ category: 'cat-dining' }, fakeEngine({ coverOverspending, getPlanMonth }));
  await screen.findByRole('header', { name: 'Cover Dining out' });
  await fireEvent.press(source('Groceries'));
  await fireEvent.press(screen.getByRole('button', { name: 'Cover $28.10' }));
  expect(await screen.findByText('That changed while you were here. Check the numbers and try again.')).toBeTruthy();
  expect(getPlanMonth).toHaveBeenCalledTimes(2);
  expect(checked('Groceries')).toBe(true);
  expect(source('Ready to budget').props.accessibilityLabel).toMatch(/^Ready to budget, \$10\.00 now/);
});

it('puts a failed cover\'s message just above the button, where it is seen, not at the end of the list', async () => {
  const coverOverspending = jest.fn(async () => {
    throw new EngineError('invalid-move', 'x');
  });
  await showSheet({ category: 'cat-dining' }, fakeEngine({ coverOverspending }));
  await fireEvent.press(await screen.findByRole('button', { name: 'Cover $28.10' }));
  await screen.findByText('Could not do that. Try again.');
  expect(within(screen.getByTestId('cover-footer')).getByText('Could not do that. Try again.')).toBeTruthy();
});

it('says the category is already covered when, read again, it is no longer overspent, with a way back', async () => {
  const [bills, everyday, goals] = fakePlanMonth.groups;
  const covered: PlanMonth = {
    ...fakePlanMonth,
    groups: [bills, { ...everyday, categories: [everyday.categories[0], { ...everyday.categories[1], balance: 0 }] }, goals],
  };
  const getPlanMonth = jest.fn<Promise<PlanMonth>, [string]>().mockResolvedValueOnce(fakePlanMonth).mockResolvedValue(covered);
  const coverOverspending = jest.fn(async () => {
    throw new EngineError('stale', 'x');
  });
  await showSheet({ category: 'cat-dining' }, fakeEngine({ coverOverspending, getPlanMonth }));
  const button = await screen.findByRole('button', { name: 'Cover $28.10' });
  // (Redirects before this are the route's own, rendered while the test's session opens.)
  jest.mocked(router.dismissTo).mockClear();
  await fireEvent.press(button);
  expect(await screen.findByText('Dining out is already covered.')).toBeTruthy();
  expect(router.dismissTo).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
  expect(router.back).toHaveBeenCalledTimes(1);
});

it('keeps the button clear of the navigation bar', async () => {
  await showSheet({ category: 'cat-dining' });
  await screen.findByRole('header', { name: 'Cover Dining out' });
  expect(flat(screen.getByTestId('cover-footer').props.style).paddingBottom).toBe(space.lg + 48);
});

describe('sending a sheet with nothing to act on back to the Plan', () => {
  it('a category that is not overspent', async () => {
    await showSheet({ category: 'cat-groceries' });
    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/'));
    expect(mockRedirect).not.toHaveBeenCalledWith('/');
    expect(screen.queryByRole('radio')).toBeNull();
  });
  it('a link with no category', async () => {
    await showSheet({ category: 'a/b' });
    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/'));
  });
  it('a past month', async () => {
    setPlanShown({ month: '2026-10', plan: { ...fakePlanMonth, month: '2026-10' } });
    await showSheet({ category: 'cat-dining' });
    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/'));
  });
  it('no Plan showing', async () => {
    setPlanToday(null);
    await showSheet({ category: 'cat-dining' });
    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/'));
  });
});
