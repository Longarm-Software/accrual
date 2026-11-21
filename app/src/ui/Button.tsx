import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, size, space, type } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Spinner } from './Spinner';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'quiet';
  disabled?: boolean;
  /**
   * Its action is under way: off, not dimmed, with a spinner over the label. The label stays laid
   * out, unseen, so the button keeps its size (a wrapped label at large text included).
   */
  busy?: boolean;
  testID?: string;
};

export function Button({ title, onPress, variant = 'primary', disabled = false, busy = false, testID }: Props) {
  const theme = useTheme();
  const primary = variant === 'primary';
  const off = disabled || busy;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={busy ? { disabled: true, busy: true } : { disabled }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        !primary && { backgroundColor: theme.color.glass, borderWidth: size.border, borderColor: theme.color.line },
        { opacity: busy ? 1 : disabled ? 0.4 : pressed ? 0.85 : 1, transform: [{ scale: pressed && !off ? 0.98 : 1 }] },
      ]}
    >
      {primary && <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}
      <Text style={[type.heading, { color: primary ? theme.color.onAccent : theme.color.ink, textAlign: 'center', opacity: busy ? 0 : 1 }]}>
        {title}
      </Text>
      {busy && (
        <View style={[StyleSheet.absoluteFill, styles.centre]}>
          <Spinner size={size.spinnerInline} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // At least the button's height; a label that wraps at a large text size makes it taller
  // rather than being cut off.
  base: {
    minHeight: size.button,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill, alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  centre: { alignItems: 'center', justifyContent: 'center' },
});
