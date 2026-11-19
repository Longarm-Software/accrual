import { Pressable, Text, View, useWindowDimensions } from 'react-native';

import { radius, size, space, tint, type } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Chevron } from '../../ui/Chevron';
import { Glass } from '../../ui/Glass';

type Props = { label: string; canGoForward: boolean; onStep(days: -1 | 1): void };

/**
 * "‹  Today  ›": the transaction's day, a day at a time. Never later than today, so the
 * forward arrow is disabled there. It fills the width it is given; the label keeps one
 * width whatever the day, so the arrows stay under the thumb.
 */
export function DateStepper({ label, canGoForward, onStep }: Props) {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  return (
    <Glass radius={radius.pill} style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Step label="Earlier day" direction="back" enabled onPress={() => onStep(-1)} />
      <View
        accessible
        accessibilityLabel={`Date, ${label}`}
        style={{ flexGrow: 1, flexShrink: 1, minWidth: size.dateLabel * fontScale, alignItems: 'center' }}
      >
        <Text style={[type.meta, { color: theme.color.ink, textAlign: 'center' }]}>{label}</Text>
      </View>
      <Step label="Later day" direction="forward" enabled={canGoForward} onPress={() => onStep(1)} />
    </Glass>
  );
}

type StepProps = { label: string; direction: 'back' | 'forward'; enabled: boolean; onPress: () => void };

function Step({ label, direction, enabled, onPress }: StepProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: size.touch,
        height: size.touch,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: enabled ? (pressed ? tint.pressed : 1) : tint.disabled,
      })}
    >
      <Chevron direction={direction} />
    </Pressable>
  );
}
