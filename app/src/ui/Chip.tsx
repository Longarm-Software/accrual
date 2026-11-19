import { Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { radius, size, space, tint, type, withAlpha } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

type Props = { label: string; color?: string; style?: StyleProp<ViewStyle>; testID?: string };

/**
 * A small tinted pill with a dot: a state, said quietly. `color` is a #RRGGBB theme colour.
 * It keeps its own width, at the start of its parent; a parent row passes
 * `{ alignSelf: 'center' }` in `style` to set it on the row's centre line.
 */
export function Chip({ label, color, style, testID }: Props) {
  const theme = useTheme();
  const c = color ?? theme.color.mute;
  return (
    <View
      testID={testID}
      style={[
        {
          flexDirection: 'row',
          alignSelf: 'flex-start',
          alignItems: 'center',
          gap: space.xs,
          minHeight: size.chip,
          paddingHorizontal: space.sm,
          borderRadius: radius.pill,
          backgroundColor: withAlpha(c, tint.chip),
        },
        style,
      ]}
    >
      <View style={{ width: size.dot, height: size.dot, borderRadius: radius.pill, backgroundColor: c }} />
      <Text style={[type.chip, { color: c }]}>{label}</Text>
    </View>
  );
}
