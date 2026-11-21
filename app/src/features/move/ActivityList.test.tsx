import { render, screen, within } from '@testing-library/react-native';

import type { ActivityRow } from '../../engine/types';
import { themes } from '../../theme/tokens';
import { ActivityList } from './ActivityList';

jest.mock('../../theme/useTheme', () => ({ useTheme: () => jest.requireActual('../../theme/tokens').themes.dark }));

const today = new Date(2026, 10, 19);
const rows: ActivityRow[] = [
  { id: 't1', date: '2026-11-19', amount: -1840, payee: 'Corner Bakery', account: 'Everyday Checking', notes: null },
  { id: 't2', date: '2026-11-18', amount: 2500, payee: null, account: 'Everyday Checking', notes: null },
  { id: 't3', date: '2026-11-03', amount: -6420, payee: 'Fresh Market', account: 'Credit Card', notes: 'weekly shop' },
];

it('one row per transaction: payee, date and account, and the amount', async () => {
  await render(<ActivityList rows={rows} today={today} empty="Nothing spent here yet." />);
  expect(screen.getByText('Corner Bakery')).toBeTruthy();
  expect(screen.getByText('Today · Everyday Checking')).toBeTruthy();
  expect(screen.getByText('Yesterday · Everyday Checking')).toBeTruthy();
  expect(screen.getByText('Tue 3 Nov · Credit Card')).toBeTruthy();
  expect(screen.getByText('−$18')).toBeTruthy();
  expect(screen.getAllByTestId('activity-row')).toHaveLength(3);
  expect(screen.queryByText('Nothing spent here yet.')).toBeNull();
});

it('No payee when there is none', async () => {
  await render(<ActivityList rows={rows} today={today} empty="" />);
  expect(screen.getByText('No payee')).toBeTruthy();
});

it('money in is mint with a +; money out is ink', async () => {
  await render(<ActivityList rows={rows} today={today} empty="" />);
  expect(within(screen.getByTestId('activity-amount-t2')).getByText('+$25')).toBeTruthy();
  expect(screen.getByTestId('activity-amount-t2')).toHaveStyle({ color: themes.dark.color.ok });
  expect(screen.getByTestId('activity-amount-t1')).toHaveStyle({ color: themes.dark.color.ink });
  expect(within(screen.getByTestId('activity-amount-t1')).getByText('−$18')).toBeTruthy();
});

it('each row reads as one element', async () => {
  await render(<ActivityList rows={rows} today={today} empty="" />);
  expect(screen.getByLabelText('Corner Bakery, −$18.40, Today, Everyday Checking')).toBeTruthy();
  expect(screen.getByLabelText('No payee, +$25.00, Yesterday, Everyday Checking')).toBeTruthy();
});

it('the empty text when there are none', async () => {
  await render(<ActivityList rows={[]} today={today} empty="Nothing spent here yet." />);
  expect(screen.getByText('Nothing spent here yet.')).toBeTruthy();
  expect(screen.queryAllByTestId('activity-row')).toHaveLength(0);
});
