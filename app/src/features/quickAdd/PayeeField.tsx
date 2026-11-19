import { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputInstance } from 'react-native';

import type { PayeeChoice } from '../../engine/types';
import { radius, size, space, tint, type } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Glass } from '../../ui/Glass';
import { Label } from '../../ui/Text';

type Props = {
  text: string;
  matches: PayeeChoice[];
  onChangeText(text: string): void;
  onPick(payee: PayeeChoice): void;
  /** The field gained (true) or lost (false) focus: the sheet puts its keypad away while the keyboard is up. */
  onFocusChange?(focused: boolean): void;
};

const MAX_MATCHES = 6;

/**
 * The payee: a field labelled "Payee", with up to six matching payees under it while it has
 * focus. Picking one closes the keyboard. The field is controlled by the parent's text and
 * passes every change straight on, so nothing typed is lost to a re-render.
 *
 * The matches are pressed while the keyboard is up: a scroll view around this needs
 * `keyboardShouldPersistTaps="handled"`, or the first tap only closes the keyboard.
 *
 * On Android, Back closes the keyboard but leaves the field focused, and the sheet's keypad
 * (with Save) only comes back when the field is left. So the keyboard closing counts as
 * leaving the field.
 */
export function PayeeField({ text, matches, onChangeText, onPick, onFocusChange }: Props) {
  const theme = useTheme();
  const input = useRef<TextInputInstance>(null);
  const [focused, setFocused] = useState(false);
  const shown = focused ? matches.slice(0, MAX_MATCHES) : [];
  // Read by the keyboard listener, which is set up once; keeps "left the field" reported once.
  const hasFocus = useRef(false);
  const enter = () => {
    hasFocus.current = true;
    setFocused(true);
    onFocusChange?.(true);
  };
  const leave = () => {
    if (!hasFocus.current) return;
    hasFocus.current = false;
    setFocused(false);
    onFocusChange?.(false);
  };
  const leaveRef = useRef(leave);
  useEffect(() => {
    leaveRef.current = leave;
  });
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidHide', () => {
      if (!hasFocus.current) return;
      input.current?.blur();
      leaveRef.current();
    });
    return () => sub.remove();
  }, []);

  return (
    <View style={{ gap: space.sm }}>
      <Glass radius={radius.field} style={{ paddingHorizontal: space.lg, paddingVertical: space.md }}>
        {/* The field itself is labelled "Payee"; this visible label is not read a second time. */}
        <Label accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          Payee
        </Label>
        <TextInput
          ref={input}
          accessibilityLabel="Payee"
          value={text}
          onChangeText={onChangeText}
          onFocus={enter}
          onBlur={leave}
          autoCapitalize="words"
          autoCorrect={false}
          spellCheck={false}
          autoComplete="off"
          returnKeyType="done"
          style={{ ...type.input, color: theme.color.ink, paddingVertical: space.hair }}
        />
      </Glass>
      {shown.length > 0 && (
        <Glass radius={radius.field}>
          {shown.map((payee, i) => (
            <Pressable
              key={payee.id}
              testID="payee-match"
              accessibilityRole="button"
              accessibilityLabel={payee.name}
              onPress={() => {
                onPick(payee);
                input.current?.blur();
              }}
              style={({ pressed }) => [
                styles.match,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.color.line },
                { opacity: pressed ? tint.pressed : 1 },
              ]}
            >
              <Text style={[type.row, { color: theme.color.ink }]}>{payee.name}</Text>
            </Pressable>
          ))}
        </Glass>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  match: { minHeight: size.touch, justifyContent: 'center', paddingHorizontal: space.lg, paddingVertical: space.md },
});
