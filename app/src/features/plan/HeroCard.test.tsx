import { render, screen } from '@testing-library/react-native';

import { fakePlanMonth } from '../../session/fakeEngine';
import { HeroCard } from './HeroCard';
import { heroView } from './planSummary';

it('shows what is ready to budget', async () => {
  await render(<HeroCard hero={heroView(fakePlanMonth)} />);
  expect(screen.getByText('Ready to budget')).toBeTruthy();
  // The amount, and the amount in the "Free" key.
  expect(screen.getAllByText('$312')).toHaveLength(2);
  expect(screen.getByText('.00')).toBeTruthy();
  expect(screen.getByLabelText('Ready to budget, $312.00')).toBeTruthy();
});

it('shows the three parts of the month', async () => {
  await render(<HeroCard hero={heroView(fakePlanMonth)} />);
  expect(screen.getByText('Spent $3,416')).toBeTruthy();
  expect(screen.getByText('Still set aside $2,464')).toBeTruthy();
  expect(screen.getByText('Free $312')).toBeTruthy();
});

it('says when the month is overbudgeted', async () => {
  await render(<HeroCard hero={heroView({ ...fakePlanMonth, toBudget: -12000 })} />);
  expect(screen.getByText('Overbudgeted')).toBeTruthy();
  expect(screen.getByLabelText('Overbudgeted, −$120.00')).toBeTruthy();
});
