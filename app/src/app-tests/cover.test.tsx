import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import type { ReactNode } from 'react';

import { EngineError, READY } from '../engine/types';
import type { Engine, PlanMonth } from '../engine/types';
import { onSaved, setPlanShown, setPlanToday } from '../features/plan/planSignal';
import { fakeBudgets, fakeEngine, fakePlanMonth, withCategory } from '../session/fakeEngine';
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

const STALE = 'That changed while you were here. Check the numbers and try again.';

it('refuses a cover on figures that changed, reads again, keeps a choice that can still pay, and a retry goes through', async () => {
  const engine = fakeEngine();
  const getPlanMonth = jest.spyOn(engine, 'getPlanMonth');
  await showSheet({ category: 'cat-dining' }, engine);
  await screen.findByRole('header', { name: 'Cover Dining out' });
  await fireEvent.press(source('Groceries'));
  // Groceries still has more than $28.10, but not what the sheet showed.
  engine.elsewhere(plan => withCategory(plan, 'cat-groceries', { balance: 5000 }));
  await fireEvent.press(screen.getByRole('button', { name: 'Cover $28.10' }));
  expect(await screen.findByText(STALE)).toBeTruthy();
  expect(getPlanMonth).toHaveBeenCalledTimes(2);
  expect(checked('Groceries')).toBe(true);
  expect(source('Groceries').props.accessibilityLabel).toBe('Groceries, $50.00 now, $21.90 after');
  await fireEvent.press(screen.getByRole('button', { name: 'Cover $28.10' }));
  await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
  const after = (await engine.getPlanMonth('2026-11')).groups.flatMap(g => g.categories);
  expect(after.find(c => c.id === 'cat-dining')!.balance).toBe(0);
  expect(after.find(c => c.id === 'cat-groceries')!.balance).toBe(2190);
});

it('after a refusal, a chosen source that can no longer pay what the button said is not swapped for another: none is chosen', async () => {
  const engine = fakeEngine();
  const coverOverspending = jest.spyOn(engine, 'coverOverspending');
  await showSheet({ category: 'cat-dining' }, engine);
  await screen.findByRole('header', { name: 'Cover Dining out' });
  await fireEvent.press(source('Groceries'));
  engine.elsewhere(plan => withCategory(plan, 'cat-groceries', { balance: 1000 }));
  await fireEvent.press(screen.getByRole('button', { name: 'Cover $28.10' }));
  expect(await screen.findByText(STALE)).toBeTruthy();
  expect(screen.getAllByRole('radio').every(r => r.props.accessibilityState.checked === false)).toBe(true);
  const choose = screen.getByRole('button', { name: 'Choose where it comes from' });
  expect(choose.props.accessibilityState).toMatchObject({ disabled: true });
  await fireEvent.press(choose);
  expect(coverOverspending).toHaveBeenCalledTimes(1);
  await fireEvent.press(source('Ready to budget'));
  expect(screen.getByRole('button', { name: 'Cover $28.10' }).props.accessibilityState).toMatchObject({ disabled: false });
});

it('keeps the numbers on screen and the message when reading the budget again fails', async () => {
  const engine = fakeEngine();
  const read = engine.getPlanMonth;
  let readFails = false;
  engine.getPlanMonth = async month => {
    if (readFails) throw new Error('disk full');
    return read(month);
  };
  await showSheet({ category: 'cat-dining' }, engine);
  await screen.findByRole('header', { name: 'Cover Dining out' });
  engine.elsewhere(plan => ({ ...plan, toBudget: 1000 }));
  readFails = true;
  await fireEvent.press(screen.getByRole('button', { name: 'Cover $28.10' }));
  expect(await screen.findByText(STALE)).toBeTruthy();
  expect(source('Ready to budget').props.accessibilityLabel).toBe('Ready to budget, $312.00 now, $283.90 after');
  expect(checked('Ready to budget')).toBe(true);
});

it('freezes the sources while the cover is under way, and the button shows progress', async () => {
  let finish!: () => void;
  const coverOverspending = jest.fn(() => new Promise<void>(resolve => (finish = resolve)));
  await showSheet({ category: 'cat-dining' }, fakeEngine({ coverOverspending }));
  await fireEvent.press(await screen.findByRole('button', { name: 'Cover $28.10' }));
  expect(source('Groceries').props.accessibilityState).toMatchObject({ disabled: true, checked: false });
  await fireEvent.press(source('Groceries'));
  expect(checked('Groceries')).toBe(false);
  expect(checked('Ready to budget')).toBe(true);
  expect(within(screen.getByTestId('cover-footer')).getByLabelText('Working')).toBeTruthy();
  expect(coverOverspending).toHaveBeenCalledWith(expect.objectContaining({ from: READY, amount: 2810 }));
  await act(async () => finish());
});

it('writes nothing, and says so with a way back, when the month has ended while the sheet was open', async () => {
  const coverOverspending = jest.fn(async () => {});
  await showSheet({ category: 'cat-dining' }, fakeEngine({ coverOverspending }));
  const button = await screen.findByRole('button', { name: 'Cover $28.10' });
  await act(async () => setPlanToday(new Date(2026, 11, 1, 0, 5)));
  await fireEvent.press(button);
  expect(await screen.findByText('This month has ended. Changes to past months are not made here.')).toBeTruthy();
  expect(coverOverspending).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
  expect(router.back).toHaveBeenCalledTimes(1);
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
  const engine = fakeEngine();
  await showSheet({ category: 'cat-dining' }, engine);
  const button = await screen.findByRole('button', { name: 'Cover $28.10' });
  // (Redirects before this are the route's own, rendered while the test's session opens.)
  jest.mocked(router.dismissTo).mockClear();
  engine.elsewhere(plan => withCategory(plan, 'cat-dining', { balance: 0 }));
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
