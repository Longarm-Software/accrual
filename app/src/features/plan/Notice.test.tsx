import { render, screen } from '@testing-library/react-native';

import { Notice } from './Notice';

it('shows its text', async () => {
  await render(<Notice text="Dining out is $28.10 over" />);
  expect(screen.getByText('Dining out is $28.10 over')).toBeTruthy();
});
