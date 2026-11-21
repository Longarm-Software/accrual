import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { hatch, radius, size, spring } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import type { Bite } from './bite';

/** A bite (quick add, a move's from pot), or a gain (`gained`: a move's to pot, a cover's target). */
type Props =
  | { kept: number; taken: number; state: Bite['state']; gained?: undefined }
  | { kept: number; gained: number; taken?: undefined; state?: undefined };

/**
 * What a purchase takes from a category. The bar's full width is what the category has now;
 * the solid part is what stays, the hatched part what this purchase takes ("not yet").
 * `fits`: mint, with amber hatching. `over`: the whole bar coral hatching. `none`: solid only.
 *
 * The two parts are flex siblings, so they always fill the bar exactly, whatever rounding is
 * in `kept` and `taken`. The split springs to each new value as digits are typed.
 *
 * A gain is the mirror: the solid part is what was there, then the part arriving, hatched in
 * the funded colour. A gain need not fill the bar (a pot below zero, part covered), so a third
 * part, the empty track, takes what is left; a bite never draws it.
 */
export function BiteBar(props: Props) {
  const { kept } = props;
  const isGain = props.gained !== undefined;
  const taken = isGain ? props.gained : props.taken;
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const split = useSharedValue(kept);
  const rest = useSharedValue(taken);
  const empty = useSharedValue(1 - kept - taken);
  useEffect(() => {
    split.value = withSpring(kept, spring.bite);
    rest.value = withSpring(taken, spring.bite);
    empty.value = withSpring(1 - kept - taken, spring.bite);
  }, [kept, taken, split, rest, empty]);
  // A spring may overshoot; a flex weight below zero is not allowed.
  const keptStyle = useAnimatedStyle(() => ({ flexGrow: Math.max(0, split.value) }));
  const takenStyle = useAnimatedStyle(() => ({ flexGrow: Math.max(0, rest.value) }));
  const emptyStyle = useAnimatedStyle(() => ({ flexGrow: Math.max(0, empty.value) }));

  const over = props.state === 'over';
  const hatched = isGain ? taken > 0 : props.state !== 'none';
  const stripe = isGain ? theme.color.ok : over ? theme.color.over : theme.color.need;
  const hatchId = isGain ? 'bite-hatch-gain' : over ? 'bite-hatch-over' : 'bite-hatch-fits';
  // The bright edge marks where the arriving (or taken) part meets the solid one; a gain onto
  // nothing starts at the bar's left end, where there is nothing to mark.
  const edge = hatched && !over && taken > 0 && (!isGain || kept > 0);
  // A gain filling a deficit starts at the bar's left end and may stop short of its right one.
  const fromLeft = isGain && kept === 0;
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
        testID={isGain ? 'bite-gained' : 'bite-taken'}
        style={[styles.part, takenStyle, edge && { borderLeftWidth: size.stroke, borderLeftColor: stripe }]}
      >
        {hatched && (
          // Anchored to the bar's right end, not the part's left, so the stripes stay still while
          // the part's width springs; the part clips them. A gain filling a deficit ends where the
          // amount takes it, so its stripes are anchored to the bar's left end instead.
          <View testID={hatchId} style={[styles.hatch, fromLeft ? styles.fromLeft : styles.fromRight, { width }]}>
            <Stripes width={width} color={stripe} />
          </View>
        )}
      </Animated.View>
      {isGain && <Animated.View testID="bite-rest" style={[styles.part, emptyStyle]} />}
    </View>
  );
}

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
  hatch: { position: 'absolute', top: 0, bottom: 0 },
  fromRight: { right: 0 },
  fromLeft: { left: 0 },
});
