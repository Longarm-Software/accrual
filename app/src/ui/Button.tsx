import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text } from 'react-native';

import { radius, size, type } from '../theme/tokens';
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
        !primary && { backgroundColor: theme.color.glass, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.color.edge },
        { opacity: disabled ? 0.4 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      {primary && <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}
      <Text style={[type.heading, { color: primary ? theme.color.onAccent : theme.color.ink }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { height: size.button, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
