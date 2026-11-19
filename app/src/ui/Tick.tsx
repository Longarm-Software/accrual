import { View } from 'react-native';

import { size as sizes } from '../theme/tokens';

type Props = { size: number; color: string; stroke?: number; testID?: string };

/**
 * A tick: the right and bottom sides of a box twice as tall as it is wide, turned 45 degrees.
 * `size` is its height before turning; it is nudged up so it sits on its box's centre.
 */
export function Tick({ size, color, stroke = sizes.stroke, testID }: Props) {
  return (
    <View
      testID={testID}
      style={{
        width: size / 2,
        height: size,
        borderColor: color,
        borderRightWidth: stroke,
        borderBottomWidth: stroke,
        transform: [{ translateY: -size / 8 }, { rotate: '45deg' }],
      }}
    />
  );
}
