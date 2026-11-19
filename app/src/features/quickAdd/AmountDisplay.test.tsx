import { render, screen } from '@testing-library/react-native';

import { amount, size, themes } from '../../theme/tokens';
import { AmountDisplay } from './AmountDisplay';

// The design is dark; Jest's colour scheme is light. Draw dark so the colours checked are the design's.
jest.mock('../../theme/useTheme', () => ({ useTheme: () => jest.requireActual('../../theme/tokens').themes.dark }));

const flat = (style: unknown) => [style].flat(Infinity).reduce<Record<string, unknown>>((all, s) => ({ ...all, ...(s as object) }), {});

it('shows an expense with a minus, as one amount', async () => {
  await render(<AmountDisplay cents={1840} income={false} />);
  expect(screen.getByText('−$18')).toBeTruthy();
  expect(screen.getByText('.40')).toBeTruthy();
  expect(screen.getByLabelText('−$18.40')).toBeTruthy();
});

it('shows income with a plus', async () => {
  await render(<AmountDisplay cents={1840} income />);
  expect(screen.getByText('+$18')).toBeTruthy();
  expect(screen.getByLabelText('+$18.40')).toBeTruthy();
});

it.each([false, true])('shows $0.00 dimmed when nothing is typed (income %s)', async income => {
  await render(<AmountDisplay cents={0} income={income} />);
  expect(screen.getByText('$0')).toBeTruthy();
  const style = flat(screen.getByLabelText('$0.00').props.style);
  expect(style.color).toBe(themes.dark.color.mute);
  expect(style.fontSize).toBe(amount.entry);
});

it('draws a typed amount in ink at the entry size', async () => {
  await render(<AmountDisplay cents={1840} income={false} />);
  const style = flat(screen.getByLabelText('−$18.40').props.style);
  expect(style.color).toBe(themes.dark.color.ink);
  expect(style.fontSize).toBe(amount.entry);
});

it('keeps one height and one line however long the amount is', async () => {
  await render(<AmountDisplay cents={999999999} income={false} />);
  expect(screen.getByTestId('amount-display')).toHaveStyle({ height: size.entry });
  expect(screen.getByLabelText('−$9,999,999.99').props.numberOfLines).toBe(1);
});
