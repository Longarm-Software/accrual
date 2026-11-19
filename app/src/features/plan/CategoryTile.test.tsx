import { render, screen } from '@testing-library/react-native';

import type { PlanCategory } from '../../engine/types';
import { fakePlanMonth } from '../../session/fakeEngine';
import { CategoryTile } from './CategoryTile';
import { categoryView } from './categoryView';

const all = fakePlanMonth.groups.flatMap(g => g.categories);
const find = (name: string): PlanCategory => all.find(c => c.name === name)!;
const when = { month: '2026-11', today: new Date(2026, 10, 19) };
const draw = (category: PlanCategory, compact = true) =>
  render(<CategoryTile category={category} view={categoryView(category, when)} compact={compact} />);

it('shows the name, the amount and the note', async () => {
  await draw(find('Groceries'));
  expect(screen.getByText('Groceries')).toBeTruthy();
  expect(screen.getByText('$207')).toBeTruthy();
  expect(screen.getByText('.62')).toBeTruthy();
  expect(screen.getByText('$17 a day for 12 days')).toBeTruthy();
});

it('reads as one element to a screen reader', async () => {
  await draw(find('Groceries'));
  expect(screen.getByLabelText('Groceries, $207.62 available, $17 a day for 12 days')).toBeTruthy();
  // The amount inside is not announced a second time.
  expect(screen.queryByLabelText('$207.62')).toBeNull();
});

it('says how much an overspent category is over', async () => {
  await draw(find('Dining out'));
  expect(screen.getByLabelText('Dining out, overspent by $28.10')).toBeTruthy();
  expect(screen.getByText('Overspent')).toBeTruthy();
});

it('limits a long name to two lines', async () => {
  const long = { ...find('Groceries'), name: 'Kids’ activities and school trips and summer camp' };
  await draw(long);
  expect(screen.getByText(long.name).props.numberOfLines).toBe(2);
});

it('shows all three pieces as a row for large text', async () => {
  await draw(find('Groceries'), false);
  expect(screen.getByText('Groceries')).toBeTruthy();
  expect(screen.getByText('$207')).toBeTruthy();
  expect(screen.getByText('$17 a day for 12 days')).toBeTruthy();
});

it('shows a big amount in full', async () => {
  await draw({ ...find('Groceries'), budgeted: 200000, spent: -75945, balance: -120455 });
  expect(screen.getByText('−$1,204')).toBeTruthy();
  expect(screen.getByText('.55')).toBeTruthy();
});
