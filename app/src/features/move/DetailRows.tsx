import { StyleSheet, View } from 'react-native';

import { formatMoney } from '../../lib/money';
import { amount, radius, size, space, type } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Glass } from '../../ui/Glass';
import { Money } from '../../ui/Money';
import { Body } from '../../ui/Text';
import type { DetailRow } from './categoryDetail';

/**
 * How a category's balance came about: one row per label and amount (Budgeted, Spent, Carried
 * in), and the last (Left) after a hairline, one step larger, as a sum's total line is set.
 */
export function DetailRows({ rows }: { rows: DetailRow[] }) {
  const theme = useTheme();
  const tone = { plain: theme.color.ink, mute: theme.color.mute, over: theme.color.over };
  return (
    <Glass radius={radius.tile}>
      {rows.map((row, i) => {
        const last = i === rows.length - 1 && rows.length > 1;
        return (
          <View
            key={row.label}
            testID={`detail-${row.label}`}
            accessible
            accessibilityLabel={`${row.label}, ${formatMoney(row.amount)}`}
            style={[styles.row, last && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.color.line }]}
          >
            <Body style={[last ? type.heading : type.body, styles.label]}>{row.label}</Body>
            <Money
              testID={`detail-amount-${row.label}`}
              cents={row.amount}
              size={last ? amount.rowTotal : amount.row}
              color={tone[row.tone]}
              accessible={false}
            />
          </View>
        );
      })}
    </Glass>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: size.touch,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  label: { flex: 1 },
});
