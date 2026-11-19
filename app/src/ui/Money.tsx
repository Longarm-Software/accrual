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
  /** A "+" before a positive amount: income being typed. Zero and negative amounts are unchanged. */
  plus?: boolean;
  /**
   * One line at one height: the amount shrinks to its box's width instead of wrapping, and does
   * not grow with the person's text size (it is already larger than the largest text).
   */
  fit?: boolean;
};

/** How small a fitted amount may shrink: "−$9,999,999.99" at the entry size on a narrow phone. */
const MIN_FIT_SCALE = 0.3;

/** "$207" with a smaller, quieter ".62", as every Aurora screen sets amounts. */
export function Money({ cents, size = amount.tile, color, testID, accessible = true, plus = false, fit = false }: Props) {
  const theme = useTheme();
  const parts = splitMoney(cents);
  const sign = plus && cents > 0 ? '+' : parts.sign;
  const ink = color ?? theme.color.ink;
  return (
    <Text
      testID={testID}
      accessible={accessible}
      accessibilityLabel={accessible ? (sign === '+' ? '+' : '') + formatMoney(cents) : undefined}
      importantForAccessibility={accessible ? 'auto' : 'no'}
      {...(fit && { numberOfLines: 1, adjustsFontSizeToFit: true, minimumFontScale: MIN_FIT_SCALE, maxFontSizeMultiplier: 1 })}
      style={{ fontFamily: font.number, fontSize: size, letterSpacing: -size * 0.035, color: ink, fontVariant: ['tabular-nums'] }}
    >
      <Text>{sign + parts.dollars}</Text>
      <Text style={{ fontSize: size * 0.5, opacity: tint.cents }}>{'.' + parts.cents}</Text>
    </Text>
  );
}
