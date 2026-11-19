import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { Text } from 'react-native';

import { emptyEntry, entryCents, press, type Key } from './amountEntry';
import { themes } from '../../theme/tokens';
import { Keypad, REPEAT_MS } from './Keypad';

// The design is dark; Jest's colour scheme is light. Draw dark so the colours checked are the design's.
jest.mock('../../theme/useTheme', () => ({ useTheme: () => jest.requireActual('../../theme/tokens').themes.dark }));

const draw = (props: Partial<{ canSave: boolean; over: boolean }> = {}) => {
  const calls = { onKey: jest.fn<void, [Key]>(), onToggleSign: jest.fn(), onSave: jest.fn() };
  return render(<Keypad {...calls} canSave={props.canSave ?? true} over={props.over ?? false} />).then(() => calls);
};

const button = (name: string) => screen.getByRole('button', { name });

it('has a labelled key for every digit, the point, double zero, delete, sign and save', async () => {
  await draw();
  for (const name of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'Double zero', 'Decimal point', 'Delete', 'Expense or income', 'Save']) {
    expect(button(name)).toBeTruthy();
  }
});

it('sends each key it is pressed with', async () => {
  const { onKey } = await draw();
  await fireEvent.press(button('7'));
  await fireEvent.press(button('Double zero'));
  await fireEvent.press(button('Decimal point'));
  await fireEvent.press(button('Delete'));
  expect(onKey.mock.calls.map(c => c[0])).toEqual(['7', '00', '.', 'back']);
});

it('counts a fast double press twice', async () => {
  const { onKey } = await draw();
  await fireEvent.press(button('5'));
  await fireEvent.press(button('5'));
  expect(onKey).toHaveBeenCalledTimes(2);
});

it('switches between expense and income', async () => {
  const { onToggleSign, onKey } = await draw();
  await fireEvent.press(button('Expense or income'));
  expect(onToggleSign).toHaveBeenCalledTimes(1);
  expect(onKey).not.toHaveBeenCalled();
});

it('saves when it can', async () => {
  const { onSave } = await draw({ canSave: true });
  expect(button('Save').props.accessibilityState).toMatchObject({ disabled: false });
  await fireEvent.press(button('Save'));
  expect(onSave).toHaveBeenCalledTimes(1);
});

it('does nothing from Save when it cannot save, and says it is disabled', async () => {
  const { onSave } = await draw({ canSave: false });
  expect(button('Save').props.accessibilityState).toMatchObject({ disabled: true });
  await fireEvent.press(button('Save'));
  expect(onSave).not.toHaveBeenCalled();
});

it('colours Save mint normally and coral when the amount is more than the category has', async () => {
  await draw({ over: false });
  expect(screen.getByTestId('save-mint')).toBeTruthy();
  await draw({ over: true });
  expect(screen.queryByTestId('save-mint')).toBeNull();
  expect(button('Save')).toHaveStyle({ backgroundColor: themes.dark.color.over });
});

it('keeps every key at least 48 points high', async () => {
  await draw();
  for (const name of ['1', 'Delete', 'Expense or income', 'Double zero', 'Save']) {
    const style = [button(name).props.style].flat(Infinity).reduce((all, s) => ({ ...all, ...s }), {});
    expect(style.minHeight).toBeGreaterThanOrEqual(48);
  }
});

describe('holding delete', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('repeats until it is let go', async () => {
    const { onKey } = await draw();
    const del = button('Delete');
    await fireEvent(del, 'longPress');
    expect(onKey).toHaveBeenCalledTimes(1);
    await act(() => jest.advanceTimersByTime(300));
    const held = onKey.mock.calls.length;
    expect(held).toBeGreaterThan(2);
    expect(onKey.mock.calls.every(c => c[0] === 'back')).toBe(true);
    await fireEvent(del, 'pressOut');
    await act(() => jest.advanceTimersByTime(1000));
    expect(onKey).toHaveBeenCalledTimes(held);
  });

  it('keeps deleting when the parent passes a new callback on every render', async () => {
    // The natural parent: a fresh closure over the current entry each render, no functional update.
    function Parent() {
      const [entry, setEntry] = useState(['1', '2', '3', '4', '5'].reduce((e, k) => press(e, k as Key), emptyEntry));
      return (
        <>
          <Text testID="cents">{entryCents(entry)}</Text>
          <Keypad onKey={key => setEntry(press(entry, key))} onToggleSign={() => {}} onSave={() => {}} canSave over={false} />
        </>
      );
    }
    await render(<Parent />);
    const del = button('Delete');
    await fireEvent(del, 'longPress');
    // One repeat at a time, letting React re-render between them as it does on a device.
    for (let i = 0; i < 3; i++) await act(() => jest.advanceTimersByTime(REPEAT_MS));
    await fireEvent(del, 'pressOut');
    // 12345 dollars, after the first delete and three repeats, is 1 dollar.
    expect(screen.getByTestId('cents').props.children).toBe(100);
  });
});
