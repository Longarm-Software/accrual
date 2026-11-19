import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EngineError } from '../engine/types';
import type { RemoteBudget } from '../engine/types';
import { connectErrorMessage } from '../features/connect/errors';
import { normalizeServerUrl } from '../session/serverUrl';
import { useSession } from '../session/SessionProvider';
import { font, radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { AuroraBackground } from '../ui/AuroraBackground';
import { Button } from '../ui/Button';
import { Glass } from '../ui/Glass';
import { Body, Label, Title } from '../ui/Text';

export default function Connect() {
  const theme = useTheme();
  const session = useSession();
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [allowInsecure, setAllowInsecure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [budgets, setBudgets] = useState<RemoteBudget[] | null>(null);
  const [chosen, setChosen] = useState<RemoteBudget | null>(null);

  async function connect() {
    const result = normalizeServerUrl(address, { allowInsecure });
    if (!result.ok) return setError(connectErrorMessage(result.reason));
    if (!password) return setError(connectErrorMessage('empty-password'));
    setBusy(true);
    setError(null);
    try {
      const found = await session.connect(result.url, password);
      setBudgets(found);
      setChosen(found.find(b => !b.encrypted) ?? null);
      setPassword('');
    } catch (e) {
      setError(connectErrorMessage(e instanceof EngineError ? e.code : 'internal'));
    } finally {
      setBusy(false);
    }
  }

  async function open() {
    if (!chosen) return;
    await session.chooseBudget(chosen);
    router.replace('/opening');
  }

  const input = { fontFamily: font.semibold, fontSize: 16.5, color: theme.color.ink, paddingVertical: 2 };

  return (
    <AuroraBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Title style={{ marginTop: space.xxl }}>Connect to your Actual server</Title>
          <Body color={theme.color.mute} style={{ marginTop: space.md, marginBottom: space.xl }}>
            Accrual talks to your server directly. Your budget never passes through us.
          </Body>

          <Glass radius={radius.field} style={styles.field}>
            <Label>Server address</Label>
            <TextInput
              accessibilityLabel="Server address"
              value={address}
              onChangeText={setAddress}
              placeholder="budget.example.com"
              placeholderTextColor={theme.color.mute}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={input}
            />
          </Glass>
          <Glass radius={radius.field} style={styles.field}>
            <Label>Password</Label>
            <TextInput
              accessibilityLabel="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={input}
            />
          </Glass>
          <View style={styles.toggle}>
            <Label style={{ flex: 1 }}>Allow plain HTTP (for a server on your own network)</Label>
            <Switch accessibilityLabel="Allow plain HTTP" value={allowInsecure} onValueChange={setAllowInsecure} />
          </View>

          {error && <Body color={theme.color.over} style={{ marginTop: space.md }}>{error}</Body>}

          {budgets && (
            <>
              <Label style={{ marginTop: space.xl, marginBottom: space.sm }}>Budgets on this server</Label>
              <Glass>
                {budgets.map(budget => (
                  <Pressable
                    key={budget.groupId}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: chosen?.groupId === budget.groupId, disabled: budget.encrypted }}
                    disabled={budget.encrypted}
                    onPress={() => setChosen(budget)}
                    style={[styles.option, { opacity: budget.encrypted ? 0.5 : 1 }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Body style={{ fontFamily: font.semibold }}>{budget.name}</Body>
                      {budget.encrypted && <Label>Encrypted budgets are not supported yet</Label>}
                    </View>
                    <View
                      style={[
                        styles.radio,
                        { borderColor: theme.color.track, backgroundColor: chosen?.groupId === budget.groupId ? theme.color.ok : 'transparent' },
                      ]}
                    />
                  </Pressable>
                ))}
              </Glass>
            </>
          )}
        </ScrollView>

        <View style={styles.bottom}>
          {budgets ? (
            <Button title={chosen ? `Open ${chosen.name}` : 'Choose a budget'} onPress={open} disabled={!chosen} />
          ) : (
            <Button title="Connect" onPress={connect} disabled={busy} />
          )}
          <Label style={{ textAlign: 'center', marginTop: space.md }}>Your password is never stored on this phone.</Label>
        </View>
      </SafeAreaView>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.xl, paddingBottom: space.xl },
  field: { paddingHorizontal: space.lg, paddingVertical: space.md, marginTop: space.sm },
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.md, gap: space.md },
  option: { flexDirection: 'row', alignItems: 'center', padding: space.lg, gap: space.md },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2 },
  bottom: { paddingHorizontal: space.xl, paddingBottom: space.lg, paddingTop: space.md },
});
