// The scripted on-device engine check (src/dev/autorun.ts). Only reachable when
// .env.local sets EXPO_PUBLIC_SPIKE_AUTORUN=1; see "Scripted run" in app/README.md.
// Developer-only, so it is exempt from the token rules: literal colours and sizes are allowed here.
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text } from 'react-native';

import { autorunConfig, watchAutorun } from '../dev/autorun';

export default function DevCheck() {
  const [log, setLog] = useState<string[]>([]);
  // Starts the run the first time in this launch; after that, only shows it (see watchAutorun).
  useEffect(() => (autorunConfig ? watchAutorun(setLog) : undefined), []);
  if (!autorunConfig) return <Redirect href="/" />;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={{ padding: 16, paddingTop: 64, gap: 8 }}>
      {log.map((line, i) => (
        <Text key={i} selectable style={{ fontSize: 13 }}>{line}</Text>
      ))}
    </ScrollView>
  );
}
