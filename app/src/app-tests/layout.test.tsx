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
const mockScreen = jest.fn();
jest.mock('expo-router', () => {
  const { createElement } = require('react');
  const { Text } = require('react-native');
  const Screen = (props: object) => {
    mockScreen(props);
    return null;
  };
  const Stack = ({ children }: { children?: unknown }) => createElement(Text, null, 'stack', children);
  Stack.Screen = Screen;
  return { Stack };
});
const mockStatusBar = jest.fn();
jest.mock('expo-status-bar', () => ({
  StatusBar: (props: { style?: string }) => {
    mockStatusBar(props);
    return null;
  },
}));
const mockNavigationBar = jest.fn();
jest.mock('expo-navigation-bar', () => ({
  NavigationBar: (props: { style?: string }) => {
    mockNavigationBar(props);
    return null;
  },
}));
let mockDark = false;
jest.mock('../theme/useTheme', () => {
  const { themes } = jest.requireActual('../theme/tokens');
  return { useTheme: () => (mockDark ? themes.dark : themes.light) };
});
jest.mock('../session/SessionProvider', () => ({
  SessionProvider: ({ children }: { children: ReactNode }) => children,
}));

const mockUseFonts = useFonts as jest.Mock;
const mockHideAsync = SplashScreen.hideAsync as jest.Mock;

beforeEach(() => {
  mockHideAsync.mockClear();
  mockStatusBar.mockClear();
  mockNavigationBar.mockClear();
});

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

// Android draws the status bar over the page (edge to edge): its icons must contrast with the theme.
it.each([
  [false, 'dark'],
  [true, 'light'],
])('draws the status and navigation bars for the theme (dark theme: %s, icons: %s)', async (dark, style) => {
  mockDark = dark;
  mockUseFonts.mockReturnValue([true, null]);
  await render(<RootLayout />);
  expect(mockStatusBar).toHaveBeenLastCalledWith(expect.objectContaining({ style }));
  // The three-button navigation bar is drawn over the page too.
  expect(mockNavigationBar).toHaveBeenLastCalledWith(expect.objectContaining({ style }));
});

it('presents quick add as a modal over the Plan', async () => {
  mockUseFonts.mockReturnValue([true, null]);
  await render(<RootLayout />);
  expect(mockScreen).toHaveBeenCalledWith(expect.objectContaining({ name: 'add', options: expect.objectContaining({ presentation: 'modal' }) }));
});
