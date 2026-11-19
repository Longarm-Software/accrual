import { fireEvent, render, screen } from '@testing-library/react-native';

import type { PayeeChoice } from '../../engine/types';
import { PayeeField } from './PayeeField';

const payee = (id: string, name: string): PayeeChoice => ({ id, name, lastCategoryId: null });
const many = ['Corner Bakery', 'Corner Shop', 'Cornfield Farm', 'Harbour Coffee', 'Hardware Store', 'Harvest Market', 'Hilltop Garage'].map(
  (name, i) => payee(`p${i}`, name),
);

const draw = (text: string, matches: PayeeChoice[]) => {
  const calls = { onChangeText: jest.fn(), onPick: jest.fn() };
  return render(<PayeeField text={text} matches={matches} onChangeText={calls.onChangeText} onPick={calls.onPick} />).then(() => calls);
};

it('is a field labelled Payee that shows the text it is given', async () => {
  await draw('Cor', []);
  expect(screen.getByText('Payee')).toBeTruthy();
  expect(screen.getByLabelText('Payee').props.value).toBe('Cor');
});

it('capitalises words and does not autocorrect', async () => {
  await draw('', []);
  const input = screen.getByLabelText('Payee');
  expect(input.props.autoCapitalize).toBe('words');
  expect(input.props.autoCorrect).toBe(false);
});

it('passes on every change of text', async () => {
  const { onChangeText } = await draw('', []);
  await fireEvent.changeText(screen.getByLabelText('Payee'), 'C');
  await fireEvent.changeText(screen.getByLabelText('Payee'), 'Co');
  expect(onChangeText.mock.calls).toEqual([['C'], ['Co']]);
});

it('shows no matches until it has focus', async () => {
  await draw('Cor', many.slice(0, 3));
  expect(screen.queryByRole('button', { name: 'Corner Bakery' })).toBeNull();
});

it('shows up to six matches while it has focus, and a tap picks one', async () => {
  const { onPick } = await draw('', many);
  await fireEvent(screen.getByLabelText('Payee'), 'focus');
  expect(screen.getAllByTestId('payee-match')).toHaveLength(6);
  await fireEvent.press(screen.getByRole('button', { name: 'Harbour Coffee' }));
  expect(onPick).toHaveBeenCalledWith(many[3]);
});

it('hides the matches when it loses focus', async () => {
  await draw('', many);
  await fireEvent(screen.getByLabelText('Payee'), 'focus');
  await fireEvent(screen.getByLabelText('Payee'), 'blur');
  expect(screen.queryAllByTestId('payee-match')).toHaveLength(0);
});

it('keeps match rows at least 48 points high', async () => {
  await draw('', many);
  await fireEvent(screen.getByLabelText('Payee'), 'focus');
  const style = [screen.getByRole('button', { name: 'Corner Bakery' }).props.style].flat(Infinity).reduce((all, s) => ({ ...all, ...s }), {});
  expect(style.minHeight).toBeGreaterThanOrEqual(48);
});
