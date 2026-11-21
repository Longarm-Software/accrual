import { View } from 'react-native';

import { radius, size, space, tint, type, withAlpha } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Body } from '../../ui/Text';
import { ActionPill, type CardAction } from './ActionPill';

/**
 * One line of bad news above the tiles. With an `action` (Cover) a small button sits at its
 * right; the text beside it wraps, and the button stays on the row's centre line.
 */
export function Notice({ text, action }: { text: string; action?: CardAction }) {
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
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
      }}
    >
      <Body style={[type.notice, { flex: 1 }]}>{text}</Body>
      {action && <ActionPill {...action} tone="quiet" />}
    </View>
  );
}
