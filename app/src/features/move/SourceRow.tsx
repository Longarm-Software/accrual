import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { radius, size, space, tint, type } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Glass } from '../../ui/Glass';
import { Tick } from '../../ui/Tick';
import { Body, Label } from '../../ui/Text';
import { BiteBar } from '../quickAdd/BiteBar';
import { Figures } from '../quickAdd/CategoryCard';
import { NOT_ENOUGH, sourceLabel, type Source } from './cover';

type Props = { source: Source; selected: boolean; onPress(): void };

/**
 * One pot that could pay for a cover: its name, the bite the cover takes from it, what it has
 * now and after, and a round check mark at the right, filled on the chosen one, which also has
 * the mint edge. One that cannot cover it all says so and can still be chosen: it then covers
 * what it has.
 */
export function SourceRow({ source, selected, onPress }: Props) {
  const theme = useTheme();
  const { bite } = source;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={sourceLabel(source)}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? tint.pressed : 1 })}
    >
      <Glass
        testID="source-card"
        radius={radius.pot}
        style={selected && { borderWidth: size.border, borderColor: theme.color.ok }}
      >
        <View style={styles.inside}>
          <View style={{ flex: 1, gap: space.sm }}>
            <Body style={type.heading}>{source.name}</Body>
            <BiteBar kept={bite.kept} taken={bite.taken} state={bite.state} />
            <Figures before={bite.before} after={bite.after} afterColor={bite.state === 'over' ? theme.color.over : theme.color.ok} />
            {!source.enough && <Label style={type.note}>{NOT_ENOUGH}</Label>}
          </View>
          <Check on={selected} />
        </View>
      </Glass>
    </Pressable>
  );
}

function Check({ on }: { on: boolean }) {
  const theme = useTheme();
  const round = { width: size.check, height: size.check, borderRadius: radius.pill };
  if (!on) {
    return <View testID="source-check-off" style={[round, { borderWidth: size.stroke, borderColor: theme.color.control }]} />;
  }
  return (
    <View testID="source-check-on" style={[round, styles.on]}>
      <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Tick size={size.tickSmall} stroke={size.stroke} color={theme.color.onAccent} />
    </View>
  );
}

const styles = StyleSheet.create({
  inside: {
    minHeight: size.touch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  on: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
