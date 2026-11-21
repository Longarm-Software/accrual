import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { themes, tint, withAlpha } from '../theme/tokens';
import { Spinner } from './Spinner';

jest.mock('../theme/useTheme', () => ({ useTheme: () => jest.requireActual('../theme/tokens').themes.light }));

const rings = () =>
  screen.getByLabelText('Working').children.map((c: any) => StyleSheet.flatten(c.props.style));

it('on the page: the track and the theme gradient', async () => {
  await render(<Spinner />);
  const [track, arc] = rings();
  expect(track.borderColor).toBe(themes.light.color.track);
  expect(arc.borderTopColor).toBe(themes.light.gradient[0]);
});

it('on the accent (a button mid-write): the ink drawn on the accent, so it shows on the gradient', async () => {
  await render(<Spinner tone="onAccent" />);
  const [track, arc] = rings();
  const ink = themes.light.color.onAccent;
  expect(track.borderColor).toBe(withAlpha(ink, tint.setAside));
  expect([arc.borderTopColor, arc.borderRightColor]).toEqual([ink, ink]);
});
