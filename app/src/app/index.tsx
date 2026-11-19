import { Redirect } from 'expo-router';
import { Text, View } from 'react-native';

import { autorunConfig } from '../dev/autorun';

export default function Home() {
  // The scripted on-device check takes over when .env.local turns it on (app/README.md).
  if (autorunConfig) return <Redirect href="/dev-check" />;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Accrual</Text>
    </View>
  );
}
