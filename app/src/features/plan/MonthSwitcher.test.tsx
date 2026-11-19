import { fireEvent, render, screen } from '@testing-library/react-native';

import { MonthSwitcher } from './MonthSwitcher';

const draw = (canGoBack: boolean, canGoForward: boolean) => {
  const onChange = jest.fn();
  return render(<MonthSwitcher month="2026-11" canGoBack={canGoBack} canGoForward={canGoForward} onChange={onChange} />).then(
    () => onChange,
  );
};

it('shows the month and its year', async () => {
  await draw(true, true);
  expect(screen.getByText('November')).toBeTruthy();
  expect(screen.getByText('2026')).toBeTruthy();
});

it('moves a month either way', async () => {
  const onChange = await draw(true, true);
  await fireEvent.press(screen.getByRole('button', { name: 'Next month' }));
  expect(onChange).toHaveBeenLastCalledWith('2026-12');
  await fireEvent.press(screen.getByRole('button', { name: 'Previous month' }));
  expect(onChange).toHaveBeenLastCalledWith('2026-10');
});

it('does nothing from a disabled button, and says it is disabled', async () => {
  const onChange = await draw(false, false);
  const previous = screen.getByRole('button', { name: 'Previous month' });
  const next = screen.getByRole('button', { name: 'Next month' });
  expect(previous.props.accessibilityState).toMatchObject({ disabled: true });
  expect(next.props.accessibilityState).toMatchObject({ disabled: true });
  await fireEvent.press(previous);
  await fireEvent.press(next);
  expect(onChange).not.toHaveBeenCalled();
});
