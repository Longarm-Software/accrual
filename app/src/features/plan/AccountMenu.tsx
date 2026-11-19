import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import type { HostInstance } from 'react-native';

import { radius, size, space, tint, type } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Button } from '../../ui/Button';
import { Glass } from '../../ui/Glass';
import { Body, Label } from '../../ui/Text';

type Props = { budgetName: string; onSignOut: () => void };
type Anchor = { top: number; right: number };

/** The round account button; pressing it opens a small menu under it, pressing outside closes it. */
export function AccountMenu({ budgetName, onSignOut }: Props) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const button = useRef<HostInstance>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  const open = () => {
    // Show at once in the top corner, then move under the button once it has been measured.
    setAnchor({ top: space.xxl * 2, right: space.lg });
    button.current?.measureInWindow((x, y, w, h) => setAnchor({ top: y + h + space.sm, right: width - x - w }));
  };
  const close = () => setAnchor(null);

  return (
    <>
      <Pressable ref={button} accessibilityRole="button" accessibilityLabel="Account" onPress={open}>
        {({ pressed }) => (
          <Glass radius={radius.pill} style={{ width: size.control, height: size.control, alignItems: 'center', justifyContent: 'center', opacity: pressed ? tint.pressed : 1 }}>
            <Person />
          </Glass>
        )}
      </Pressable>
      <Modal visible={anchor !== null} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
        <Pressable accessibilityLabel="Close menu" style={StyleSheet.absoluteFill} onPress={close} />
        {anchor && (
          <View
            accessibilityViewIsModal
            onAccessibilityEscape={close}
            style={{
              position: 'absolute',
              top: anchor.top,
              right: anchor.right,
              width: size.menu,
              padding: space.lg,
              gap: space.md,
              borderRadius: radius.field,
              backgroundColor: theme.color.sheet,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.color.edge,
            }}
          >
            <View style={{ gap: space.xs }}>
              <Label>Budget</Label>
              <Body style={type.heading} numberOfLines={2}>
                {budgetName}
              </Body>
            </View>
            <Button
              title="Sign out"
              variant="quiet"
              onPress={() => {
                close();
                onSignOut();
              }}
            />
          </View>
        )}
      </Modal>
    </>
  );
}

/** A head and shoulders, drawn in two strokes. */
function Person() {
  const theme = useTheme();
  const line = { borderColor: theme.color.ink, borderWidth: size.stroke };
  return (
    <View style={{ alignItems: 'center', gap: size.stroke / 2 }}>
      <View style={[line, { width: size.head, height: size.head, borderRadius: radius.pill }]} />
      <View
        style={[
          line,
          { width: size.shoulders, height: size.shoulders / 2, borderBottomWidth: 0, borderTopLeftRadius: size.shoulders / 2, borderTopRightRadius: size.shoulders / 2 },
        ]}
      />
    </View>
  );
}
