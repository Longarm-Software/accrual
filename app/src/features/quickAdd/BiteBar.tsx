import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { hatch, radius, size } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import type { Bite } from './bite';

type Props = { kept: number; taken: number; state: Bite['state'] };

/**
 * What a purchase takes from a category. The bar's full width is what the category has now;
 * the solid part is what stays, the hatched part what this purchase takes ("not yet").
 * `fits`: mint, with amber hatching. `over`: the whole bar coral hatching. `none`: solid only.
 *
 * The two parts are flex siblings, so they always fill the bar exactly, whatever rounding is
 * in `kept` and `taken`. The split springs to each new value as digits are typed.
 */
export function BiteBar({ kept, taken, state }: Props) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const split = useSharedValue(kept);
  const rest = useSharedValue(taken);
  useEffect(() => {
    split.value = withSpring(kept, SPRING);
    rest.value = withSpring(taken, SPRING);
  }, [kept, taken, split, rest]);
  // A spring may overshoot; a flex weight below zero is not allowed.
  const keptStyle = useAnimatedStyle(() => ({ flexGrow: Math.max(0, split.value) }));
  const takenStyle = useAnimatedStyle(() => ({ flexGrow: Math.max(0, rest.value) }));

  const over = state === 'over';
  const hatched = state !== 'none';
  return (
    <View
      testID="bite-bar"
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={{ height: size.bite, borderRadius: radius.pill, backgroundColor: theme.color.track, flexDirection: 'row', overflow: 'hidden' }}
    >
      <Animated.View testID="bite-kept" style={[styles.part, keptStyle]}>
        <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View
        testID="bite-taken"
        style={[styles.part, takenStyle, hatched && !over && { borderLeftWidth: size.stroke, borderLeftColor: theme.color.need }]}
      >
        {hatched && (
          // Anchored to the bar's right end, not the part's left, so the stripes stay still while
          // the part's width springs; the part clips them.
          <View testID={over ? 'bite-hatch-over' : 'bite-hatch-fits'} style={[styles.hatch, { width }]}>
            <Stripes width={width} color={over ? theme.color.over : theme.color.need} />
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const SPRING = { damping: 20, stiffness: 220 } as const;

/**
 * Diagonal stripes across a bar `width` wide: one plain View per stripe, each turned. Memoised
 * on width and colour, so typing a digit re-renders the bar without touching them.
 */
const Stripes = memo(function Stripes({ width, color }: { width: number; color: string }) {
  if (width === 0) return null;
  // Each stripe is long enough to cross the bar once turned; one extra at each end covers the corners.
  const length = size.bite * 2;
  const count = Math.ceil(width / hatch.period) + 2;
  return Array.from({ length: count }, (_, i) => (
    <View
      key={i}
      testID="bite-stripe"
      style={{
        position: 'absolute',
        left: (i - 1) * hatch.period,
        top: (size.bite - length) / 2,
        width: hatch.stripe,
        height: length,
        backgroundColor: color,
        transform: [{ rotate: hatch.angle }],
      }}
    />
  ));
});

const styles = StyleSheet.create({
  part: { flexBasis: 0, flexShrink: 1, height: '100%', overflow: 'hidden' },
  hatch: { position: 'absolute', top: 0, bottom: 0, right: 0 },
});
