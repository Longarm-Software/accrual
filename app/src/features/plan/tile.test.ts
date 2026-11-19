import { isLongAmount, statusColor } from './tile';

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
