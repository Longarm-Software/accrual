import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { radius as radii } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

type Props = { children: ReactNode; style?: StyleProp<ViewStyle>; radius?: number };

// Frosted on iOS. Solid on Android, where live blur is costly on mid-range phones
// (design/README.md, "Aurora under stress"). The layout is the same either way.
export function Glass({ children, style, radius = radii.tile }: Props) {
  const theme = useTheme();
  const frosted = Platform.OS === 'ios';
  return (
    <View
      style={[
        { borderRadius: radius, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: theme.color.edge },
        { backgroundColor: frosted ? theme.color.glass : theme.color.solid },
        style,
      ]}
    >
      {frosted && <BlurView intensity={24} tint={theme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
      {children}
    </View>
  );
}
