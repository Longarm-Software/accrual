import { View } from 'react-native';

import { amount, size } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Money } from '../../ui/Money';

type Props = { cents: number; income: boolean };

/**
 * The amount being typed: "−$18.40" for an expense, "+$18.40" for income, "$0.00" dimmed
 * before anything is typed. Its box has one height, and the amount stays on one line and
 * shrinks to the width rather than wrap, so nothing under it moves as digits are added.
 */
export function AmountDisplay({ cents, income }: Props) {
  const theme = useTheme();
  const empty = cents === 0;
  return (
    <View testID="amount-display" style={{ height: size.entry, alignItems: 'center', justifyContent: 'center' }}>
      <Money
        cents={income ? cents : -cents}
        plus={income}
        fit
        size={amount.entry}
        color={empty ? theme.color.mute : theme.color.ink}
      />
    </View>
  );
}
