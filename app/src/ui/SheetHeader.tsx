import { Pressable, Text, View } from 'react-native';

import { size, space, tint, type } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Body } from './Text';

type Props = { title: string; onCancel(): void; cancelDisabled: boolean };

/**
 * A sheet's top line: Cancel at the left, the title centred. Quick add, the move sheet and the
 * cover sheet share it. Once the sheet's write is under way Cancel cannot undo it, so it is off.
 *
 * Cancel never shrinks; a long title gets smaller to fit on one line between it and an invisible
 * copy of it at the right, which keeps the title centred. (At the largest text size "Cover
 * Subscriptions" squeezed Cancel into three lines; let wrap, it broke the word in two.)
 */
export function SheetHeader({ title, onCancel, cancelDisabled }: Props) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.sm }}>
      <View testID="sheet-header-start" style={{ flexGrow: 1, flexShrink: 0, flexBasis: 'auto', alignItems: 'flex-start' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          accessibilityState={{ disabled: cancelDisabled }}
          disabled={cancelDisabled}
          onPress={onCancel}
          style={({ pressed }) => [cancelBox, { opacity: cancelDisabled ? tint.disabled : pressed ? tint.pressed : 1 }]}
        >
          <Text numberOfLines={1} style={[type.row, { color: theme.color.mute }]}>Cancel</Text>
        </Pressable>
      </View>
      <Body style={[type.heading, { flexShrink: 1, textAlign: 'center' }]} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit>
        {title}
      </Body>
      <View
        testID="sheet-header-end"
        style={{ flexGrow: 1, flexShrink: 0, flexBasis: 'auto', alignItems: 'flex-end' }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
      >
        <View style={[cancelBox, { opacity: 0 }]}>
          <Text numberOfLines={1} style={type.row}>Cancel</Text>
        </View>
      </View>
    </View>
  );
}

const cancelBox = { minHeight: size.touch, minWidth: size.touch, paddingHorizontal: space.sm, justifyContent: 'center' } as const;
