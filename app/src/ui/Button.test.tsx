import { fireEvent, render, screen } from '@testing-library/react-native';

import { StyleSheet } from 'react-native';

import { size } from '../theme/tokens';
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

it('grows to fit a label that wraps at a large text size, centred, instead of cutting it off', async () => {
  await render(<Button title="Cover $1,300.00 of $2,165.95" onPress={() => {}} />);
  const style = StyleSheet.flatten(screen.getByRole('button').props.style);
  expect(style.height).toBeUndefined();
  expect(style.minHeight).toBe(size.button);
  expect(StyleSheet.flatten(screen.getByText('Cover $1,300.00 of $2,165.95').props.style).textAlign).toBe('center');
});
