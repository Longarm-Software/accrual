import { fireEvent, render, screen } from '@testing-library/react-native';

import { Notice } from './Notice';

it('shows its text', async () => {
  await render(<Notice text="Dining out is $28.10 over" />);
  expect(screen.getByText('Dining out is $28.10 over')).toBeTruthy();
});

it('an action: a small button at its right, which calls onPress', async () => {
  const onPress = jest.fn();
  await render(<Notice text="Dining out is $28.10 over" action={{ label: 'Cover', onPress }} />);
  expect(screen.getByText('Dining out is $28.10 over')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Cover' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

it('no button without an action', async () => {
  await render(<Notice text="Dining out is $28.10 over" />);
  expect(screen.queryByRole('button')).toBeNull();
});
