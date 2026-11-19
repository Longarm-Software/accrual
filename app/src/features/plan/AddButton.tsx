import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, shadow, size, space, tint } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

/** How far the Plan's list must scroll past its last tile so that tile can come out from under the button. */
export const ADD_BUTTON_CLEARANCE = size.fab + space.lg;

/**
 * The round "+" at the bottom right of the Plan: quick add. It floats above the navigation
 * bar's inset (Android draws the page under that bar) and above the fade behind it.
 * When plan 5 adds Accounts it becomes the centre of the dock.
 */
export function AddButton({ onPress }: { onPress(): void }) {
  const theme = useTheme();
  const { bottom } = useSafeAreaInsets();
  return (
    <View
      testID="add-button"
      style={{
        position: 'absolute',
        right: space.lg,
        bottom: bottom + space.lg,
        borderRadius: radius.pill,
        shadowColor: theme.color.shade,
        shadowOpacity: tint.shadow,
        shadowRadius: shadow.fab.blur,
        shadowOffset: { width: 0, height: shadow.fab.y },
        elevation: shadow.fab.elevation,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add a transaction"
        onPress={onPress}
        style={({ pressed }) => [styles.button, { opacity: pressed ? tint.pressed : 1 }]}
      >
        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* The plus: two bars crossing at the centre. */}
        <View style={[styles.arm, { width: size.fabPlus, height: size.tickStroke, backgroundColor: theme.color.onAccent }]} />
        <View style={[styles.arm, { width: size.tickStroke, height: size.fabPlus, backgroundColor: theme.color.onAccent }]} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: size.fab,
    height: size.fab,
    borderRadius: radius.pill,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arm: { position: 'absolute', borderRadius: radius.pill },
});
