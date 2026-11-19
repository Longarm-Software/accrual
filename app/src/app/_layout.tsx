import { BricolageGrotesque_600SemiBold } from '@expo-google-fonts/bricolage-grotesque';
import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold } from '@expo-google-fonts/geist';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { SessionProvider } from '../session/SessionProvider';
import { useTheme } from '../theme/useTheme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const theme = useTheme();
  const [loaded, error] = useFonts({ BricolageGrotesque_600SemiBold, Geist_400Regular, Geist_500Medium, Geist_600SemiBold });
  // A font that fails to load must not keep the splash screen up: carry on with system fonts.
  const ready = loaded || error != null;
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);
  if (!ready) return null;
  return (
    <SessionProvider>
      {/* Android draws the page under the status bar: its icons follow the theme, dark on the light page. */}
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
    </SessionProvider>
  );
}
