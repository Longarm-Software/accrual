import { fireEvent, render, screen } from '@testing-library/react-native';

import { size, themes, tint, withAlpha } from '../../theme/tokens';
import { bite, type Bite } from '../quickAdd/bite';
import { PotCard } from './PotCard';
import { gain, type Gain } from './pots';

// The design is dark; Jest's colour scheme is light. Draw dark so the colours checked are the design's.
jest.mock('../../theme/useTheme', () => ({ useTheme: () => jest.requireActual('../../theme/tokens').themes.dark }));

const groceries = { name: 'Groceries', balance: 20762 };
const coffee = { name: 'Coffee', balance: 1350 };
const trip = { id: 'cat-trip', name: 'Summer trip', has: 115000 };

const draw = (props: { label?: 'From' | 'To'; name: string | null; bar: Bite | Gain | null }) => {
  const onPress = jest.fn();
  return render(<PotCard label={props.label ?? 'From'} name={props.name} bar={props.bar} onPress={onPress} />).then(() => onPress);
};

it('with no pot: the label, Choose, and no bar', async () => {
  await draw({ label: 'To', name: null, bar: null });
  expect(screen.getByText('TO')).toBeTruthy();
  expect(screen.getByText('Choose')).toBeTruthy();
  expect(screen.queryByText('Change')).toBeNull();
  expect(screen.queryByTestId('bite-bar')).toBeNull();
  expect(screen.getByRole('button', { name: 'To: none chosen, choose one' })).toBeTruthy();
});

it('a bite that fits: the name, Change, the bar, before and a mint after', async () => {
  await draw({ name: 'Groceries', bar: bite(groceries, 5000) });
  expect(screen.getByText('FROM')).toBeTruthy();
  expect(screen.getByText('Groceries')).toBeTruthy();
  expect(screen.getByText('Change')).toBeTruthy();
  expect(screen.getByTestId('bite-taken')).toBeTruthy();
  expect(screen.getByText('$207.62')).toBeTruthy();
  expect(screen.getByText('$157.62 after')).toHaveStyle({ color: themes.dark.color.ok });
  expect(screen.queryByText(/more than/)).toBeNull();
  expect(screen.getByRole('button', { name: 'From: Groceries, $207.62 now, $157.62 after' })).toBeTruthy();
});

it('a bite that is over: coral after, a coral edge, and the warning under the card', async () => {
  await draw({ name: 'Coffee', bar: bite(coffee, 1840) });
  expect(screen.getByText('−$4.90 after')).toHaveStyle({ color: themes.dark.color.over });
  expect(screen.getByTestId('pot-card')).toHaveStyle({
    borderWidth: size.border,
    borderColor: withAlpha(themes.dark.color.over, tint.potOverEdge),
  });
  expect(screen.getByText('That is $4.90 more than Coffee has', { includeHiddenElements: true })).toBeTruthy();
  expect(
    screen.getByRole('button', { name: 'From: Coffee, $13.50 now, −$4.90 after. That is $4.90 more than Coffee has' }),
  ).toBeTruthy();
});

it('a gain: the bar draws the gain, a mint after, no warning and no coral edge', async () => {
  await draw({ label: 'To', name: 'Summer trip', bar: gain(trip, 5000) });
  expect(screen.getByTestId('bite-gained')).toBeTruthy();
  expect(screen.queryByTestId('bite-taken')).toBeNull();
  expect(screen.getByText('$1,150.00')).toBeTruthy();
  expect(screen.getByText('$1,200.00 after')).toHaveStyle({ color: themes.dark.color.ok });
  expect(screen.getByTestId('pot-card')).not.toHaveStyle({ borderColor: withAlpha(themes.dark.color.over, tint.potOverEdge) });
  expect(screen.getByRole('button', { name: 'To: Summer trip, $1,150.00 now, $1,200.00 after' })).toBeTruthy();
});

it('calls onPress when pressed', async () => {
  const onPress = await draw({ name: 'Groceries', bar: bite(groceries, 5000) });
  await fireEvent.press(screen.getByRole('button', { name: /Groceries/ }));
  expect(onPress).toHaveBeenCalledTimes(1);
});
