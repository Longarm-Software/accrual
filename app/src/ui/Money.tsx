import { Text } from 'react-native';

import { formatMoney, splitMoney } from '../lib/money';
import { font } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

type Props = { cents: number; size?: number; color?: string; testID?: string };

/** "$207" with a smaller, quieter ".62", as every Aurora screen sets amounts. */
export function Money({ cents, size = 27, color, testID }: Props) {
  const theme = useTheme();
  const parts = splitMoney(cents);
  const ink = color ?? theme.color.ink;
  return (
    <Text
      testID={testID}
      accessible
      accessibilityLabel={formatMoney(cents)}
      style={{ fontFamily: font.display, fontSize: size, letterSpacing: -size * 0.035, color: ink, fontVariant: ['tabular-nums'] }}
    >
      <Text>{parts.sign + parts.dollars}</Text>
      <Text style={{ fontSize: size * 0.5, opacity: 0.6 }}>{'.' + parts.cents}</Text>
    </Text>
  );
}
