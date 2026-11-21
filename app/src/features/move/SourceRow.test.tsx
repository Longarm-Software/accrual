import { fireEvent, render, screen } from '@testing-library/react-native';

import { READY } from '../../engine/types';
import { size, themes } from '../../theme/tokens';
import { bite } from '../quickAdd/bite';
import type { Source } from './cover';
import { SourceRow } from './SourceRow';

jest.mock('../../theme/useTheme', () => ({ useTheme: () => jest.requireActual('../../theme/tokens').themes.dark }));

const ready: Source = {
  id: READY, name: 'Ready to budget', has: 31200, covers: 2810, enough: true,
  bite: bite({ name: 'Ready to budget', balance: 31200 }, 2810),
};
const coffee: Source = {
  id: 'cat-coffee', name: 'Coffee', has: 1350, covers: 1350, enough: false,
  bite: bite({ name: 'Coffee', balance: 1350 }, 1350),
};

const draw = (source: Source, selected: boolean) => {
  const onPress = jest.fn();
  return render(<SourceRow source={source} selected={selected} onPress={onPress} />).then(() => onPress);
};

it('shows the name, the bar with the bite, before and after', async () => {
  await draw(ready, false);
  expect(screen.getByText('Ready to budget')).toBeTruthy();
  expect(screen.getByTestId('bite-taken')).toBeTruthy();
  expect(screen.getByText('$312.00')).toBeTruthy();
  expect(screen.getByText('$283.90 after')).toHaveStyle({ color: themes.dark.color.ok });
  expect(screen.queryByText('not enough for all of it')).toBeNull();
});

it('selected: a checked radio, a filled check mark and the mint edge', async () => {
  await draw(ready, true);
  const row = screen.getByRole('radio', { name: 'Ready to budget, $312.00 now, $283.90 after' });
  expect(row.props.accessibilityState).toMatchObject({ checked: true });
  expect(screen.getByTestId('source-check-on')).toBeTruthy();
  expect(screen.getByTestId('source-card')).toHaveStyle({ borderWidth: size.border, borderColor: themes.dark.color.ok });
});

it('not selected: an unchecked radio, an empty check mark, no mint edge', async () => {
  await draw(ready, false);
  expect(screen.getByRole('radio').props.accessibilityState).toMatchObject({ checked: false });
  expect(screen.queryByTestId('source-check-on')).toBeNull();
  expect(screen.getByTestId('source-check-off')).toHaveStyle({ borderColor: themes.dark.color.control });
  expect(screen.getByTestId('source-card')).not.toHaveStyle({ borderColor: themes.dark.color.ok });
});

it('not enough: says so under its amounts, and can still be pressed', async () => {
  const onPress = await draw(coffee, false);
  expect(screen.getByText('not enough for all of it')).toBeTruthy();
  const row = screen.getByRole('radio', { name: 'Coffee, $13.50 now, $0.00 after, not enough for all of it' });
  await fireEvent.press(row);
  expect(onPress).toHaveBeenCalledTimes(1);
});

it('calls onPress when pressed', async () => {
  const onPress = await draw(ready, false);
  await fireEvent.press(screen.getByRole('radio'));
  expect(onPress).toHaveBeenCalledTimes(1);
});
