import { Pressable, Text, View } from 'react-native';

import { addMonths, monthLabel } from '../../lib/month';
import { font, radius, size, space, tint, type } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Glass } from '../../ui/Glass';

type Props = { month: string; canGoBack: boolean; canGoForward: boolean; onChange: (month: string) => void };

/** "‹ November 2026 ›": a month either side, where the budget has one. */
export function MonthSwitcher({ month, canGoBack, canGoForward, onChange }: Props) {
  const theme = useTheme();
  const { name, year } = monthLabel(month);
  return (
    <Glass radius={radius.pill} style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' }}>
      <Step label="Previous month" direction="back" enabled={canGoBack} onPress={() => onChange(addMonths(month, -1))} />
      <View accessible accessibilityLabel={`${name} ${year}`} style={{ flexDirection: 'row', gap: space.xs, paddingHorizontal: space.xs }}>
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

/** Two sides of a square, turned to point back or forward. */
function Chevron({ direction }: { direction: 'back' | 'forward' }) {
  const theme = useTheme();
  const back = direction === 'back';
  return (
    <View
      style={{
        width: size.chevron,
        height: size.chevron,
        borderColor: theme.color.ink,
        borderLeftWidth: back ? size.stroke : 0,
        borderBottomWidth: back ? size.stroke : 0,
        borderRightWidth: back ? 0 : size.stroke,
        borderTopWidth: back ? 0 : size.stroke,
        transform: [{ translateX: (back ? 1 : -1) * size.stroke }, { rotate: '45deg' }],
      }}
    />
  );
}
