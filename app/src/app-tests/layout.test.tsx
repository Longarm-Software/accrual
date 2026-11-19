import { render, screen } from '@testing-library/react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import type { ReactNode } from 'react';

import RootLayout from '../app/_layout';

jest.mock('expo-font', () => ({ useFonts: jest.fn() }));
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(async () => true),
  hideAsync: jest.fn(async () => true),
}));
jest.mock('expo-router', () => {
  const { createElement } = require('react');
  const { Text } = require('react-native');
  return { Stack: () => createElement(Text, null, 'stack') };
});
jest.mock('../session/SessionProvider', () => ({
  SessionProvider: ({ children }: { children: ReactNode }) => children,
}));

const mockUseFonts = useFonts as jest.Mock;
const mockHideAsync = SplashScreen.hideAsync as jest.Mock;

beforeEach(() => mockHideAsync.mockClear());

it('hides the splash screen and renders with system fonts when a font fails to load', async () => {
  mockUseFonts.mockReturnValue([false, new Error('x')]);
  await render(<RootLayout />);
  expect(mockHideAsync).toHaveBeenCalled();
  expect(screen.getByText('stack')).toBeTruthy();
});

it('renders nothing and keeps the splash screen while fonts are loading', async () => {
  mockUseFonts.mockReturnValue([false, null]);
  await render(<RootLayout />);
  expect(mockHideAsync).not.toHaveBeenCalled();
  expect(screen.queryByText('stack')).toBeNull();
});
