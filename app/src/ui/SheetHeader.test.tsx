import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { SheetHeader } from './SheetHeader';

it('keeps Cancel whole and lets a long title get smaller to fit one line, as at the largest text size', async () => {
  await render(<SheetHeader title="Cover Subscriptions" onCancel={() => {}} cancelDisabled={false} />);
  const title = StyleSheet.flatten(screen.getByRole('header').props.style);
  expect(title.flexShrink).toBe(1);
  expect(title.textAlign).toBe('center');
  expect(screen.getByRole('header').props.numberOfLines).toBe(1);
  expect(screen.getByRole('header').props.adjustsFontSizeToFit).toBe(true);
  expect(StyleSheet.flatten(screen.getByTestId('sheet-header-start').props.style).flexShrink).toBe(0);
  expect(StyleSheet.flatten(screen.getByTestId('sheet-header-end', { includeHiddenElements: true }).props.style).flexShrink).toBe(0);
  expect(screen.getByText('Cancel').props.numberOfLines).toBe(1);
});

it('has one Cancel button for assistive technology', async () => {
  await render(<SheetHeader title="Move money" onCancel={() => {}} cancelDisabled={false} />);
  expect(screen.getAllByRole('button', { name: 'Cancel' })).toHaveLength(1);
});
