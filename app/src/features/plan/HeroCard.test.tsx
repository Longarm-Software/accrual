import { fireEvent, render, screen, within } from '@testing-library/react-native';

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

describe('an action', () => {
  it('a small button with its label, which calls onPress', async () => {
    const onPress = jest.fn();
    await render(<HeroCard hero={heroView(fakePlanMonth)} action={{ label: 'Assign', onPress }} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Assign' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    // The card still reads as before.
    expect(screen.getByLabelText('Ready to budget, $312.00')).toBeTruthy();
  });
  it('sits above the amount, never beside it, so the amount keeps the card\'s whole width', async () => {
    await render(<HeroCard hero={heroView(fakePlanMonth)} action={{ label: 'Assign', onPress: () => {} }} />);
    expect(within(screen.getByTestId('hero-header')).getByRole('button', { name: 'Assign' })).toBeTruthy();
    expect(within(screen.getByTestId('hero-amount')).queryByRole('button')).toBeNull();
  });
  it('absent without one', async () => {
    await render(<HeroCard hero={heroView(fakePlanMonth)} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

it('the action is filled with the accent, or coral on an overbudgeted month', async () => {
  const { themes } = jest.requireActual('../../theme/tokens');
  await render(<HeroCard hero={heroView(fakePlanMonth)} action={{ label: 'Assign', onPress: () => {} }} />);
  expect(screen.getByTestId('action-accent')).toBeTruthy();
  await render(<HeroCard hero={heroView({ ...fakePlanMonth, toBudget: -12000 })} action={{ label: 'Fix', onPress: () => {} }} />);
  expect(screen.queryByTestId('action-accent')).toBeNull();
  expect(screen.getByRole('button', { name: 'Fix' })).toHaveStyle({ backgroundColor: themes.light.color.over });
});

it('the action\'s word grows with the person\'s text size only as far as its pill allows', async () => {
  const { textScale } = jest.requireActual('../../theme/tokens');
  await render(<HeroCard hero={heroView(fakePlanMonth)} action={{ label: 'Assign', onPress: () => {} }} />);
  expect(textScale.action).toBeGreaterThan(1);
  expect(screen.getByText('Assign').props.maxFontSizeMultiplier).toBe(textScale.action);
});

it('keeps the label\'s line the pill\'s height with or without one, so the amount does not move between months', async () => {
  const { size } = jest.requireActual('../../theme/tokens');
  await render(<HeroCard hero={heroView(fakePlanMonth)} />);
  expect(screen.getByTestId('hero-header')).toHaveStyle({ minHeight: size.action });
  await render(<HeroCard hero={heroView(fakePlanMonth)} action={{ label: 'Assign', onPress: () => {} }} />);
  expect(screen.getByTestId('hero-header')).toHaveStyle({ minHeight: size.action });
});
