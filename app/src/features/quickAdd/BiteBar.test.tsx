import { fireEvent, render, screen } from '@testing-library/react-native';

import { size } from '../../theme/tokens';
import { BiteBar } from './BiteBar';

const layout = (width: number) => ({ nativeEvent: { layout: { x: 0, y: 0, width, height: 10 } } });

it('splits the bar into the part kept and the part taken', async () => {
  await render(<BiteBar kept={0.9114} taken={0.0886} state="fits" />);
  expect(screen.getByTestId('bite-kept')).toHaveStyle({ flexGrow: 0.9114 });
  expect(screen.getByTestId('bite-taken')).toHaveStyle({ flexGrow: 0.0886 });
});

it('follows new values as the amount changes', async () => {
  await render(<BiteBar kept={1} taken={0} state="none" />);
  await screen.rerender(<BiteBar kept={0.75} taken={0.25} state="fits" />);
  expect(screen.getByTestId('bite-kept')).toHaveStyle({ flexGrow: 0.75 });
  expect(screen.getByTestId('bite-taken')).toHaveStyle({ flexGrow: 0.25 });
  await screen.rerender(<BiteBar kept={0} taken={1} state="over" />);
  expect(screen.getByTestId('bite-kept')).toHaveStyle({ flexGrow: 0 });
  expect(screen.getByTestId('bite-taken')).toHaveStyle({ flexGrow: 1 });
  expect(screen.getByTestId('bite-hatch-over')).toBeTruthy();
});

it('draws the amber edge only when something is taken', async () => {
  await render(<BiteBar kept={0.75} taken={0.25} state="fits" />);
  expect(screen.getByTestId('bite-taken')).toHaveStyle({ borderLeftWidth: size.stroke });
  await screen.rerender(<BiteBar kept={1} taken={0} state="fits" />);
  expect(screen.getByTestId('bite-taken')).not.toHaveStyle({ borderLeftWidth: size.stroke });
});

it('hatches the whole bar when the purchase is more than the category has', async () => {
  await render(<BiteBar kept={0} taken={1} state="over" />);
  expect(screen.getByTestId('bite-kept')).toHaveStyle({ flexGrow: 0 });
  expect(screen.getByTestId('bite-taken')).toHaveStyle({ flexGrow: 1 });
  expect(screen.getByTestId('bite-hatch-over')).toBeTruthy();
});

it('hatches the part taken in amber when it fits', async () => {
  await render(<BiteBar kept={0.5} taken={0.5} state="fits" />);
  expect(screen.getByTestId('bite-hatch-fits')).toBeTruthy();
});

it('draws only the solid part when nothing is taken', async () => {
  await render(<BiteBar kept={1} taken={0} state="none" />);
  expect(screen.getByTestId('bite-kept')).toHaveStyle({ flexGrow: 1 });
  expect(screen.getByTestId('bite-taken')).toHaveStyle({ flexGrow: 0 });
  expect(screen.queryByTestId('bite-hatch-fits')).toBeNull();
  expect(screen.queryByTestId('bite-hatch-over')).toBeNull();
});

it('draws a modest number of stripes, enough to cross the bar', async () => {
  await render(<BiteBar kept={0} taken={1} state="over" />);
  await fireEvent(screen.getByTestId('bite-bar'), 'layout', layout(340));
  const stripes = screen.getAllByTestId('bite-stripe');
  expect(stripes.length).toBeGreaterThan(40);
  expect(stripes.length).toBeLessThan(60);
});
