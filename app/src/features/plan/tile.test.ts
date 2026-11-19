import { amount } from '../../theme/tokens';
import { isLongAmount, rowAmountSize, statusColor } from './tile';

it('maps each status to its colour', () => {
  expect(statusColor('ok')).toBe('ok');
  expect(statusColor('goal')).toBe('goal');
  expect(statusColor('needs')).toBe('need');
  expect(statusColor('over')).toBe('over');
  expect(statusColor('spent')).toBe('zero');
  expect(statusColor('idle')).toBe('zero');
});

it('calls $1,000 or more either way long', () => {
  expect(isLongAmount(99999)).toBe(false);
  expect(isLongAmount(100000)).toBe(true);
  expect(isLongAmount(-99999)).toBe(false);
  expect(isLongAmount(-100000)).toBe(true);
});

it('draws a row of amounts at one size, the smaller one if any amount in it is long', () => {
  expect(rowAmountSize([2895, 15400])).toBe(amount.tile);
  expect(rowAmountSize([120703, 15400])).toBe(amount.tileLong);
  expect(rowAmountSize([-29880, 116666])).toBe(amount.tileLong);
  expect(rowAmountSize([120703])).toBe(amount.tileLong);
});
