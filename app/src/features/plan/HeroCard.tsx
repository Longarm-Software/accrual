import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { formatMoney } from '../../lib/money';
import { amount, font, radius, size, space, tint, type } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Glass } from '../../ui/Glass';
import { Money } from '../../ui/Money';
import { Label } from '../../ui/Text';
import type { HeroView } from './planSummary';

/** The top card: what is left to budget, and where the month's money went. */
export function HeroCard({ hero }: { hero: HeroView }) {
  const theme = useTheme();
  const over = hero.state === 'over';
  return (
    <Glass radius={radius.card}>
      {over ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.color.over, opacity: tint.cardOver }]} />
      ) : (
        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { opacity: tint.card }]}
        />
      )}
      <View style={{ padding: space.xl }}>
        <View accessible accessibilityLabel={`${hero.label}, ${formatMoney(hero.amount)}`}>
          <Label style={type.name}>{hero.label}</Label>
          <View style={{ marginTop: space.xs, marginBottom: space.lg }}>
            <Money cents={hero.amount} size={amount.hero} color={over ? theme.color.over : undefined} accessible={false} />
          </View>
        </View>
        <FlowBar flow={hero.flow} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: space.md, marginTop: space.md }}>
          <FlowKey text={hero.spentText} />
          <FlowKey text={hero.setAsideText} />
          <FlowKey text={hero.freeText} />
        </View>
      </View>
    </Glass>
  );
}

/** Spent, set aside and free, side by side; a part that is nothing is left out. */
function FlowBar({ flow }: { flow: HeroView['flow'] }) {
  const theme = useTheme();
  const part = { height: '100%', borderRadius: radius.pill } as const;
  return (
    <View
      style={{ flexDirection: 'row', gap: size.flowGap, height: size.flow, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: theme.color.track }}
    >
      {flow.spent > 0 && <View style={[part, { flex: flow.spent, backgroundColor: theme.color.ink, opacity: tint.spent }]} />}
      {flow.setAside > 0 && <View style={[part, { flex: flow.setAside, backgroundColor: theme.color.ink, opacity: tint.setAside }]} />}
      {flow.free > 0 && (
        <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[part, { flex: flow.free }]} />
      )}
    </View>
  );
}

/** "Still set aside $2,464", with the amount in ink and the words quieter. */
function FlowKey({ text }: { text: string }) {
  const theme = useTheme();
  const cut = text.lastIndexOf(' ');
  return (
    <Label style={type.note}>
      {text.slice(0, cut + 1)}
      <Label style={[type.note, { fontFamily: font.semibold }]} color={theme.color.ink}>
        {text.slice(cut + 1)}
      </Label>
    </Label>
  );
}
