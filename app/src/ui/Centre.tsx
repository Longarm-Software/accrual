import type { ReactNode } from 'react';
import { View } from 'react-native';

import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Body } from './Text';

/** A sheet's whole body, centred: its spinner, or a message and what to do about it. */
export function Centre({ children }: { children: ReactNode }) {
  return <View style={{ flex: 1, justifyContent: 'center', padding: space.lg, gap: space.lg }}>{children}</View>;
}

/** One quiet, centred sentence on a sheet. */
export function Message({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <Body color={theme.color.mute} style={{ textAlign: 'center' }}>
      {text}
    </Body>
  );
}
