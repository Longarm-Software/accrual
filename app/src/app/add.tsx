import { Redirect, router } from 'expo-router';
import { useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { KeyboardAvoidingView, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Engine } from '../engine/types';
import { getPlanToday, onPlanTodayChange } from '../features/plan/quickAddSignal';
import { AmountDisplay } from '../features/quickAdd/AmountDisplay';
import { CategoryCard } from '../features/quickAdd/CategoryCard';
import { DateStepper } from '../features/quickAdd/DateStepper';
import { Keypad } from '../features/quickAdd/Keypad';
import { PayeeField } from '../features/quickAdd/PayeeField';
import { PickerList } from '../features/quickAdd/PickerList';
import { moreBelow, sheetDensity } from '../features/quickAdd/sheetLayout';
import { useQuickAdd, type QuickAddReady } from '../features/quickAdd/useQuickAdd';
import { useSession } from '../session/SessionProvider';
import { radius, sheet, size, space, tint, type, withAlpha } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { AuroraBackground } from '../ui/AuroraBackground';
import { Button } from '../ui/Button';
import { Glass } from '../ui/Glass';
import { Spinner } from '../ui/Spinner';
import { Body } from '../ui/Text';

/**
 * Quick add, presented as a modal over the Plan (see _layout.tsx). Cancel, the system back
 * button and swiping the sheet down all close it without saving.
 *
 * Opened any other way than from the Plan (a deep link, or before a budget is open) there is
 * no engine or no "today" to date the transaction with, so it goes to "/", which sends the
 * person wherever they belong.
 */
export default function Add() {
  const session = useSession();
  // The Plan's day, never one read from the clock here. The Plan renews its day when the app
  // comes back from the background, and an open sheet follows it: left open past midnight, its
  // draft keeps everything typed, date included, and that date now reads "Yesterday". The day it
  // opened with decides only whether there is a Plan behind it at all, and stands in while the
  // Plan's day is briefly unset as it changes.
  const [opened] = useState(getPlanToday);
  const live = useSyncExternalStore(onPlanTodayChange, getPlanToday);
  if (session.status !== 'open' || !session.engine || opened === null) return <Redirect href="/" />;
  return <Sheet engine={session.engine} today={live ?? opened} />;
}

const close = () => router.back();

function Sheet({ engine, today }: { engine: Engine; today: Date }) {
  const quick = useQuickAdd(engine, today, { onSaved: close });
  return (
    <AuroraBackground>
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        {/* Once Save is pressed the transaction is being saved; Cancel cannot undo it. */}
        <Header cancelDisabled={quick.state === 'ready' && quick.saving} />
        {quick.state === 'loading' && (
          <Centre>
            <Spinner />
          </Centre>
        )}
        {quick.state === 'failed' && (
          <Centre>
            <Message text="Could not read this budget." />
            <Button title="Try again" onPress={quick.retry} />
          </Centre>
        )}
        {quick.state === 'ready' &&
          (quick.noAccounts ? (
            <Centre>
              <Message text="Add an account in Actual first." />
              <Button title="Close" variant="quiet" onPress={close} />
            </Centre>
          ) : (
            <Form quick={quick} />
          ))}
      </SafeAreaView>
    </AuroraBackground>
  );
}

function Header({ cancelDisabled }: { cancelDisabled: boolean }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.sm }}>
      <View style={{ flex: 1, alignItems: 'flex-start' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          accessibilityState={{ disabled: cancelDisabled }}
          disabled={cancelDisabled}
          onPress={close}
          style={({ pressed }) => ({
            minHeight: size.touch,
            minWidth: size.touch,
            paddingHorizontal: space.sm,
            justifyContent: 'center',
            opacity: cancelDisabled ? tint.disabled : pressed ? tint.pressed : 1,
          })}
        >
          <Text style={[type.row, { color: theme.color.mute }]}>Cancel</Text>
        </Pressable>
      </View>
      <Body style={type.heading} accessibilityRole="header">
        New transaction
      </Body>
      <View style={{ flex: 1 }} />
    </View>
  );
}

type Picker = 'category' | 'account' | null;

/**
 * The form. While the payee field has focus the system keyboard is up, so the keypad is put
 * away: the two never share the screen, and the payee's matches get the room. Picking a
 * payee or leaving the field brings the keypad back.
 *
 * On a short screen (or with large text) the sheet is compact: smaller keys, amount and gaps, so
 * the amount, payee, category card and account and date fit above the keypad. Whatever does not
 * fit scrolls, and a fade at the bottom of the form says there is more.
 */
function Form({ quick }: { quick: QuickAddReady }) {
  const theme = useTheme();
  const { bottom } = useSafeAreaInsets();
  const [picker, setPicker] = useState<Picker>(null);
  const [typingPayee, setTypingPayee] = useState(false);
  const { height, fontScale } = useWindowDimensions();
  const density = sheetDensity(height, fontScale);
  const [scroll, setScroll] = useState({ offset: 0, viewport: 0, content: 0 });

  if (picker === 'category') {
    return (
      <View style={{ flex: 1, padding: space.lg, paddingBottom: space.lg + bottom }}>
        <PickerList
          title="Choose a category"
          items={quick.categories}
          selectedId={quick.categoryId}
          detail={item => item.detail}
          noneLabel="No category"
          onPickNone={() => {
            quick.pickCategory(null);
            setPicker(null);
          }}
          onPick={item => {
            quick.pickCategory(item.id);
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      </View>
    );
  }
  if (picker === 'account') {
    return (
      <View style={{ flex: 1, padding: space.lg, paddingBottom: space.lg + bottom }}>
        <PickerList
          title="Choose an account"
          items={quick.accounts}
          selectedId={quick.accountId}
          onPick={item => {
            quick.pickAccount(item.id);
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      </View>
    );
  }

  const { gap } = sheet[density];
  return (
    // "padding" on both platforms: Android draws the app edge to edge, so the window no longer
    // shrinks for the keyboard and the payee matches would sit under it.
    <KeyboardAvoidingView testID="sheet-form" style={{ flex: 1 }} behavior="padding">
      <View style={{ flex: 1 }}>
        <ScrollView
          testID="sheet-scroll"
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: gap, gap }}
          // A tap on a payee match must pick it, not just close the keyboard.
          keyboardShouldPersistTaps="handled"
          onLayout={e => setScroll(s => ({ ...s, viewport: e.nativeEvent.layout.height }))}
          onContentSizeChange={(_w, h) => setScroll(s => ({ ...s, content: h }))}
          onScroll={e => setScroll(s => ({ ...s, offset: e.nativeEvent.contentOffset.y }))}
          scrollEventThrottle={16}
        >
          <AmountDisplay text={quick.amount} density={density} />
          <PayeeField
            text={quick.payeeText}
            matches={quick.payeeMatches}
            onChangeText={quick.typePayee}
            onPick={payee => {
              quick.pickPayee(payee);
              setTypingPayee(false);
            }}
            onFocusChange={setTypingPayee}
            density={density}
          />
          <CategoryCard
            name={quick.card.name}
            suggested={quick.card.suggested}
            bite={quick.card.bite}
            onPress={() => setPicker('category')}
            density={density}
          />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Account, ${quick.accountName}`}
              onPress={() => setPicker('account')}
              style={({ pressed }) => ({ flex: 1, opacity: pressed ? tint.pressed : 1 })}
            >
              <Glass radius={radius.pill} style={{ minHeight: size.touch, justifyContent: 'center', paddingHorizontal: space.lg }}>
                <Text style={[type.meta, { color: theme.color.ink }]} numberOfLines={1}>
                  {quick.accountName}
                </Text>
              </Glass>
            </Pressable>
            <DateStepper label={quick.dateLabel} canGoForward={quick.canGoForward} onStep={quick.stepDate} />
          </View>
          {quick.error && (
            <Body style={[type.notice, { textAlign: 'center' }]} color={theme.color.over} accessibilityLiveRegion="polite">
              {quick.error}
            </Body>
          )}
        </ScrollView>
        {moreBelow(scroll) && (
          // The form goes on under the keypad (a short screen, large text, or the warning): say so.
          <LinearGradient
            testID="more-below"
            pointerEvents="none"
            colors={[withAlpha(theme.color.page, 0), theme.color.page]}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: space.xl }}
          />
        )}
      </View>
      {!typingPayee && (
        // Clear of the home indicator on iOS and of Android's navigation bar, drawn over the page.
        <View style={{ paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: gap + bottom }}>
          <Keypad
            onKey={quick.press}
            onToggleSign={quick.toggleSign}
            onSave={() => void quick.save()}
            canSave={quick.canSave}
            over={quick.over}
            density={density}
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function Centre({ children }: { children: ReactNode }) {
  return <View style={{ flex: 1, justifyContent: 'center', padding: space.lg, gap: space.lg }}>{children}</View>;
}

function Message({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <Body color={theme.color.mute} style={{ textAlign: 'center' }}>
      {text}
    </Body>
  );
}
