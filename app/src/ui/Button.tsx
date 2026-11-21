import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text } from 'react-native';

import { radius, size, space, type } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

type Props = { title: string; onPress: () => void; variant?: 'primary' | 'quiet'; disabled?: boolean; testID?: string };

export function Button({ title, onPress, variant = 'primary', disabled = false, testID }: Props) {
  const theme = useTheme();
  const primary = variant === 'primary';
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        !primary && { backgroundColor: theme.color.glass, borderWidth: size.border, borderColor: theme.color.line },
        { opacity: disabled ? 0.4 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      {primary && <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}
      <Text style={[type.heading, { color: primary ? theme.color.onAccent : theme.color.ink, textAlign: 'center' }]}>{title}</Text>
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
});
