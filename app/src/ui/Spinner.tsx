import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useTheme } from '../theme/useTheme';

// The rotation runs on the native UI thread, so it keeps turning while the engine
// blocks the JavaScript thread during a first download (ADR 0002).
export function Spinner({ size = 64 }: { size?: number }) {
  const theme = useTheme();
  const turn = useSharedValue(0);
  useEffect(() => {
    turn.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.linear }), -1, false);
  }, [turn]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 360}deg` }] }));
  const ring = { width: size, height: size, borderRadius: size / 2, borderWidth: size / 9 };
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Working">
      <View style={[ring, { borderColor: theme.color.track }]} />
      <Animated.View
        style={[ring, { position: 'absolute', borderColor: 'transparent', borderTopColor: theme.gradient[0], borderRightColor: theme.gradient[1] }, style]}
      />
    </View>
  );
}
