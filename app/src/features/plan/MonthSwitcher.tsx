import { Pressable, Text, View, useWindowDimensions } from 'react-native';

import { addMonths, monthLabel } from '../../lib/month';
import { font, radius, size, space, tint, type } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Chevron } from '../../ui/Chevron';
import { Glass } from '../../ui/Glass';

type Props = { month: string; canGoBack: boolean; canGoForward: boolean; onChange: (month: string) => void };

/** "‹ November 2026 ›": a month either side, where the budget has one. */
export function MonthSwitcher({ month, canGoBack, canGoForward, onChange }: Props) {
  const theme = useTheme();
  const { name, year } = monthLabel(month);
  // The label keeps one width whatever the month, so the next arrow stays under the thumb.
  const { fontScale } = useWindowDimensions();
  return (
    <Glass radius={radius.pill} style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' }}>
      <Step label="Previous month" direction="back" enabled={canGoBack} onPress={() => onChange(addMonths(month, -1))} />
      <View
        testID="month-label"
        accessible
        accessibilityLabel={`${name} ${year}`}
        style={{ flexDirection: 'row', justifyContent: 'center', gap: space.xs, paddingHorizontal: space.xs, minWidth: size.monthLabel * fontScale }}
      >
        <Text style={[type.month, { color: theme.color.ink }]}>{name}</Text>
        <Text style={[type.month, { fontFamily: font.medium, color: theme.color.mute }]}>{year}</Text>
      </View>
      <Step label="Next month" direction="forward" enabled={canGoForward} onPress={() => onChange(addMonths(month, 1))} />
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
      hitSlop={space.xs}
      style={({ pressed }) => ({
        width: size.control,
        height: size.control,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: enabled ? (pressed ? tint.pressed : 1) : tint.disabled,
      })}
    >
      <Chevron direction={direction} />
    </Pressable>
  );
}
