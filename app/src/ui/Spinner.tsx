import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { tint, withAlpha } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

// The rotation runs on the native UI thread, so it keeps turning while the engine
// blocks the JavaScript thread during a first download (ADR 0002).
//
// `tone="onAccent"`: drawn on the accent gradient (a button whose write is under way), where the
// gradient arc would vanish, so it uses the ink drawn on the accent instead.
export function Spinner({ size = 64, tone = 'page' }: { size?: number; tone?: 'page' | 'onAccent' }) {
  const theme = useTheme();
  const onAccent = tone === 'onAccent';
  const ink = theme.color.onAccent;
  const track = onAccent ? withAlpha(ink, tint.setAside) : theme.color.track;
  const [first, second] = onAccent ? [ink, ink] : [theme.gradient[0], theme.gradient[1]];
  const turn = useSharedValue(0);
  useEffect(() => {
    turn.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.linear }), -1, false);
  }, [turn]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 360}deg` }] }));
  const ring = { width: size, height: size, borderRadius: size / 2, borderWidth: size / 9 };
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Working">
      <View style={[ring, { borderColor: track }]} />
      <Animated.View
        style={[ring, { position: 'absolute', borderColor: 'transparent', borderTopColor: first, borderRightColor: second }, style]}
      />
    </View>
  );
}
