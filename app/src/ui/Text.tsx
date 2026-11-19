import { Text as RNText } from 'react-native';
import type { TextProps } from 'react-native';

import { type } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

type Props = TextProps & { color?: string };
const make = (base: object, tone: 'ink' | 'mute') =>
  function Styled({ style, color, ...rest }: Props) {
    const theme = useTheme();
    return <RNText {...rest} style={[base, { color: color ?? theme.color[tone] }, style]} />;
  };

export const Body = make(type.body, 'ink');
export const Label = make(type.label, 'mute');
export const Display = make(type.display, 'ink');
export const Title = make(type.title, 'ink');
