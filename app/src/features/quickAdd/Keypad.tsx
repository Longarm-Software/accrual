import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, sheet, size, space, textScale, tint, type } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Spinner } from '../../ui/Spinner';
import { Tick } from '../../ui/Tick';
import type { Key } from './amountEntry';
import type { SheetDensity } from './sheetLayout';

/**
 * The +/− key is shown unless `sign` is false (a move has no sign); shown, it needs
 * `onToggleSign`, and the types refuse it without one.
 */
type SignKey = { sign?: true; onToggleSign(): void } | { sign: false; onToggleSign?: undefined };

type Props = SignKey & {
  onKey(key: Key): void;
  onSave(): void;
  canSave: boolean;
  over: boolean;
  /** A short word on Save instead of the tick ("Move"); it also names the key. */
  saveLabel?: string;
  /** Compact on a short screen: keys at the touch minimum, so the form above keeps its room. */
  density?: SheetDensity;
  /**
   * A write is under way: every key is off, and Save shows a spinner in place of its tick or
   * word, which stays laid out (unseen) so the key keeps its size.
   */
  busy?: boolean;
};

/** How often a held delete key deletes again, once the hold is recognised. */
export const REPEAT_MS = 80;

/**
 * The quick-add keypad, four columns as in the design:
 *
 *   1 2 3 ⌫
 *   4 5 6 +/−
 *   7 8 9 ✓
 *   . 0 00 ✓   (Save fills the right of the last two rows)
 *
 * With `sign={false}` the +/− cell is empty, so every other key keeps its place.
 *
 * Keys answer on every press, with no debounce, so a fast double press counts twice.
 * Holding delete repeats it until it is let go (rather than clearing), so a long amount can be
 * taken back a digit at a time without lifting the thumb, and nothing is lost to a slip.
 */
export function Keypad({ onKey, sign = true, onToggleSign, onSave, canSave, over, saveLabel, density = 'regular', busy = false }: Props) {
  const theme = useTheme();
  const height = sheet[density].key;
  const digit = (key: Key, label: string = key) => (
    <KeyButton label={label} height={height} onPress={() => onKey(key)} disabled={busy}>
      <Text style={[type.key, { color: theme.color.ink }]} maxFontSizeMultiplier={textScale.key}>
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
        <DeleteKey height={height} onDelete={() => onKey('back')} disabled={busy} />
      </View>
      <View style={styles.row}>
        {digit('4')}
        {digit('5')}
        {digit('6')}
        {sign && onToggleSign ? (
          <KeyButton label="Expense or income" height={height} onPress={onToggleSign} disabled={busy}>
            <Text style={[type.key, { color: theme.color.mute }]} maxFontSizeMultiplier={textScale.key}>
              +/−
            </Text>
          </KeyButton>
        ) : (
          <View testID="keypad-empty-cell" style={{ flex: 1, minHeight: height }} />
        )}
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
        <SaveKey height={height} onSave={onSave} canSave={canSave && !busy} over={over} label={saveLabel} busy={busy} />
      </View>
    </View>
  );
}

type KeyProps = {
  label: string;
  height: number;
  onPress: () => void;
  onLongPress?: () => void;
  onPressOut?: () => void;
  disabled?: boolean;
  children: ReactNode;
};

function KeyButton({ label, height, onPress, onLongPress, onPressOut, disabled = false, children }: KeyProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={disabled ? { disabled: true } : undefined}
      disabled={disabled}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressOut={onPressOut}
      style={({ pressed }) => [
        styles.key,
        {
          minHeight: height,
          backgroundColor: theme.color.key,
          borderColor: theme.color.keyEdge,
          opacity: pressed ? tint.pressed : 1,
        },
      ]}
    >
      {children}
    </Pressable>
  );
}

function DeleteKey({ height, onDelete, disabled }: { height: number; onDelete: () => void; disabled: boolean }) {
  // The parent may pass a new callback on every render, closed over the amount as it was then.
  // Each repeat calls the latest one, so it deletes from the amount as it is now.
  const latest = useRef(onDelete);
  latest.current = onDelete;
  const repeat = useRef<ReturnType<typeof setInterval> | null>(null);
  const stop = () => {
    if (repeat.current !== null) clearInterval(repeat.current);
    repeat.current = null;
  };
  useEffect(() => stop, []);
  // A hold that is repeating when the keys go off stops at once.
  useEffect(() => {
    if (disabled) stop();
  }, [disabled]);
  return (
    <KeyButton
      label="Delete"
      height={height}
      disabled={disabled}
      onPress={onDelete}
      // A press that became a hold does not also fire onPress, so the first delete happens here.
      onLongPress={() => {
        stop();
        onDelete();
        repeat.current = setInterval(() => latest.current(), REPEAT_MS);
      }}
      onPressOut={stop}
    >
      <DeleteMark />
    </KeyButton>
  );
}

type SaveProps = { height: number; onSave: () => void; canSave: boolean; over: boolean; label?: string; busy: boolean };

function SaveKey({ height, onSave, canSave, over, label, busy }: SaveProps) {
  const theme = useTheme();
  const ink = over ? theme.color.onOver : theme.color.onAccent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? 'Save'}
      accessibilityState={busy ? { disabled: true, busy: true } : { disabled: !canSave }}
      disabled={!canSave}
      onPress={onSave}
      style={({ pressed }) => [
        styles.key,
        { minHeight: height },
        styles.save,
        // Busy is not dimmed: the spinner on it is the point.
        { opacity: busy ? 1 : !canSave ? tint.disabled : pressed ? tint.pressed : 1 },
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
      <View style={{ opacity: busy ? 0 : 1 }}>
        {label === undefined ? (
          <Tick testID="save-tick" size={size.tick} stroke={size.tickStroke} color={ink} />
        ) : (
          <Text
            style={[type.heading, { color: ink, paddingHorizontal: space.xs }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            maxFontSizeMultiplier={textScale.key}
          >
            {label}
          </Text>
        )}
      </View>
      {busy && (
        <View style={[StyleSheet.absoluteFill, styles.centre]}>
          <Spinner size={size.spinnerInline} />
        </View>
      )}
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
    borderRadius: radius.key,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  save: { borderWidth: 0 },
  centre: { alignItems: 'center', justifyContent: 'center' },
});
