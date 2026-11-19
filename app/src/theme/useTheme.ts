import { useColorScheme } from 'react-native';

import { themes } from './tokens';
import type { Theme } from './tokens';

/** Aurora is dark first: dark unless the system is explicitly light. */
export function useTheme(): Theme {
  return useColorScheme() === 'light' ? themes.light : themes.dark;
}
