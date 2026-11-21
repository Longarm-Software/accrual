import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { autorunConfig } from '../dev/autorun';
import type { Engine, PlanCategory, PlanMonth } from '../engine/types';
import { AccountMenu } from '../features/plan/AccountMenu';
import { ADD_BUTTON_CLEARANCE, AddButton } from '../features/plan/AddButton';
import { CategoryTile } from '../features/plan/CategoryTile';
import { categoryView } from '../features/plan/categoryView';
import { afterReturn } from '../features/plan/foreground';
import { GroupHeader } from '../features/plan/GroupHeader';
import { HeroCard } from '../features/plan/HeroCard';
import { MonthSwitcher } from '../features/plan/MonthSwitcher';
import { Notice } from '../features/plan/Notice';
import { onSaved, setPlanToday } from '../features/plan/planSignal';
import { groupAvailable, hasCategories, heroView, overspentNotice, syncLabel } from '../features/plan/planSummary';
import { rowAmountSize } from '../features/plan/tile';
import { usePlanMonth } from '../features/plan/usePlanMonth';
import { useReturnToForeground } from '../features/plan/useReturnToForeground';
import { now } from '../lib/clock';
import { compareMonths, currentMonth } from '../lib/month';
import { useSession } from '../session/SessionProvider';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { AuroraBackground } from '../ui/AuroraBackground';
import { BottomFade } from '../ui/BottomFade';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { Spinner } from '../ui/Spinner';
import { Body } from '../ui/Text';

/**
 * From this text size up (the person's own setting), tiles go one to a row and show in full.
 * A hair under 1.3, because Android keeps the scale as a 32-bit float and its largest
 * setting arrives as 1.2999999523162842.
 */
const LARGE_TEXT = 1.29;

export default function Home() {
  const session = useSession();
  if (autorunConfig) return <Redirect href="/dev-check" />;
  if (session.status === 'loading') return <AuroraBackground>{null}</AuroraBackground>;
  if (session.status === 'signedOut' || session.status === 'needsBudget') return <Redirect href="/connect" />;
  if (session.status === 'closed') return <Redirect href="/opening" />;
  if (!session.engine) return <AuroraBackground>{null}</AuroraBackground>;
  return (
    // No key is needed to start afresh on a new engine: signing out, choosing a budget or a
    // failed open all leave the 'open' status, which unmounts Plan through a redirect, and
    // status is never 'open' across two engines. (The session token must not be a key: React
    // DevTools and development warnings can show keys.)
    <Plan
      engine={session.engine}
      budgetName={session.saved?.budget?.name ?? ''}
      onSignOut={() => void session.signOut()}
    />
  );
}

type PlanProps = { engine: Engine; budgetName: string; onSignOut: () => void };

/**
 * The month's budget. "Today" is read here when the screen opens, and again when the app comes
 * back from the background: it picks the month, drives the pace notes, and dates what quick add
 * saves. A phone that keeps the app in memory overnight shows the new day on coming back.
 */
function Plan({ engine, budgetName, onSignOut }: PlanProps) {
  const theme = useTheme();
  // The person's text size; the hook re-renders when they change it in Settings.
  const { fontScale } = useWindowDimensions();
  // Android draws the page under the navigation bar: the last tile must scroll clear of it.
  const { bottom } = useSafeAreaInsets();
  const [today, setToday] = useState(now);
  const [month, setMonth] = useState(() => currentMonth(today));
  // Signing out when the session has expired is the same path as the menu's Sign out.
  const plan = usePlanMonth(engine, month, { onSessionExpired: onSignOut });
  const { load, bounds } = plan;

  // Coming back from the background: a new day, perhaps a new month, then the same sync and
  // read as a pull, without its spinner (see afterReturn for when it is skipped). The sync
  // starts once the new month is on screen, so its read is of that month: it is asked for here
  // and started by the effect below, after the render that shows it.
  const [returns, setReturns] = useState(0);
  useReturnToForeground(() => {
    const next = afterReturn({ today, month }, now(), plan.lastSynced());
    setToday(next.today);
    setMonth(next.month);
    if (next.sync) setReturns(n => n + 1);
  });
  const refreshInBackground = useRef(plan.refreshInBackground);
  useEffect(() => {
    refreshInBackground.current = plan.refreshInBackground;
  }, [plan.refreshInBackground]);
  useEffect(() => {
    if (returns > 0) void refreshInBackground.current();
  }, [returns]);

  // Quick add is another route: it dates its transaction with this screen's "today" (renewed
  // above, so a sheet opened after midnight dates the new day; a sheet already open keeps the
  // day it opened with, see add.tsx), and says when it has saved one, so the month is read
  // again and then synced, through the same path as a pull. The latest `afterSave` is kept in
  // a ref, so the subscription is made once.
  useEffect(() => {
    setPlanToday(today);
    return () => setPlanToday(null);
  }, [today]);
  const afterSave = useRef(plan.afterSave);
  useEffect(() => {
    afterSave.current = plan.afterSave;
  }, [plan.afterSave]);
  useEffect(() => onSaved(() => void afterSave.current()), []);

  const account = <AccountMenu budgetName={budgetName} onSignOut={onSignOut} />;

  if (load.state === 'failed' && load.code === 'tracking-budget') {
    return (
      <Page>
        <View style={{ padding: space.lg, gap: space.lg }}>
          <View style={{ alignItems: 'flex-end' }}>{account}</View>
          <Message text="This budget uses tracking, which Accrual does not support yet." />
        </View>
      </Page>
    );
  }

  const syncChip = syncLabel(plan);
  return (
    <Page overlay={<AddButton onPress={openQuickAdd} />}>
      <ScrollView
        testID="plan-scroll"
        // The last tile scrolls clear of the navigation bar and of the "+" floating over it.
        contentContainerStyle={{ padding: space.lg, paddingBottom: space.lg + bottom + ADD_BUTTON_CLEARANCE, gap: space.lg }}
        refreshControl={
          <RefreshControl
            refreshing={plan.refreshing}
            onRefresh={plan.refresh}
            tintColor={theme.color.mute}
            colors={theme.gradient}
            progressBackgroundColor={theme.color.sheet}
          />
        }
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <MonthSwitcher
            month={month}
            canGoBack={bounds !== null && compareMonths(month, bounds.start) > 0}
            canGoForward={bounds !== null && compareMonths(month, bounds.end) < 0}
            onChange={setMonth}
          />
          {syncChip && <Chip label={syncChip} testID="sync-chip" style={{ alignSelf: 'center' }} />}
          <View style={{ flex: 1 }} />
          {account}
        </View>
        {load.state === 'loading' && (
          <View style={{ alignItems: 'center', paddingVertical: space.xxl }}>
            <Spinner />
          </View>
        )}
        {load.state === 'failed' && (
          <View style={{ gap: space.lg }}>
            <Message text="Could not read this month." />
            <Button title="Try again" onPress={plan.reload} />
          </View>
        )}
        {load.state === 'ready' && (
          <MonthContent month={load.month} today={today} columns={fontScale >= LARGE_TEXT ? 1 : 2} />
        )}
      </ScrollView>
    </Page>
  );
}

const openQuickAdd = () => router.push('/add');

type MonthContentProps = { month: PlanMonth; today: Date; columns: 1 | 2 };

function MonthContent({ month, today, columns }: MonthContentProps) {
  if (!hasCategories(month)) return <Message text="This budget has no categories yet. Add them in Actual." />;
  const notice = overspentNotice(month);
  return (
    <>
      <HeroCard hero={heroView(month)} />
      {notice && <Notice text={notice} />}
      <View>
        {month.groups
          .filter(group => group.categories.length > 0)
          .map(group => (
            <View key={group.id}>
              <GroupHeader name={group.name} available={groupAvailable(group)} />
              <View style={{ gap: space.md }}>
                {rows(group.categories, columns).map(row => (
                  <TileRow key={row[0].id} row={row} columns={columns} month={month.month} today={today} />
                ))}
              </View>
            </View>
          ))}
      </View>
    </>
  );
}

type TileRowProps = { row: PlanCategory[]; columns: 1 | 2; month: string; today: Date };

/**
 * One row of the grid. The row stretches its tiles to the tallest one's height, and its
 * amounts share one size, so the amounts, pushed to the bottom of each tile, sit on one
 * baseline side by side. A tile alone on the last row keeps its column's width, beside an
 * empty one.
 */
function TileRow({ row, columns, month, today }: TileRowProps) {
  const amountSize = rowAmountSize(row.map(category => category.balance));
  return (
    <View testID="tile-row" style={{ flexDirection: 'row', alignItems: 'stretch', gap: space.md }}>
      {row.map(category => (
        <View key={category.id} style={{ flex: 1 }}>
          <CategoryTile
            category={category}
            view={categoryView(category, { month, today })}
            compact={columns === 2}
            amountSize={amountSize}
          />
        </View>
      ))}
      {row.length < columns && <View style={{ flex: columns - row.length }} />}
    </View>
  );
}

function rows<T>(items: T[], columns: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += columns) out.push(items.slice(i, i + columns));
  return out;
}

function Page({ children, overlay }: { children: ReactNode; overlay?: ReactNode }) {
  return (
    <AuroraBackground>
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        {children}
      </SafeAreaView>
      <BottomFade />
      {overlay}
    </AuroraBackground>
  );
}

function Message({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <Body color={theme.color.mute} style={{ textAlign: 'center', paddingVertical: space.xl }}>
      {text}
    </Body>
  );
}
