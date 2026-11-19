import { render, screen } from '@testing-library/react-native';

import { Money } from './Money';

it('shows dollars and cents as separate pieces', async () => {
  await render(<Money cents={20762} />);
  expect(screen.getByText('$207')).toBeTruthy();
  expect(screen.getByText('.62')).toBeTruthy();
});

it('reads as one amount to a screen reader', async () => {
  await render(<Money cents={-120455} testID="m" />);
  expect(screen.getByTestId('m').props.accessibilityLabel).toBe('−$1,204.55');
});

it('marks a positive amount with a plus when asked, and reads it out with the plus', async () => {
  await render(<Money cents={1840} plus testID="m" />);
  expect(screen.getByText('+$18')).toBeTruthy();
  expect(screen.getByTestId('m').props.accessibilityLabel).toBe('+$18.40');
});

it('adds no plus to zero or to a negative amount', async () => {
  await render(<Money cents={0} plus testID="zero" />);
  expect(screen.getByText('$0')).toBeTruthy();
  await render(<Money cents={-1840} plus testID="neg" />);
  expect(screen.getByText('−$18')).toBeTruthy();
});

it('draws amounts without a plus exactly as before', async () => {
  await render(<Money cents={1840} testID="m" />);
  expect(screen.getByText('$18')).toBeTruthy();
  expect(screen.getByTestId('m').props.numberOfLines).toBeUndefined();
});

it('keeps a fitted amount on one line at one height, shrinking it to the width instead', async () => {
  await render(<Money cents={999999999} fit testID="m" />);
  const text = screen.getByTestId('m');
  expect(text.props.numberOfLines).toBe(1);
  expect(text.props.adjustsFontSizeToFit).toBe(true);
  expect(text.props.maxFontSizeMultiplier).toBe(1);
});
