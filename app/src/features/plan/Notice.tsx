import { View } from 'react-native';

import { radius, size, space, tint, type, withAlpha } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Body } from '../../ui/Text';

/** One line of bad news above the tiles. It informs; there is nothing to press. */
export function Notice({ text }: { text: string }) {
  const theme = useTheme();
  const c = theme.color.over;
  return (
    <View
      style={{
        borderRadius: radius.field,
        paddingVertical: space.md,
        paddingHorizontal: space.lg,
        borderWidth: size.border,
        borderColor: withAlpha(c, tint.noticeEdge),
        backgroundColor: withAlpha(c, tint.notice),
      }}
    >
      <Body style={type.notice}>{text}</Body>
    </View>
  );
}
