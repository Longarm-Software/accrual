import { View } from 'react-native';

import { size as sizes } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

type Props = { direction: 'back' | 'forward'; size?: number; color?: string };

/** Two sides of a square, turned to point back or forward. */
export function Chevron({ direction, size = sizes.chevron, color }: Props) {
  const theme = useTheme();
  const back = direction === 'back';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderColor: color ?? theme.color.ink,
        borderLeftWidth: back ? sizes.stroke : 0,
        borderBottomWidth: back ? sizes.stroke : 0,
        borderRightWidth: back ? 0 : sizes.stroke,
        borderTopWidth: back ? 0 : sizes.stroke,
        transform: [{ translateX: (back ? 1 : -1) * sizes.stroke }, { rotate: '45deg' }],
      }}
    />
  );
}
