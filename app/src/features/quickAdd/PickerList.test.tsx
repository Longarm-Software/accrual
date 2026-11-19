import { fireEvent, render, screen } from '@testing-library/react-native';

import { PickerList } from './PickerList';

type Item = { id: string; name: string; balance: string };
const items: Item[] = [
  { id: 'a', name: 'Groceries', balance: '$207.62' },
  { id: 'b', name: 'Coffee', balance: '$13.50' },
];

const draw = (props: { selectedId: string | null; none?: boolean; detail?: boolean }) => {
  const calls = { onPick: jest.fn(), onClose: jest.fn(), onPickNone: jest.fn() };
  return render(
    <PickerList<Item>
      title="Category"
      items={items}
      selectedId={props.selectedId}
      detail={props.detail ? item => item.balance : undefined}
      onPick={calls.onPick}
      onClose={calls.onClose}
      noneLabel={props.none ? 'No category' : undefined}
      onPickNone={props.none ? calls.onPickNone : undefined}
    />,
  ).then(() => calls);
};

it('shows the title and a row for each item', async () => {
  await draw({ selectedId: null });
  expect(screen.getByText('Category')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Groceries' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Coffee' })).toBeTruthy();
});

it('marks the selected row, for the eye and for a screen reader', async () => {
  await draw({ selectedId: 'b' });
  expect(screen.getByRole('button', { name: 'Coffee' }).props.accessibilityState).toMatchObject({ selected: true });
  expect(screen.getByRole('button', { name: 'Groceries' }).props.accessibilityState).toMatchObject({ selected: false });
  expect(screen.getAllByTestId('picker-tick')).toHaveLength(1);
});

it('shows each item’s detail at the right, and reads it with the name', async () => {
  await draw({ selectedId: null, detail: true });
  expect(screen.getByText('$207.62')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Coffee, $13.50' })).toBeTruthy();
});

it('calls back with the item picked', async () => {
  const { onPick } = await draw({ selectedId: null });
  await fireEvent.press(screen.getByRole('button', { name: 'Coffee' }));
  expect(onPick).toHaveBeenCalledWith(items[1]);
});

it('closes', async () => {
  const { onClose } = await draw({ selectedId: null });
  await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

it('adds a first row for none, selected when nothing is', async () => {
  const { onPickNone, onPick } = await draw({ selectedId: null, none: true });
  const none = screen.getByRole('button', { name: 'No category' });
  expect(none.props.accessibilityState).toMatchObject({ selected: true });
  await fireEvent.press(none);
  expect(onPickNone).toHaveBeenCalledTimes(1);
  expect(onPick).not.toHaveBeenCalled();
});

it('has no none row unless asked', async () => {
  await draw({ selectedId: null });
  expect(screen.queryByText('No category')).toBeNull();
});

it('keeps rows at least 48 points high', async () => {
  await draw({ selectedId: null, none: true });
  for (const name of ['No category', 'Groceries', 'Close']) {
    const style = [screen.getByRole('button', { name }).props.style].flat(Infinity).reduce((all, s) => ({ ...all, ...s }), {});
    expect(style.minHeight).toBeGreaterThanOrEqual(48);
  }
});
