import { Pressable, View } from 'react-native';

import type { PlanCategory } from '../../engine/types';
import { radius, size, space, tint, type, withAlpha } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Glass } from '../../ui/Glass';
import { Money } from '../../ui/Money';
import { ProgressBar } from '../../ui/ProgressBar';
import { Label } from '../../ui/Text';
import type { CategoryView } from './categoryView';
import { noteIsColoured, rowAmountSize, statusColor, tileLabel } from './tile';

type Props = {
  category: PlanCategory;
  view: CategoryView;
  compact: boolean;
  /** The amount's size, shared by the row (`rowAmountSize`). Alone, the tile picks its own. */
  amountSize?: number;
  /** Given, the whole tile is one button that opens the category. */
  onPress?(): void;
};

/**
 * One category. Compact, it is a tile two to a row: name, amount, bar, note, with the
 * amount pushed to the bottom so tiles side by side line up whatever the name's length.
 * Not compact (large text, one column), it is a row: name and note on the left, the
 * amount on the right, the bar underneath.
 *
 * With `onPress` the tile is one button, read out as before with a hint that it opens the
 * category. The button grows as the tile does, so tiles in a row keep one height.
 */
export function CategoryTile({ category, view, compact, amountSize = rowAmountSize([category.balance]), onPress }: Props) {
  const theme = useTheme();
  const c = theme.color[statusColor(view.status)];
  const over = view.status === 'over';

  const name = (
    <Label numberOfLines={2} style={type.name}>
      {category.name}
    </Label>
  );
  const money = (
    <Money cents={category.balance} size={amountSize} color={c} accessible={false} />
  );
  const note = (
    <Label numberOfLines={compact ? 1 : undefined} style={type.note} color={noteIsColoured(view.status) ? c : theme.color.mute}>
      {view.note}
    </Label>
  );
  const bar = <ProgressBar fill={view.fill} color={c} />;

  const label = tileLabel(category, view);
  const tile = (
    <Glass
      radius={radius.tile}
      style={[{ flexGrow: 1 }, over && { borderWidth: size.border, borderColor: withAlpha(c, tint.tileOverEdge) }]}
    >
      <View
        accessible={!onPress}
        accessibilityLabel={onPress ? undefined : label}
        style={{ flexGrow: 1, padding: compact ? space.md : space.lg }}
      >
        {compact ? (
          <>
            {name}
            <View style={{ marginTop: 'auto', paddingTop: space.sm, gap: space.sm }}>
              {money}
              {bar}
              {note}
            </View>
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <View style={{ flex: 1, gap: space.xs }}>
                {name}
                {note}
              </View>
              {money}
            </View>
            <View style={{ marginTop: space.md }}>{bar}</View>
          </>
        )}
      </View>
    </Glass>
  );
  if (!onPress) return tile;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={`Opens ${category.name}`}
      onPress={onPress}
      style={({ pressed }) => ({ flexGrow: 1, opacity: pressed ? tint.pressed : 1 })}
    >
      {tile}
    </Pressable>
  );
}
