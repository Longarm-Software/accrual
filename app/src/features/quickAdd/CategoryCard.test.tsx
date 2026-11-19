import { fireEvent, render, screen } from '@testing-library/react-native';

import { size, themes, tint, withAlpha } from '../../theme/tokens';
import { bite, type Bite } from './bite';
import { CategoryCard } from './CategoryCard';

// The design is dark; Jest's colour scheme is light. Draw dark so the colours checked are the design's.
jest.mock('../../theme/useTheme', () => ({ useTheme: () => jest.requireActual('../../theme/tokens').themes.dark }));

const groceries = { name: 'Groceries', balance: 20762 };
const coffee = { name: 'Coffee', balance: 1350 };

const draw = (props: { name: string | null; suggested?: boolean; bite: Bite | null }) => {
  const onPress = jest.fn();
  return render(<CategoryCard name={props.name} suggested={props.suggested ?? false} bite={props.bite} onPress={onPress} />).then(
    () => onPress,
  );
};

it('with no category: says so, offers to choose, and draws no bar', async () => {
  await draw({ name: null, bite: null });
  expect(screen.getByText('No category')).toBeTruthy();
  expect(screen.getByText('Choose')).toBeTruthy();
  expect(screen.queryByTestId('bite-bar')).toBeNull();
  expect(screen.getByRole('button', { name: 'No category, choose one' })).toBeTruthy();
});

it('a purchase that fits: name, Suggested, the bar, before and after', async () => {
  await draw({ name: 'Groceries', suggested: true, bite: bite(groceries, 1840) });
  expect(screen.getByText('Groceries')).toBeTruthy();
  expect(screen.getByText('Suggested')).toBeTruthy();
  expect(screen.getByTestId('bite-bar')).toBeTruthy();
  expect(screen.getByText('$207.62')).toBeTruthy();
  expect(screen.getByText('$189.22 after')).toHaveStyle({ color: themes.dark.color.ok });
  expect(screen.getByRole('button', { name: 'Groceries, suggested, $207.62 now, $189.22 after' })).toBeTruthy();
});

it('a category chosen by hand offers Change', async () => {
  await draw({ name: 'Groceries', suggested: false, bite: bite(groceries, 1840) });
  expect(screen.getByText('Change')).toBeTruthy();
  expect(screen.queryByText('Suggested')).toBeNull();
  expect(screen.getByRole('button', { name: 'Groceries, $207.62 now, $189.22 after' })).toBeTruthy();
});

it('a purchase more than the category has: coral after, a coral edge, and the warning under the card', async () => {
  await draw({ name: 'Coffee', suggested: true, bite: bite(coffee, 1840) });
  expect(screen.getByText('$13.50')).toBeTruthy();
  expect(screen.getByText('−$4.90 after')).toHaveStyle({ color: themes.dark.color.over });
  expect(screen.getByTestId('category-card')).toHaveStyle({
    borderWidth: size.border,
    borderColor: withAlpha(themes.dark.color.over, tint.potOverEdge),
  });
  expect(screen.getByText('That is $4.90 more than Coffee has')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Coffee, suggested, $13.50 now, −$4.90 after' })).toBeTruthy();
});

it('shows no warning when the purchase fits', async () => {
  await draw({ name: 'Groceries', bite: bite(groceries, 1840) });
  expect(screen.queryByText(/more than/)).toBeNull();
});

it('income: the name only, with no bar and no amounts', async () => {
  await draw({ name: 'Salary', bite: null });
  expect(screen.getByText('Salary')).toBeTruthy();
  expect(screen.getByText('Change')).toBeTruthy();
  expect(screen.queryByTestId('bite-bar')).toBeNull();
  expect(screen.queryByText(/after/)).toBeNull();
  expect(screen.getByRole('button', { name: 'Salary' })).toBeTruthy();
});

it('opens the category list when pressed', async () => {
  const onPress = await draw({ name: 'Groceries', bite: bite(groceries, 1840) });
  await fireEvent.press(screen.getByRole('button', { name: /Groceries/ }));
  expect(onPress).toHaveBeenCalledTimes(1);
});
