import { Text, View } from 'react-native';

import { radius, size, space, tint, type, withAlpha } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

type Props = { label: string; color?: string };

/** A small tinted pill with a dot: a state, said quietly. `color` is a #RRGGBB theme colour. */
export function Chip({ label, color }: Props) {
  const theme = useTheme();
  const c = color ?? theme.color.mute;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignSelf: 'flex-start',
        alignItems: 'center',
        gap: space.xs,
        minHeight: size.chip,
        paddingHorizontal: space.sm,
        borderRadius: radius.pill,
        backgroundColor: withAlpha(c, tint.chip),
      }}
    >
      <View style={{ width: size.dot, height: size.dot, borderRadius: radius.pill, backgroundColor: c }} />
      <Text style={[type.chip, { color: c }]}>{label}</Text>
    </View>
  );
}
