import { fireEvent, render, screen } from '@testing-library/react-native';

import { DateStepper } from './DateStepper';

const draw = (label: string, canGoForward: boolean) => {
  const onStep = jest.fn();
  return render(<DateStepper label={label} canGoForward={canGoForward} onStep={onStep} />).then(() => onStep);
};

it('shows the day it is given', async () => {
  await draw('Tue 17 Nov', true);
  expect(screen.getByText('Tue 17 Nov')).toBeTruthy();
  expect(screen.getByLabelText('Date, Tue 17 Nov')).toBeTruthy();
});

it('steps a day either way', async () => {
  const onStep = await draw('Yesterday', true);
  await fireEvent.press(screen.getByRole('button', { name: 'Earlier day' }));
  expect(onStep).toHaveBeenLastCalledWith(-1);
  await fireEvent.press(screen.getByRole('button', { name: 'Later day' }));
  expect(onStep).toHaveBeenLastCalledWith(1);
});

it('cannot go past today, and says so', async () => {
  const onStep = await draw('Today', false);
  const later = screen.getByRole('button', { name: 'Later day' });
  expect(later.props.accessibilityState).toMatchObject({ disabled: true });
  expect(screen.getByRole('button', { name: 'Earlier day' }).props.accessibilityState).toMatchObject({ disabled: false });
  await fireEvent.press(later);
  expect(onStep).not.toHaveBeenCalled();
});

it('keeps its arrows at least 48 points high', async () => {
  await draw('Today', true);
  for (const name of ['Earlier day', 'Later day']) {
    const style = [screen.getByRole('button', { name }).props.style].flat(Infinity).reduce((all, s) => ({ ...all, ...s }), {});
    expect(style.height).toBeGreaterThanOrEqual(48);
  }
});
