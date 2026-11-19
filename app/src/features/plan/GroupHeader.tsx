import { View } from 'react-native';

import { formatWholeMoney } from '../../lib/money';
import { space, type } from '../../theme/tokens';
import { Label } from '../../ui/Text';

type Props = { name: string; available: number };

/** A group's name, and what its categories have left between them, in whole dollars. */
export function GroupHeader({ name, available }: Props) {
  return (
    <View
      style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md, paddingHorizontal: space.md, paddingTop: space.lg, paddingBottom: space.sm }}
    >
      <Label accessibilityRole="header" style={[type.group, { flexShrink: 1 }]}>{name}</Label>
      <Label style={{ fontVariant: ['tabular-nums'] }}>{formatWholeMoney(available)}</Label>
    </View>
  );
}
