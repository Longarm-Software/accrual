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
