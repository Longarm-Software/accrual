import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, size, space, tint, type } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Tick } from '../../ui/Tick';
import type { Key } from './amountEntry';

type Props = { onKey(key: Key): void; onToggleSign(): void; onSave(): void; canSave: boolean; over: boolean };

/** How often a held delete key deletes again, once the hold is recognised. */
const REPEAT_MS = 80;

/**
 * The quick-add keypad, four columns as in the design:
 *
 *   1 2 3 ⌫
 *   4 5 6 +/−
 *   7 8 9 ✓
 *   . 0 00 ✓   (Save fills the right of the last two rows)
 *
 * Keys answer on every press, with no debounce, so a fast double press counts twice.
 * Holding delete repeats it until it is let go (rather than clearing), so a long amount can be
 * taken back a digit at a time without lifting the thumb, and nothing is lost to a slip.
 */
export function Keypad({ onKey, onToggleSign, onSave, canSave, over }: Props) {
  const theme = useTheme();
  const digit = (key: Key, label: string = key) => (
    <KeyButton label={label} onPress={() => onKey(key)}>
      <Text style={[type.key, { color: theme.color.ink }]} maxFontSizeMultiplier={2}>
        {key}
      </Text>
    </KeyButton>
  );

  return (
    <View style={styles.pad}>
      <View style={styles.row}>
        {digit('1')}
        {digit('2')}
        {digit('3')}
        <DeleteKey onDelete={() => onKey('back')} />
      </View>
      <View style={styles.row}>
        {digit('4')}
        {digit('5')}
        {digit('6')}
        <KeyButton label="Expense or income" onPress={onToggleSign}>
          <Text style={[type.key, { color: theme.color.mute }]} maxFontSizeMultiplier={2}>
            +/−
          </Text>
        </KeyButton>
      </View>
      <View style={styles.row}>
        <View style={styles.left}>
          <View style={styles.row}>
            {digit('7')}
            {digit('8')}
            {digit('9')}
          </View>
          <View style={styles.row}>
            {digit('.', 'Decimal point')}
            {digit('0')}
            {digit('00', 'Double zero')}
          </View>
        </View>
        <SaveKey onSave={onSave} canSave={canSave} over={over} />
      </View>
    </View>
  );
}

type KeyProps = {
  label: string;
  onPress: () => void;
  onLongPress?: () => void;
  onPressOut?: () => void;
  children: ReactNode;
};

function KeyButton({ label, onPress, onLongPress, onPressOut, children }: KeyProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressOut={onPressOut}
      style={({ pressed }) => [
        styles.key,
        {
          backgroundColor: theme.color.key,
          borderColor: theme.color.edge,
          opacity: pressed ? tint.pressed : 1,
        },
      ]}
    >
      {children}
    </Pressable>
  );
}

function DeleteKey({ onDelete }: { onDelete: () => void }) {
  const repeat = useRef<ReturnType<typeof setInterval> | null>(null);
  const stop = () => {
    if (repeat.current !== null) clearInterval(repeat.current);
    repeat.current = null;
  };
  useEffect(() => stop, []);
  return (
    <KeyButton
      label="Delete"
      onPress={onDelete}
      // A press that became a hold does not also fire onPress, so the first delete happens here.
      onLongPress={() => {
        stop();
        onDelete();
        repeat.current = setInterval(onDelete, REPEAT_MS);
      }}
      onPressOut={stop}
    >
      <DeleteMark />
    </KeyButton>
  );
}

function SaveKey({ onSave, canSave, over }: { onSave: () => void; canSave: boolean; over: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Save"
      accessibilityState={{ disabled: !canSave }}
      disabled={!canSave}
      onPress={onSave}
      style={({ pressed }) => [
        styles.key,
        styles.save,
        { opacity: !canSave ? tint.disabled : pressed ? tint.pressed : 1 },
        over && { backgroundColor: theme.color.over },
      ]}
    >
      {!over && (
        <LinearGradient
          testID="save-mint"
          colors={theme.gradient}
          // The design's 160° gradient: mostly top to bottom, leaning right.
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <Tick size={size.tick} stroke={size.tickStroke} color={over ? theme.color.onOver : theme.color.onAccent} />
    </Pressable>
  );
}

/**
 * The delete mark: an outline pointing left with a cross inside. The point is a square turned
 * 45 degrees with two sides drawn; its diagonal is the outline's height, so its arms meet the
 * box's top and bottom edges.
 */
function DeleteMark() {
  const theme = useTheme();
  const h = size.deleteMark;
  const side = h / Math.SQRT2;
  const body = h; // the box to the right of the point is as wide as it is tall
  const line = { borderColor: theme.color.mute };
  const bar = { position: 'absolute' as const, width: h / 2, height: size.stroke, backgroundColor: theme.color.mute };
  return (
    <View style={{ width: h / 2 + body, height: h }}>
      <View
        style={[
          line,
          {
            position: 'absolute',
            left: h / 2 - side / 2,
            top: h / 2 - side / 2,
            width: side,
            height: side,
            borderLeftWidth: size.stroke,
            borderBottomWidth: size.stroke,
            transform: [{ rotate: '45deg' }],
          },
        ]}
      />
      <View
        style={[
          line,
          {
            position: 'absolute',
            left: h / 2,
            top: 0,
            width: body,
            height: h,
            borderTopWidth: size.stroke,
            borderRightWidth: size.stroke,
            borderBottomWidth: size.stroke,
            borderTopRightRadius: size.stroke * 2,
            borderBottomRightRadius: size.stroke * 2,
          },
        ]}
      />
      <View style={[bar, { left: h / 2 + body / 2 - h / 4 - size.stroke / 2, top: h / 2 - size.stroke / 2, transform: [{ rotate: '45deg' }] }]} />
      <View style={[bar, { left: h / 2 + body / 2 - h / 4 - size.stroke / 2, top: h / 2 - size.stroke / 2, transform: [{ rotate: '-45deg' }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { gap: space.sm },
  row: { flexDirection: 'row', gap: space.sm },
  // Three keys and their two gaps, against Save's one key: the free width is shared 3 to 1 after
  // the gaps are set aside, so these columns line up exactly with the keys of the rows above.
  left: { flexGrow: 3, flexShrink: 1, flexBasis: space.sm * 2, gap: space.sm },
  key: {
    flex: 1,
    minHeight: size.key,
    borderRadius: radius.key,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  save: { borderWidth: 0 },
});
