import { fireEvent, render, screen } from '@testing-library/react-native';

import { AccountMenu } from './AccountMenu';

it('shows the budget name only once the button is pressed', async () => {
  await render(<AccountMenu budgetName="Household" onSignOut={() => {}} />);
  expect(screen.queryByText('Household')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Account' }));
  expect(screen.getByText('Household')).toBeTruthy();
});

it('signs out once', async () => {
  const onSignOut = jest.fn();
  await render(<AccountMenu budgetName="Household" onSignOut={onSignOut} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Account' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
  expect(onSignOut).toHaveBeenCalledTimes(1);
});

it('hides when pressing outside', async () => {
  await render(<AccountMenu budgetName="Household" onSignOut={() => {}} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Account' }));
  // The backdrop is hidden from screen readers while the menu is modal; they close it with escape or Back.
  await fireEvent.press(screen.getByLabelText('Close menu', { includeHiddenElements: true }));
  expect(screen.queryByText('Household')).toBeNull();
});
