import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { space, withAlpha } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

/**
 * A fade to the page colour behind the system navigation bar, so a list that scrolls under the
 * bar's buttons does not show through them. Draws nothing where there is no bar to sit behind.
 */
export function BottomFade() {
  const { color } = useTheme();
  const { bottom } = useSafeAreaInsets();
  if (bottom === 0) return null;
  return (
    <LinearGradient
      testID="bottom-fade"
      pointerEvents="none"
      colors={[withAlpha(color.page, 0), color.page, color.page]}
      locations={[0, 0.45, 1]}
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: bottom + space.lg }}
    />
  );
}
