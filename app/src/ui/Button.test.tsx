import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from './Button';

it('calls onPress', async () => {
  const onPress = jest.fn();
  await render(<Button title="Connect" onPress={onPress} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Connect' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

it('does nothing when disabled', async () => {
  const onPress = jest.fn();
  await render(<Button title="Connect" onPress={onPress} disabled />);
  await fireEvent.press(screen.getByRole('button', { name: 'Connect' }));
  expect(onPress).not.toHaveBeenCalled();
});
