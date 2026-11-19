import { Text, View } from 'react-native';

import { amount, font, sheet, textScale, tint } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import type { EntryText } from './amountEntry';
import type { SheetDensity } from './sheetLayout';

type Props = { text: EntryText; density: SheetDensity };

/**
 * The amount being typed, exactly as typed: "−$18", "−$18.", "−$18.4", "+$18.40", or "$0.00"
 * dimmed before anything is typed (all decided by `entryText`). It is set as `Money` sets
 * amounts, with the same tokens, but drawn here because `Money` always shows two decimals.
 * The decimals are smaller, at the dollars' baseline, so the line's height is the dollars' and
 * does not change when they appear. The box has one height and the amount stays on one line,
 * shrinking to the width rather than wrapping, so nothing under it moves as keys are pressed.
 */
export function AmountDisplay({ text, density }: Props) {
  const theme = useTheme();
  const { amount: fontSize, amountBox } = sheet[density];
  return (
    <View testID="amount-display" style={{ height: amountBox, alignItems: 'center', justifyContent: 'center' }}>
      <Text
        accessibilityLabel={text.label}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={amount.minFit}
        maxFontSizeMultiplier={textScale.amount}
        style={{
          fontFamily: font.number,
          fontSize,
          letterSpacing: fontSize * amount.tracking,
          color: text.dimmed ? theme.color.mute : theme.color.ink,
          fontVariant: ['tabular-nums'],
        }}
      >
        <Text>{text.whole}</Text>
        {text.fraction !== '' && (
          <Text testID="amount-fraction" style={{ fontSize: fontSize * amount.cents, letterSpacing: 0, opacity: tint.cents }}>
            {text.fraction}
          </Text>
        )}
      </Text>
    </View>
  );
}
