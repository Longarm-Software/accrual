import { render, screen } from '@testing-library/react-native';

import { GroupHeader } from './GroupHeader';

it('shows the group name and what is available in it', async () => {
  await render(<GroupHeader name="Everyday" available={29700} />);
  expect(screen.getByText('Everyday')).toBeTruthy();
  expect(screen.getByText('$297')).toBeTruthy();
});
