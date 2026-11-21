import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text } from 'react-native';

import { radius, size, space, textScale, tint, type } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

export type CardAction = { label: string; onPress(): void };

type Props = CardAction & {
  /**
   * `accent`: filled with the accent gradient (Assign on the top card). `over`: filled coral (Fix,
   * on an overbudgeted top card). `quiet`: glass with a hairline edge (Cover on the notice).
   */
  tone: 'accent' | 'over' | 'quiet';
};

// The pill is drawn smaller than a touch target; its touch area is extended to the minimum.
const slop = (size.touch - size.action) / 2;

/** A small pill button on a card: Assign or Fix on the top card, Cover on the notice. */
export function ActionPill({ label, onPress, tone }: Props) {
  const theme = useTheme();
  const ink = { accent: theme.color.onAccent, over: theme.color.onOver, quiet: theme.color.ink }[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={{ top: slop, bottom: slop, left: space.sm, right: space.sm }}
      style={({ pressed }) => [
        styles.pill,
        tone === 'over' && { backgroundColor: theme.color.over },
        tone === 'quiet' && { backgroundColor: theme.color.glass, borderWidth: size.border, borderColor: theme.color.line },
        { opacity: pressed ? tint.pressed : 1 },
      ]}
    >
      {tone === 'accent' && (
        <LinearGradient testID="action-accent" colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      )}
      <Text style={[type.action, { color: ink }]} numberOfLines={1} maxFontSizeMultiplier={textScale.action}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: size.action,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
