import { fireEvent, render, screen } from '@testing-library/react-native';

import { AccountMenu } from './AccountMenu';

// The card waits until the button has been measured. Jest's stand-in View never answers a
// measurement, so answer it here: a 40-point button in the top-right corner.
const nativeMethods = jest.requireActual('@react-native/jest-preset/jest/MockNativeMethods').default;
beforeEach(() => {
  nativeMethods.measureInWindow.mockImplementation((done: (x: number, y: number, w: number, h: number) => void) =>
    done(335, 60, 40, 40),
  );
});
afterEach(() => nativeMethods.measureInWindow.mockReset());

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

it('can be closed before the button has been measured', async () => {
  nativeMethods.measureInWindow.mockImplementation(() => {});
  await render(<AccountMenu budgetName="Household" onSignOut={() => {}} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Account' }));
  expect(screen.queryByText('Household')).toBeNull();
  const backdrop = screen.getByLabelText('Close menu', { includeHiddenElements: true });
  await fireEvent.press(backdrop);
  expect(screen.queryByLabelText('Close menu', { includeHiddenElements: true })).toBeNull();
});

it('hides when pressing outside', async () => {
  await render(<AccountMenu budgetName="Household" onSignOut={() => {}} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Account' }));
  // The backdrop is hidden from screen readers while the menu is modal; they close it with escape or Back.
  await fireEvent.press(screen.getByLabelText('Close menu', { includeHiddenElements: true }));
  expect(screen.queryByText('Household')).toBeNull();
});
