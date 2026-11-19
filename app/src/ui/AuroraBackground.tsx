import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/useTheme';

/** The page: a dark (or pale) field with one soft glow from the top-left corner. */
export function AuroraBackground({ children }: { children: ReactNode }) {
  const { color } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: color.page }}>
      <LinearGradient
        colors={[color.pageGlow, color.page]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 0.6 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}
