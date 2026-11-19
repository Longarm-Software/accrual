import { Pressable, Text, View } from 'react-native';

import { font, radius, sheet, size, space, tint, type, withAlpha } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Chevron } from '../../ui/Chevron';
import { Glass } from '../../ui/Glass';
import { Body, Label } from '../../ui/Text';
import type { Bite } from './bite';
import { BiteBar } from './BiteBar';
import type { SheetDensity } from './sheetLayout';

type Props = {
  name: string | null;
  suggested: boolean;
  bite: Bite | null;
  onPress(): void;
  /** Compact on a short screen: tighter inside, so the card and its bite fit above the keypad. */
  density?: SheetDensity;
};

/** What a screen reader says for the whole card, with the warning when there is one: the strip under it is not announced on iOS. */
export function categoryCardLabel(name: string | null, suggested: boolean, bite: Bite | null): string {
  if (name === null) return 'No category, choose one';
  const parts = [name];
  if (suggested) parts.push('suggested');
  if (bite) parts.push(`${bite.before} now`, bite.after);
  const label = parts.join(', ');
  return bite?.warning ? `${label}. ${bite.warning}` : label;
}

/**
 * The category on quick add: its name, "Suggested ›" or "Change ›", and the bite — what the
 * category has now, what this purchase takes, what will be left. Pressing it opens the list.
 * With no category it says so and offers "Choose ›". Income (`bite` null) shows the name only.
 * When the purchase is more than the category has, the card takes a coral edge and the warning
 * sits directly under it.
 */
export function CategoryCard({ name, suggested, bite, onPress, density = 'regular' }: Props) {
  const theme = useTheme();
  const inset = sheet[density].inset;
  const over = bite?.state === 'over';
  const action = name === null ? 'Choose' : suggested ? 'Suggested' : 'Change';
  const afterColor = over ? theme.color.over : theme.color.ok;

  return (
    <View style={{ gap: space.sm }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={categoryCardLabel(name, suggested, bite)}
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? tint.pressed : 1 })}
      >
        <Glass
          testID="category-card"
          radius={radius.pot}
          style={over && { borderWidth: size.border, borderColor: withAlpha(theme.color.over, tint.potOverEdge) }}
        >
          <View style={{ minHeight: size.touch, justifyContent: 'center', paddingHorizontal: space.lg, paddingVertical: inset, gap: inset }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <Body style={[type.heading, { flex: 1 }]} color={name === null ? theme.color.mute : theme.color.ink}>
                {name ?? 'No category'}
              </Body>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                <Label style={type.figure}>{action}</Label>
                <Chevron direction="forward" size={size.chevronSmall} color={theme.color.mute} />
              </View>
            </View>
            {name !== null && bite && (
              <View style={{ gap: space.sm }}>
                <BiteBar kept={bite.kept} taken={bite.taken} state={bite.state} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', columnGap: space.md }}>
                  <Text style={[type.figure, styles.figures, { color: theme.color.mute }]}>{bite.before}</Text>
                  <Text style={[type.figure, styles.figures, { fontFamily: font.semibold, color: afterColor }]}>{bite.after}</Text>
                </View>
              </View>
            )}
          </View>
        </Glass>
      </Pressable>
      {bite?.warning && (
        <Glass radius={radius.field} style={{ paddingHorizontal: space.lg, paddingVertical: inset }}>
          {/* Android announces it as it appears. iOS has no live region, so the card's label says it
              instead, and the strip is hidden from VoiceOver so it is not read twice. */}
          <Body style={type.notice} accessibilityLiveRegion="polite" accessibilityElementsHidden>
            {bite.warning}
          </Body>
        </Glass>
      )}
    </View>
  );
}

const styles = { figures: { fontVariant: ['tabular-nums' as const] } };
