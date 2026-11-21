import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, size, space, tint, type } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Glass } from '../../ui/Glass';
import { Tick } from '../../ui/Tick';
import { Body, Label } from '../../ui/Text';
import type { RowDetail } from './draft';

type Props<T extends Item> = {
  title: string;
  items: T[];
  selectedId: string | null;
  /** A row's detail, already decided (text and tone); the list only maps the tone to a colour. */
  detail?(item: T): RowDetail | undefined;
  onPick(item: T): void;
  onClose(): void;
  /** A first row meaning "none of these"; it is the selected row when `selectedId` is null. */
  noneLabel?: string;
  onPickNone?(): void;
};

/** A row: `disabled` rows are dimmed and cannot be picked (a pot with nothing to move). */
type Item = { id: string; name: string; disabled?: boolean };

/**
 * A list that fills the sheet: a title, Close, and one row per item, the selected one ticked.
 * A row may carry a detail at its right, such as a category's balance.
 */
export function PickerList<T extends Item>({
  title,
  items,
  selectedId,
  detail,
  onPick,
  onClose,
  noneLabel,
  onPickNone,
}: Props<T>) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Body style={[type.heading, { flex: 1 }]} accessibilityRole="header">
          {title}
        </Body>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          style={({ pressed }) => ({
            minHeight: size.touch,
            minWidth: size.touch,
            paddingHorizontal: space.sm,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? tint.pressed : 1,
          })}
        >
          <Label style={type.row} color={theme.color.goal}>
            Close
          </Label>
        </Pressable>
      </View>
      <Glass radius={radius.tile} style={{ flexShrink: 1 }}>
        <FlatList
          testID="picker-list"
          data={items}
          // The bar would be drawn inside the card's rounded right edge; the list is short and
          // its last row shows where it ends.
          showsVerticalScrollIndicator={false}
          keyExtractor={item => item.id}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={Separator}
          ListHeaderComponent={
            noneLabel !== undefined ? (
              <>
                <Row name={noneLabel} selected={selectedId === null} onPress={() => onPickNone?.()} />
                {items.length > 0 && <Separator />}
              </>
            ) : undefined
          }
          renderItem={({ item }) => (
            <Row
              name={item.name}
              detail={detail?.(item)}
              selected={item.id === selectedId}
              disabled={item.disabled === true}
              onPress={() => onPick(item)}
            />
          )}
        />
      </Glass>
    </View>
  );
}

type RowProps = { name: string; detail?: RowDetail; selected: boolean; disabled?: boolean; onPress: () => void };

function Row({ name, detail, selected, disabled = false, onPress }: RowProps) {
  const theme = useTheme();
  const toneColor = { over: theme.color.over, mute: theme.color.mute };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={detail ? `${name}, ${detail.text}` : name}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { opacity: disabled ? tint.disabled : pressed ? tint.pressed : 1 }]}
    >
      <View style={styles.mark}>{selected && <Tick testID="picker-tick" size={size.tickSmall} color={theme.color.ok} />}</View>
      <Text style={[type.row, { flex: 1, color: theme.color.ink }]}>{name}</Text>
      {detail !== undefined && <Text style={[type.figure, styles.detail, { color: toneColor[detail.tone] }]}>{detail.text}</Text>}
    </Pressable>
  );
}

function Separator() {
  const theme = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.color.line, marginLeft: space.lg + size.tickSmall + space.md }} />;
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
  mark: { width: size.tickSmall, alignItems: 'center' },
  detail: { fontVariant: ['tabular-nums'], flexShrink: 0, maxWidth: '50%' },
});
