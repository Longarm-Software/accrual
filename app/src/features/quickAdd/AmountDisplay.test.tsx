import { render, screen } from '@testing-library/react-native';

import { amount, font, sheet, themes, tint } from '../../theme/tokens';
import { emptyEntry, entryText, type Entry } from './amountEntry';
import { AmountDisplay } from './AmountDisplay';

// The design is dark; Jest's colour scheme is light. Draw dark so the colours checked are the design's.
jest.mock('../../theme/useTheme', () => ({ useTheme: () => jest.requireActual('../../theme/tokens').themes.dark }));

const flat = (style: unknown) => [style].flat(Infinity).reduce<Record<string, unknown>>((all, s) => ({ ...all, ...(s as object) }), {});
const e = (digits: string, decimals: string | null = null): Entry => ({ digits, decimals });
const show = (entry: Entry, income = false, density: 'regular' | 'compact' = 'regular') =>
  render(<AmountDisplay text={entryText(entry, income)} density={density} />);

it('shows an expense with a minus, as one amount', async () => {
  await show(e('18', '40'));
  expect(screen.getByText('−$18')).toBeTruthy();
  expect(screen.getByText('.40')).toBeTruthy();
  expect(screen.getByLabelText('−$18.40')).toBeTruthy();
});

it('shows income with a plus', async () => {
  await show(e('18', '40'), true);
  expect(screen.getByText('+$18')).toBeTruthy();
  expect(screen.getByLabelText('+$18.40')).toBeTruthy();
});

it('shows the amount as typed: "18." draws the point, and is still read as $18.00', async () => {
  await show(e('18', ''));
  expect(screen.getByText('.')).toBeTruthy();
  expect(screen.getByLabelText('−$18.00')).toBeTruthy();
});

it('draws no decimals until the point is pressed', async () => {
  await show(e('18'));
  expect(screen.getByText('−$18')).toBeTruthy();
  expect(screen.queryByTestId('amount-fraction')).toBeNull();
});

it('draws the decimals at the cents size and tint, as Money does', async () => {
  await show(e('18', '4'));
  const style = flat(screen.getByText('.4').props.style);
  expect(style.fontSize).toBe(amount.entry * amount.cents);
  expect(style.letterSpacing).toBe(0);
  expect(style.opacity).toBe(tint.cents);
});

it.each([false, true])('shows $0.00 dimmed when nothing is typed (income %s)', async income => {
  await show(emptyEntry, income);
  expect(screen.getByText('$0')).toBeTruthy();
  const style = flat(screen.getByLabelText('$0.00').props.style);
  expect(style.color).toBe(themes.dark.color.mute);
  expect(style.fontSize).toBe(amount.entry);
});

it('draws a typed amount in ink at the entry size, in the number face', async () => {
  await show(e('18', '40'));
  const style = flat(screen.getByLabelText('−$18.40').props.style);
  expect(style.color).toBe(themes.dark.color.ink);
  expect(style.fontSize).toBe(amount.entry);
  expect(style.fontFamily).toBe(font.number);
  expect(style.letterSpacing).toBe(amount.entry * amount.tracking);
});

it('keeps one height and one line however long the amount is', async () => {
  await show(e('9999999', '99'));
  expect(screen.getByTestId('amount-display')).toHaveStyle({ height: sheet.regular.amountBox });
  expect(screen.getByLabelText('−$9,999,999.99').props.numberOfLines).toBe(1);
});

it('is smaller on the compact sheet', async () => {
  await show(e('18', '4'), false, 'compact');
  expect(screen.getByTestId('amount-display')).toHaveStyle({ height: sheet.compact.amountBox });
  expect(flat(screen.getByLabelText('−$18.40').props.style).fontSize).toBe(amount.entryCompact);
  expect(flat(screen.getByText('.4').props.style).fontSize).toBe(amount.entryCompact * amount.cents);
});
