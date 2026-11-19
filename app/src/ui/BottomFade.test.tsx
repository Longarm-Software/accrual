import { render, screen } from '@testing-library/react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomFade } from './BottomFade';

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: jest.fn() }));
const mockInsets = useSafeAreaInsets as jest.Mock;

it('covers the navigation bar and a little above it', async () => {
  mockInsets.mockReturnValue({ top: 0, left: 0, right: 0, bottom: 48 });
  await render(<BottomFade />);
  expect(screen.getByTestId('bottom-fade').props.style.height).toBeGreaterThan(48);
});

it('draws nothing when there is no navigation bar', async () => {
  mockInsets.mockReturnValue({ top: 0, left: 0, right: 0, bottom: 0 });
  await render(<BottomFade />);
  expect(screen.queryByTestId('bottom-fade')).toBeNull();
});
