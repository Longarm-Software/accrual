import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState, useSyncExternalStore } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Engine, PlanCategory, PlanMonth } from '../../engine/types';
import { ActivityList } from '../../features/move/ActivityList';
import { activityHeading, detailRows, NOT_IN_BUDGET } from '../../features/move/categoryDetail';
import { DetailRows } from '../../features/move/DetailRows';
import { useCategoryActivity } from '../../features/move/useCategoryActivity';
import { categoryView } from '../../features/plan/categoryView';
import { categoryAction, parseId } from '../../features/plan/planActions';
import { getPlanShown, getPlanToday, onPlanShownChange, onPlanTodayChange } from '../../features/plan/planSignal';
import { noteIsColoured, statusColor, tileLabel } from '../../features/plan/tile';
import { monthLabel } from '../../lib/month';
import { useSession } from '../../session/SessionProvider';
import { amount, size, space, tint, type } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { AuroraBackground } from '../../ui/AuroraBackground';
import { BottomFade } from '../../ui/BottomFade';
import { Button } from '../../ui/Button';
import { Message } from '../../ui/Centre';
import { Chevron } from '../../ui/Chevron';
import { Money } from '../../ui/Money';
import { ProgressBar } from '../../ui/ProgressBar';
import { Spinner } from '../../ui/Spinner';
import { Body, Label, Title } from '../../ui/Text';

/**
 * One category in one month, pushed over the Plan (see _layout.tsx): what it has, how that came
 * about, its month's transactions (read-only), and the button that moves money or covers it.
 * Back, Android's system back and iOS's swipe all return to the Plan, which stays mounted under
 * it with its scroll position.
 *
 * It shows the month the Plan was showing when it opened, and draws the category from the
 * Plan's own read of that month (published in planSignal), so after a move, a cover or a sync
 * the Plan reads once and both screens show it. Should the Plan move to another month under it
 * (back from the background on a new month), it keeps the last read of its own month. Opened
 * with no open budget or no Plan behind it (a deep link), it goes to "/".
 */
export default function Category() {
  const session = useSession();
  const params = useLocalSearchParams<{ id: string }>();
  const [opened] = useState(() => ({ shown: getPlanShown(), today: getPlanToday() }));
  const shown = useSyncExternalStore(onPlanShownChange, getPlanShown);
  const today = useSyncExternalStore(onPlanTodayChange, getPlanToday) ?? opened.today;
  const month = opened.shown?.month ?? null;
  // The Plan's read of this screen's month, kept once seen: the Plan publishes nothing while
  // it reads another month.
  const live = month !== null && shown?.month === month ? shown.plan : null;
  const [kept, setKept] = useState<PlanMonth | null>(opened.shown?.plan ?? null);
  if (live !== null && live !== kept) setKept(live);
  const plan = live ?? kept;

  if (session.status !== 'open' || !session.engine || month === null || plan === null || today === null) {
    return <Redirect href="/" />;
  }
  const id = parseId(params.id);
  const category = id === null ? undefined : plan.groups.flatMap(g => g.categories).find(c => c.id === id);
  return (
    <AuroraBackground>
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        {category ? (
          <Detail engine={session.engine} category={category} plan={plan} today={today} />
        ) : (
          <View style={{ padding: space.lg, gap: space.xl }}>
            <BackButton />
            <Message text={NOT_IN_BUDGET} />
          </View>
        )}
      </SafeAreaView>
      <BottomFade />
    </AuroraBackground>
  );
}

type DetailProps = { engine: Engine; category: PlanCategory; plan: PlanMonth; today: Date };

function Detail({ engine, category, plan, today }: DetailProps) {
  const theme = useTheme();
  const { bottom } = useSafeAreaInsets();
  const activity = useCategoryActivity(engine, category.id, plan.month, plan);
  const view = categoryView(category, { month: plan.month, today });
  const c = theme.color[statusColor(view.status)];
  const action = categoryAction(plan, category.id, today);
  const { name, year } = monthLabel(plan.month);

  return (
    <ScrollView
      testID="category-scroll"
      // One page: the figures and the transactions scroll together, clear of the navigation bar.
      contentContainerStyle={{ padding: space.lg, paddingBottom: space.xl + bottom, gap: space.lg }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <BackButton />
        <View style={{ flex: 1 }}>
          <Body style={type.month} accessibilityRole="header" numberOfLines={2}>
            {category.name}
          </Body>
          <Label style={type.note}>{`${name} ${year}`}</Label>
        </View>
      </View>
      <View accessible accessibilityLabel={tileLabel(category, view)} style={{ gap: space.sm }}>
        <Money cents={category.balance} size={amount.hero} color={c} accessible={false} />
        <ProgressBar fill={view.fill} color={c} />
        <Label style={type.notice} color={noteIsColoured(view.status) ? c : theme.color.mute}>
          {view.note}
        </Label>
      </View>
      <DetailRows rows={detailRows(category)} />
      {action && <Button title={action.label} onPress={() => router.push(action.href)} />}
      <View style={{ gap: space.md }}>
        <Title style={type.titleSmall} accessibilityRole="header">{activityHeading(plan.month, today)}</Title>
        {activity.state === 'loading' && (
          <View style={{ alignItems: 'center', paddingVertical: space.xl }}>
            <Spinner />
          </View>
        )}
        {activity.state === 'failed' && (
          <View style={{ gap: space.lg }}>
            <Body color={theme.color.mute} style={{ textAlign: 'center' }}>
              Could not read this category.
            </Body>
            <Button title="Try again" variant="quiet" onPress={activity.retry} />
          </View>
        )}
        {activity.state === 'ready' && <ActivityList rows={activity.rows} today={today} empty="Nothing spent here yet." />}
      </View>
    </ScrollView>
  );
}

function BackButton() {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={() => router.back()}
      style={({ pressed }) => ({
        width: size.touch,
        height: size.touch,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? tint.pressed : 1,
      })}
    >
      <Chevron direction="back" color={theme.color.ink} />
    </Pressable>
  );
}
