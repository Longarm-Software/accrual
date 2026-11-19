import { View } from 'react-native';

import { radius, size } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

type Props = { fill: number; color: string };

/** A thin bar on the theme's track; `fill` runs from 0 to 1. */
export function ProgressBar({ fill, color }: Props) {
  const theme = useTheme();
  const share = Number.isFinite(fill) ? Math.min(1, Math.max(0, fill)) : 0;
  return (
    <View style={{ height: size.bar, borderRadius: radius.pill, backgroundColor: theme.color.track, overflow: 'hidden' }}>
      <View style={{ width: `${share * 100}%`, height: '100%', borderRadius: radius.pill, backgroundColor: color }} />
    </View>
  );
}
