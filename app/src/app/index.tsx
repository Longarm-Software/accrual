import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { autorunConfig } from '../dev/autorun';
import type { BudgetMonth } from '../engine/types';
import { currentMonth } from '../lib/month';
import { useSession } from '../session/SessionProvider';
import { amount, radius, space, type } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { AuroraBackground } from '../ui/AuroraBackground';
import { Button } from '../ui/Button';
import { Glass } from '../ui/Glass';
import { Money } from '../ui/Money';
import { Body, Label, Title } from '../ui/Text';

// Plan 2 replaces this with the real Plan screen. For now it proves the whole path:
// a number read from the engine, on the phone, for the chosen budget.
export default function Home() {
  const theme = useTheme();
  const session = useSession();
  const [month, setMonth] = useState<BudgetMonth | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (session.status !== 'open' || !session.engine) return;
    let current = true;
    session.engine
      .getMonth(currentMonth())
      .then(result => current && setMonth(result))
      .catch(() => current && setFailed(true));
    return () => {
      current = false;
    };
  }, [session.status, session.engine]);

  if (autorunConfig) return <Redirect href="/dev-check" />;
  if (session.status === 'loading') return <AuroraBackground>{null}</AuroraBackground>;
  if (session.status === 'signedOut' || session.status === 'needsBudget') return <Redirect href="/connect" />;
  if (session.status === 'closed') return <Redirect href="/opening" />;

  return (
    <AuroraBackground>
      <SafeAreaView style={{ flex: 1, padding: space.lg, gap: space.lg }}>
        <Title style={type.titleSmall}>{session.saved?.budget?.name}</Title>
        <Glass radius={radius.card} style={{ padding: space.xl, gap: space.sm }}>
          <Label>Ready to budget</Label>
          {month ? (
            <Money cents={month.toBudget} size={amount.hero} color={month.toBudget < 0 ? theme.color.over : undefined} />
          ) : (
            <Body color={theme.color.mute}>{failed ? 'Could not read this month.' : ' '}</Body>
          )}
        </Glass>
        <View style={{ flex: 1 }} />
        <Button title="Sign out" variant="quiet" onPress={() => void session.signOut()} />
      </SafeAreaView>
    </AuroraBackground>
  );
}
