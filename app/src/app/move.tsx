import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Engine } from '../engine/types';
import { PotCard } from '../features/move/PotCard';
import { useMoveSheet, type MoveSheetReady } from '../features/move/useMoveSheet';
import { canChange, parseMoveParams, type MoveLink } from '../features/plan/planActions';
import { getPlanShown, getPlanToday } from '../features/plan/planSignal';
import { AmountDisplay } from '../features/quickAdd/AmountDisplay';
import { Keypad } from '../features/quickAdd/Keypad';
import { PickerList } from '../features/quickAdd/PickerList';
import { moreBelow, sheetDensity } from '../features/quickAdd/sheetLayout';
import { useSession } from '../session/SessionProvider';
import { radius, size, space, tint, type, withAlpha, sheet } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { AuroraBackground } from '../ui/AuroraBackground';
import { Button } from '../ui/Button';
import { Centre, Message } from '../ui/Centre';
import { Chevron } from '../ui/Chevron';
import { Glass } from '../ui/Glass';
import { SheetHeader } from '../ui/SheetHeader';
import { Spinner } from '../ui/Spinner';
import { Body } from '../ui/Text';

/**
 * Moving money between two pots (a category, or Ready to budget), presented as a modal over the
 * Plan or the category screen (see _layout.tsx). Assigning is a move from Ready to budget; fixing
 * an overbudgeted month, a move to it. Cancel, the system back button and swiping the sheet
 * down close it without moving anything.
 *
 * It acts on the month the Plan is showing when it opens, read from the Plan as quick add reads
 * its "today". Opened any other way (a deep link, no open budget, no Plan behind it) or for a
 * month before the current one, it goes to "/" without showing a form.
 */
export default function Move() {
  const session = useSession();
  const params = useLocalSearchParams();
  const [opened] = useState(() => ({ shown: getPlanShown(), today: getPlanToday(), link: parseMoveParams(params) }));
  const { shown, today, link } = opened;
  if (session.status !== 'open' || !session.engine || shown === null || today === null || !canChange(shown.month, today)) {
    return <Redirect href="/" />;
  }
  return <Sheet engine={session.engine} month={shown.month} link={link} />;
}

const close = () => router.back();

function Sheet({ engine, month, link }: { engine: Engine; month: string; link: MoveLink }) {
  const move = useMoveSheet(engine, month, link, { onDone: close });
  return (
    <AuroraBackground>
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <SheetHeader
          title={move.state === 'ready' ? move.view.title : 'Move money'}
          onCancel={close}
          cancelDisabled={move.state === 'ready' && move.saving}
        />
        {move.state === 'loading' && (
          <Centre>
            <Spinner />
          </Centre>
        )}
        {move.state === 'failed' && (
          <Centre>
            <Message text="Could not read this budget." />
            <Button title="Try again" onPress={move.retry} />
          </Centre>
        )}
        {move.state === 'ready' && <Form move={move} />}
      </SafeAreaView>
    </AuroraBackground>
  );
}

type Picker = 'from' | 'to' | null;

/**
 * The form: the amount, the From card, the swap control, the To card, and the keypad fixed at
 * the bottom. A pot card opens its list in place of the form, as quick add's category card does.
 * On a short screen (or with large text) it is compact, as quick add is; what does not fit
 * scrolls, with a fade at the bottom while there is more.
 */
function Form({ move }: { move: MoveSheetReady }) {
  const theme = useTheme();
  const { bottom } = useSafeAreaInsets();
  const [picker, setPicker] = useState<Picker>(null);
  const { height, fontScale } = useWindowDimensions();
  const density = sheetDensity(height, fontScale);
  const [scroll, setScroll] = useState({ offset: 0, viewport: 0, content: 0 });

  if (picker !== null) {
    const from = picker === 'from';
    return (
      <View style={{ flex: 1, padding: space.lg, paddingBottom: space.lg + bottom }}>
        <PickerList
          title={from ? 'Move from' : 'Move to'}
          items={from ? move.fromChoices : move.toChoices}
          selectedId={from ? move.fromId : move.toId}
          detail={item => item.detail}
          onPick={item => {
            if (from) move.pickFrom(item.id);
            else move.pickTo(item.id);
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      </View>
    );
  }

  const { gap } = sheet[density];
  const { view } = move;
  return (
    <View testID="sheet-form" style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <ScrollView
          testID="sheet-scroll"
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: gap, gap }}
          onLayout={e => setScroll(s => ({ ...s, viewport: e.nativeEvent.layout.height }))}
          onContentSizeChange={(_w, h) => setScroll(s => ({ ...s, content: h }))}
          onScroll={e => setScroll(s => ({ ...s, offset: e.nativeEvent.contentOffset.y }))}
          scrollEventThrottle={16}
        >
          <AmountDisplay text={move.amount} density={density} />
          <View style={{ gap: space.sm }}>
            <PotCard label="From" name={view.from.name} bar={view.from.bite} onPress={() => setPicker('from')} density={density} />
            <SwapButton onPress={move.swap} />
            <PotCard label="To" name={view.to.name} bar={view.to.gain} onPress={() => setPicker('to')} density={density} />
          </View>
          {move.error && (
            <Body style={[type.notice, { textAlign: 'center' }]} color={theme.color.over} accessibilityLiveRegion="polite">
              {move.error}
            </Body>
          )}
        </ScrollView>
        {moreBelow(scroll) && (
          <LinearGradient
            testID="more-below"
            pointerEvents="none"
            colors={[withAlpha(theme.color.page, 0), theme.color.page]}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: space.xl }}
          />
        )}
      </View>
      {/* Clear of the home indicator on iOS and of Android's navigation bar, drawn over the page. */}
      <View style={{ paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: gap + bottom }}>
        <Keypad
          sign={false}
          onKey={move.press}
          onSave={() => void move.save()}
          canSave={move.canSave}
          over={view.over}
          saveLabel={view.button}
          density={density}
        />
      </View>
    </View>
  );
}

/** The round control between the two cards: From and To change places. */
function SwapButton({ onPress }: { onPress(): void }) {
  const theme = useTheme();
  const slop = (size.touch - size.control) / 2;
  return (
    <View style={{ alignItems: 'center' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Swap From and To"
        onPress={onPress}
        hitSlop={slop}
        style={({ pressed }) => ({ opacity: pressed ? tint.pressed : 1 })}
      >
        <Glass
          radius={radius.pill}
          style={{ width: size.control, height: size.control, alignItems: 'center', justifyContent: 'center', gap: space.xs }}
        >
          <View style={{ transform: [{ rotate: '90deg' }] }}>
            <Chevron direction="back" size={size.chevronSmall} color={theme.color.ink} />
          </View>
          <View style={{ transform: [{ rotate: '90deg' }] }}>
            <Chevron direction="forward" size={size.chevronSmall} color={theme.color.ink} />
          </View>
        </Glass>
      </Pressable>
    </View>
  );
}
