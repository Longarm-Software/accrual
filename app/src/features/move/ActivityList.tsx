import { StyleSheet, View } from 'react-native';

import type { ActivityRow } from '../../engine/types';
import { amount, radius, size, space, type } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Glass } from '../../ui/Glass';
import { Money } from '../../ui/Money';
import { Body, Label } from '../../ui/Text';
import { activityLines } from './categoryDetail';

type Props = { rows: ActivityRow[]; today: Date; empty: string };

/**
 * A category's transactions for a month, newest first as given: the payee, under it the date and
 * the account, and the amount at the right (money in mint, with a "+"). What each row says is
 * decided by `activityLines`; this maps its tones to colours.
 *
 * Not virtualised, at any length: it sits inside the category screen's single scroll view, and
 * one category's transactions in one month are few. Each row is keyed by its transaction id.
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
      {activityLines(rows, today).map((line, i) => (
        <View
          key={line.id}
          testID="activity-row"
          accessible
          accessibilityLabel={line.label}
          style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.color.line }]}
        >
          <View style={{ flex: 1, gap: space.xs }}>
            <Body style={type.row} color={line.payeeTone === 'mute' ? theme.color.mute : theme.color.ink}>
              {line.payee}
            </Body>
            <Label style={type.note}>{line.meta}</Label>
          </View>
          <Money
            testID={`activity-amount-${line.id}`}
            cents={line.amount}
            size={amount.row}
            plus={line.tone === 'in'}
            color={line.tone === 'in' ? theme.color.ok : theme.color.ink}
            accessible={false}
          />
        </View>
      ))}
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
