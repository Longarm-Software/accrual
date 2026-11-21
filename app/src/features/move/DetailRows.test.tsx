import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { amount, themes } from '../../theme/tokens';
import type { DetailRow } from './categoryDetail';
import { DetailRows } from './DetailRows';

jest.mock('../../theme/useTheme', () => ({ useTheme: () => jest.requireActual('../../theme/tokens').themes.dark }));

const rows: DetailRow[] = [
  { label: 'Budgeted', amount: 30000, tone: 'plain' },
  { label: 'Spent', amount: -32810, tone: 'plain' },
  { label: 'Carried in', amount: -1000, tone: 'over' },
  { label: 'Left', amount: -3810, tone: 'mute' },
];

it('one row per label and amount, each read as one element', async () => {
  await render(<DetailRows rows={rows} />);
  for (const name of ['Budgeted, $300.00', 'Spent, −$328.10', 'Carried in, −$10.00', 'Left, −$38.10']) {
    expect(screen.getByLabelText(name)).toBeTruthy();
  }
  expect(screen.getByText('Budgeted')).toBeTruthy();
  expect(screen.getByText('$300')).toBeTruthy();
});

it('colours each amount by its tone', async () => {
  await render(<DetailRows rows={rows} />);
  const amountOf = (label: string) => screen.getByTestId(`detail-amount-${label}`);
  expect(amountOf('Budgeted')).toHaveStyle({ color: themes.dark.color.ink });
  expect(amountOf('Carried in')).toHaveStyle({ color: themes.dark.color.over });
  expect(amountOf('Left')).toHaveStyle({ color: themes.dark.color.mute });
});

it('draws amounts at the row size, and the last row a size larger after a hairline', async () => {
  await render(<DetailRows rows={rows} />);
  const amountOf = (label: string) => screen.getByTestId(`detail-amount-${label}`);
  expect(amountOf('Spent')).toHaveStyle({ fontSize: amount.row });
  expect(amountOf('Left')).toHaveStyle({ fontSize: amount.tileLong });
  expect(amount.tileLong).toBeGreaterThan(amount.row);
  expect(screen.getByTestId('detail-Left')).toHaveStyle({ borderTopWidth: StyleSheet.hairlineWidth });
  expect(screen.getByTestId('detail-Spent')).not.toHaveStyle({ borderTopWidth: StyleSheet.hairlineWidth });
});
