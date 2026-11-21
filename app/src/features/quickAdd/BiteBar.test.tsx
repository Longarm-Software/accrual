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

describe('a gain', () => {
  const grow = (id: string): number =>
    [screen.getByTestId(id).props.style].flat(Infinity).reduce((all, s) => ({ ...all, ...s }), {}).flexGrow;
  it('solid kept, then hatching in the funded colour for gained, then the empty rest', async () => {
    await render(<BiteBar kept={0.6} gained={0.25} />);
    expect(screen.getByTestId('bite-kept')).toHaveStyle({ flexGrow: 0.6 });
    expect(screen.getByTestId('bite-gained')).toHaveStyle({ flexGrow: 0.25 });
    expect(grow('bite-rest')).toBeCloseTo(0.15);
    expect(screen.getByTestId('bite-hatch-gain')).toBeTruthy();
    expect(screen.queryByTestId('bite-taken')).toBeNull();
    expect(screen.queryByTestId('bite-hatch-fits')).toBeNull();
  });
  it('a filled deficit: the whole bar hatched, no rest', async () => {
    await render(<BiteBar kept={0} gained={1} />);
    expect(screen.getByTestId('bite-gained')).toHaveStyle({ flexGrow: 1 });
    expect(screen.getByTestId('bite-rest')).toHaveStyle({ flexGrow: 0 });
  });
  it('follows new values', async () => {
    await render(<BiteBar kept={0} gained={0.3} />);
    await screen.rerender(<BiteBar kept={0} gained={0.7} />);
    expect(screen.getByTestId('bite-gained')).toHaveStyle({ flexGrow: 0.7 });
    expect(grow('bite-rest')).toBeCloseTo(0.3);
  });
  it('an empty bar when both are 0', async () => {
    await render(<BiteBar kept={0} gained={0} />);
    expect(screen.getByTestId('bite-kept')).toHaveStyle({ flexGrow: 0 });
    expect(screen.getByTestId('bite-gained')).toHaveStyle({ flexGrow: 0 });
    expect(screen.getByTestId('bite-rest')).toHaveStyle({ flexGrow: 1 });
    expect(screen.queryByTestId('bite-hatch-gain')).toBeNull();
  });
});
