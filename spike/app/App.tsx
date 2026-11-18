// Phase 0 spike screen: proves Actual's engine runs on the device and reports
// timings. Not product UI. Nothing is hard-coded: enter a TEST server only.
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { BudgetMonth, Engine, RemoteBudget } from './src/engine/adapter';

const money = (cents: number) => (cents / 100).toFixed(2);
const thisMonth = () => new Date().toISOString().slice(0, 7);
const today = () => new Date().toISOString().slice(0, 10);

export default function App() {
  const [serverURL, setServerURL] = useState('http://10.0.2.2:5007');
  const [password, setPassword] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const [budgets, setBudgets] = useState<RemoteBudget[]>([]);
  const [month, setMonth] = useState<BudgetMonth | null>(null);
  const engine = useRef<Engine | null>(null);

  const say = (line: string) => setLog(lines => [...lines, line]);
  async function step<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const t0 = performance.now();
    try {
      const result = await fn();
      say(`✓ ${label}: ${Math.round(performance.now() - t0)} ms`);
      return result;
    } catch (err) {
      say(`✗ ${label}: ${String(err)}`);
      throw err;
    }
  }

  async function connect() {
    setLog([]);
    // Required lazily so the engine's load time is measured, not hidden in app start.
    const { createEngine } = await step('load engine bundle', async () => require('./src/engine/adapter'));
    engine.current = await step('init + sign in', () => createEngine({ serverURL, password }));
    setBudgets(await step('list budgets', () => engine.current!.listBudgets()));
  }

  async function open(budget: RemoteBudget) {
    await step(`open "${budget.name}" (download or load + sync)`, () => engine.current!.openBudget(budget.groupId));
    setMonth(await step('read month', () => engine.current!.getMonth(thisMonth())));
  }

  async function addAndSync() {
    const account = (await engine.current!.getAccounts()).find(a => !a.closed && !a.offbudget)!;
    await step('add transaction', () =>
      engine.current!.addTransaction(account.id, {
        date: today(), amount: -123, payee_name: 'Spike Phone', notes: `phone-${Date.now()}`,
      }),
    );
    await step('sync', () => engine.current!.sync());
    setMonth(await step('read month', () => engine.current!.getMonth(thisMonth())));
  }

  async function syncOnly() {
    await step('sync', () => engine.current!.sync());
    setMonth(await step('read month', () => engine.current!.getMonth(thisMonth())));
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Accrual engine spike</Text>
      <TextInput style={styles.input} value={serverURL} onChangeText={setServerURL}
        autoCapitalize="none" autoCorrect={false} placeholder="Test server URL" />
      <TextInput style={styles.input} value={password} onChangeText={setPassword}
        secureTextEntry placeholder="Test server password" />
      <Button title="Connect" onPress={() => connect().catch(() => {})} />
      {budgets.map(b => (
        <Button key={b.groupId} title={`Open ${b.name}`} onPress={() => open(b).catch(() => {})} />
      ))}
      {month && (
        <View>
          <Button title="Add transaction + sync" onPress={() => addAndSync().catch(() => {})} />
          <Button title="Sync" onPress={() => syncOnly().catch(() => {})} />
          <Text style={styles.heading}>{month.month} · To budget {money(month.toBudget)}</Text>
          {month.categoryGroups.filter(g => !g.is_income).map(group => (
            <View key={group.id}>
              <Text style={styles.group}>{group.name}</Text>
              {group.categories.map(c => (
                <Text key={c.id} style={styles.row}>
                  {c.name}: budgeted {money(c.budgeted)} · spent {money(c.spent)} · balance {money(c.balance)}
                </Text>
              ))}
            </View>
          ))}
        </View>
      )}
      <Text style={styles.heading}>Log</Text>
      {log.map((line, i) => (
        <Text key={i} style={styles.row} selectable>{line}</Text>
      ))}
      <StatusBar style="auto" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingTop: 64, gap: 8 },
  title: { fontSize: 22, fontWeight: '600' },
  heading: { fontSize: 16, fontWeight: '600', marginTop: 16 },
  group: { fontWeight: '600', marginTop: 8 },
  row: { fontSize: 13, fontVariant: ['tabular-nums'] },
  input: { borderWidth: 1, borderColor: '#bbb', borderRadius: 8, padding: 10 },
});
