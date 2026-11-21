import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Engine } from '../engine/types';
import { targetLabel, type CoverView } from '../features/move/cover';
import { SourceRow } from '../features/move/SourceRow';
import { useCoverSheet, type CoverSheetReady } from '../features/move/useCoverSheet';
import { canChange, parseCoverParams } from '../features/plan/planActions';
import { getPlanShown, getPlanToday } from '../features/plan/planSignal';
import { BiteBar } from '../features/quickAdd/BiteBar';
import { Figures } from '../features/quickAdd/CategoryCard';
import { useSession } from '../session/SessionProvider';
import { radius, size, space, type } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { AuroraBackground } from '../ui/AuroraBackground';
import { Button } from '../ui/Button';
import { Centre, Message } from '../ui/Centre';
import { Glass } from '../ui/Glass';
import { SheetHeader } from '../ui/SheetHeader';
import { Spinner } from '../ui/Spinner';
import { Body, Label } from '../ui/Text';

/**
 * Covering a category's overspending, presented as a modal over the Plan or the category screen
 * (see _layout.tsx). The amount is already known, so there is no keypad: the person picks which
 * pot pays, and one is preselected. Cancel, the system back button and swiping the sheet down
 * close it without covering.
 *
 * It acts on the month the Plan is showing when it opens. Opened any other way (a deep link, no
 * open budget, no Plan behind it), for a month before the current one, or for a category that is
 * not overspent, it goes to "/" without showing a form.
 */
export default function Cover() {
  const session = useSession();
  const params = useLocalSearchParams();
  const [opened] = useState(() => ({ shown: getPlanShown(), today: getPlanToday(), link: parseCoverParams(params) }));
  const { shown, today, link } = opened;
  if (
    session.status !== 'open' || !session.engine || shown === null || today === null ||
    !canChange(shown.month, today) || link.category === undefined
  ) {
    return <Redirect href="/" />;
  }
  return <Sheet engine={session.engine} month={shown.month} category={link.category} />;
}

const close = () => router.back();

function Sheet({ engine, month, category }: { engine: Engine; month: string; category: string }) {
  const cover = useCoverSheet(engine, month, category, { onDone: close });
  if (cover.state === 'nothing') return <Redirect href="/" />;
  return (
    <AuroraBackground>
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <SheetHeader
          title={cover.state === 'ready' ? cover.view.title : 'Cover'}
          onCancel={close}
          cancelDisabled={cover.state === 'ready' && cover.saving}
        />
        {cover.state === 'loading' && (
          <Centre>
            <Spinner />
          </Centre>
        )}
        {cover.state === 'failed' && (
          <Centre>
            <Message text="Could not read this budget." />
            <Button title="Try again" onPress={cover.retry} />
          </Centre>
        )}
        {cover.state === 'done' && (
          <Centre>
            <Message text={cover.message} />
            <Button title="Close" variant="quiet" onPress={close} />
          </Centre>
        )}
        {cover.state === 'ready' && <Form cover={cover} />}
      </SafeAreaView>
    </AuroraBackground>
  );
}

/**
 * The overspent category's card, filling with the cover; "Take $28.10 from" and the pots that
 * could pay, one chosen; and the button, full width at the bottom, clear of the home indicator
 * and of Android's navigation bar.
 */
function Form({ cover }: { cover: CoverSheetReady }) {
  const theme = useTheme();
  const { bottom } = useSafeAreaInsets();
  const { view } = cover;
  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: space.lg, gap: space.lg }}>
        <Target view={view} />
        <View style={{ gap: space.md }}>
          <Label style={type.figure}>{view.take}</Label>
          <View testID="cover-sources" accessibilityRole="radiogroup" style={{ gap: space.md }}>
            {view.sources.map(source => (
              <SourceRow key={source.id} source={source} selected={source.id === view.selected} onPress={() => cover.choose(source.id)} />
            ))}
          </View>
        </View>
        {cover.error && (
          <Body style={[type.notice, { textAlign: 'center' }]} color={theme.color.over} accessibilityLiveRegion="polite">
            {cover.error}
          </Body>
        )}
      </ScrollView>
      <View testID="cover-footer" style={{ paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.lg + bottom }}>
        <Button title={view.button} onPress={() => void cover.save()} disabled={!cover.canSave} />
      </View>
    </View>
  );
}

/** The overspent category: its deficit filling in, what it has now, and after (coral while still below zero). */
function Target({ view }: { view: CoverView }) {
  const theme = useTheme();
  const { target } = view;
  return (
    <Glass testID="cover-target" radius={radius.pot}>
      <View
        accessible
        accessibilityLabel={targetLabel(view)}
        style={{ minHeight: size.touch, paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.sm }}
      >
        <Body style={type.heading}>{view.name}</Body>
        <BiteBar kept={target.kept} gained={target.gained} />
        <Figures before={target.before} after={target.after} afterColor={target.tone === 'over' ? theme.color.over : theme.color.ok} />
      </View>
    </Glass>
  );
}
