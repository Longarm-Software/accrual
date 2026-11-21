import { Pressable, View } from 'react-native';

import { radius, sheet, size, space, tint, type, withAlpha } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Chevron } from '../../ui/Chevron';
import { Glass } from '../../ui/Glass';
import { Body, Label } from '../../ui/Text';
import type { Bite } from '../quickAdd/bite';
import { BiteBar } from '../quickAdd/BiteBar';
import { Figures, Warning } from '../quickAdd/CategoryCard';
import type { SheetDensity } from '../quickAdd/sheetLayout';
import { potCardLabel, type Gain } from './pots';

type Props = {
  label: 'From' | 'To';
  name: string | null;
  /** A bite on the from pot, a gain on the to pot; null with no pot. */
  bar: Bite | Gain | null;
  onPress(): void;
  /** Compact on a short screen, as quick add's category card. */
  density?: SheetDensity;
  /** Off while the move is under way: the card cannot be changed. */
  disabled?: boolean;
};

const isBite = (bar: Bite | Gain): bar is Bite => 'taken' in bar;

/**
 * One side of a move: FROM or TO, the pot's name, "Change ›" (or "Choose ›" with no pot), and
 * its bar — the bite the move takes from the from pot, or the gain it brings the to pot — with
 * what the pot has now and what it will have after. Quick add's category card, with a label:
 * it shares that card's figures and warning strip, so the two sheets read alike. More than the
 * from pot has gives the coral edge and the warning under the card; a gain that leaves the pot
 * still below zero has its "after" in coral.
 */
export function PotCard({ label, name, bar, onPress, density = 'regular', disabled = false }: Props) {
  const theme = useTheme();
  const inset = sheet[density].inset;
  const bite = bar && isBite(bar) ? bar : null;
  const over = bite?.state === 'over';
  // The bite's state or the gain's tone decides; this only maps it to a colour.
  const afterOver = bar !== null && (isBite(bar) ? bar.state === 'over' : bar.tone === 'over');

  return (
    <View style={{ gap: space.sm }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={potCardLabel(label, name, bar)}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? tint.pressed : 1 })}
      >
        <Glass
          testID="pot-card"
          radius={radius.pot}
          style={over && { borderWidth: size.border, borderColor: withAlpha(theme.color.over, tint.potOverEdge) }}
        >
          <View style={{ minHeight: size.touch, paddingHorizontal: space.lg, paddingVertical: inset, gap: inset }}>
            <View style={{ gap: space.xs }}>
              <Label style={type.caps}>{label.toUpperCase()}</Label>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <Body style={[type.heading, { flex: 1 }]} color={name === null ? theme.color.mute : theme.color.ink}>
                  {name ?? 'Not chosen'}
                </Body>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                  <Label style={type.figure}>{name === null ? 'Choose' : 'Change'}</Label>
                  <Chevron direction="forward" size={size.chevronSmall} color={theme.color.mute} />
                </View>
              </View>
            </View>
            {name !== null && bar && (
              <View style={{ gap: space.sm }}>
                {isBite(bar) ? (
                  <BiteBar kept={bar.kept} taken={bar.taken} state={bar.state} />
                ) : (
                  <BiteBar kept={bar.kept} gained={bar.gained} />
                )}
                <Figures before={bar.before} after={bar.after} afterColor={afterOver ? theme.color.over : theme.color.ok} />
              </View>
            )}
          </View>
        </Glass>
      </Pressable>
      {bite?.warning && <Warning text={bite.warning} density={density} />}
    </View>
  );
}
