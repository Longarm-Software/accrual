import { Text } from 'react-native';

import { formatMoney, splitMoney } from '../lib/money';
import { amount, font, tint } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

type Props = {
  cents: number;
  size?: number;
  color?: string;
  testID?: string;
  /** False inside an element that already reads the amount out, so it is not announced twice. */
  accessible?: boolean;
};

/** "$207" with a smaller, quieter ".62", as every Aurora screen sets amounts. */
export function Money({ cents, size = amount.tile, color, testID, accessible = true }: Props) {
  const theme = useTheme();
  const parts = splitMoney(cents);
  const ink = color ?? theme.color.ink;
  return (
    <Text
      testID={testID}
      accessible={accessible}
      accessibilityLabel={accessible ? formatMoney(cents) : undefined}
      importantForAccessibility={accessible ? 'auto' : 'no'}
      style={{ fontFamily: font.number, fontSize: size, letterSpacing: size * amount.tracking, color: ink, fontVariant: ['tabular-nums'] }}
    >
      <Text>{parts.sign + parts.dollars}</Text>
      <Text style={{ fontSize: size * amount.cents, letterSpacing: 0, opacity: tint.cents }}>{'.' + parts.cents}</Text>
    </Text>
  );
}
