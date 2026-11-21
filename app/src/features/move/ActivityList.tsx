import { StyleSheet, View } from 'react-native';

import type { ActivityRow } from '../../engine/types';
import { formatMoney } from '../../lib/money';
import { amount, radius, size, space, type } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Glass } from '../../ui/Glass';
import { Money } from '../../ui/Money';
import { Body, Label } from '../../ui/Text';
import { activityDateLabel } from './categoryDetail';

type Props = { rows: ActivityRow[]; today: Date; empty: string };

const NO_PAYEE = 'No payee';

/**
 * A category's transactions for a month, newest first as given: the payee, under it the date and
 * the account, and the amount at the right (money in mint, with a "+").
 *
 * Not virtualised. The category screen scrolls as one page, and a list virtualised inside a
 * scrolling page is not virtualised anyway (React Native warns and draws it all); one
 * category's month is rarely long. Drawing the rows plainly is the honest version.
 */
export function ActivityList({ rows, today, empty }: Props) {
  const theme = useTheme();
  if (rows.length === 0) {
    return (
      <Glass radius={radius.tile} style={styles.empty}>
        <Body color={theme.color.mute}>{empty}</Body>
      </Glass>
    );
  }
  return (
    <Glass radius={radius.tile}>
      {rows.map((row, i) => {
        const payee = row.payee ?? NO_PAYEE;
        const date = activityDateLabel(row.date, today);
        const moneyIn = row.amount > 0;
        return (
          <View
            key={row.id}
            testID="activity-row"
            accessible
            accessibilityLabel={`${payee}, ${moneyIn ? '+' : ''}${formatMoney(row.amount)}, ${date}, ${row.account}`}
            style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.color.line }]}
          >
            <View style={{ flex: 1, gap: space.xs }}>
              <Body style={type.row} color={row.payee === null ? theme.color.mute : theme.color.ink}>
                {payee}
              </Body>
              <Label style={type.note}>{`${date} · ${row.account}`}</Label>
            </View>
            <Money
              testID={`activity-amount-${row.id}`}
              cents={row.amount}
              size={amount.row}
              plus
              color={moneyIn ? theme.color.ok : theme.color.ink}
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
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  empty: { paddingHorizontal: space.lg, paddingVertical: space.xl, alignItems: 'center' },
});
