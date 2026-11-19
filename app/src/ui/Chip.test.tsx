import { render, screen } from '@testing-library/react-native';
import { View } from 'react-native';

import { Chip } from './Chip';

it('keeps its own width in a column, at the start', async () => {
  await render(<Chip label="Offline" testID="chip" />);
  expect(screen.getByTestId('chip')).toHaveStyle({ alignSelf: 'flex-start' });
});

it('can be centred in a row by its parent', async () => {
  await render(
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Chip label="Offline" testID="chip" style={{ alignSelf: 'center' }} />
    </View>,
  );
  expect(screen.getByTestId('chip')).toHaveStyle({ alignSelf: 'center' });
});
