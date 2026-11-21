import { Pressable, Text, View } from 'react-native';

import { size, space, tint, type } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Body } from './Text';

type Props = { title: string; onCancel(): void; cancelDisabled: boolean };

/**
 * A sheet's top line: Cancel at the left, the title centred. Quick add, the move sheet and the
 * cover sheet share it. Once the sheet's write is under way Cancel cannot undo it, so it is off.
 */
export function SheetHeader({ title, onCancel, cancelDisabled }: Props) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.sm }}>
      <View style={{ flex: 1, alignItems: 'flex-start' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          accessibilityState={{ disabled: cancelDisabled }}
          disabled={cancelDisabled}
          onPress={onCancel}
          style={({ pressed }) => ({
            minHeight: size.touch,
            minWidth: size.touch,
            paddingHorizontal: space.sm,
            justifyContent: 'center',
            opacity: cancelDisabled ? tint.disabled : pressed ? tint.pressed : 1,
          })}
        >
          <Text style={[type.row, { color: theme.color.mute }]}>Cancel</Text>
        </Pressable>
      </View>
      <Body style={type.heading} accessibilityRole="header">
        {title}
      </Body>
      <View style={{ flex: 1 }} />
    </View>
  );
}
