import { stageCopy } from './stageCopy';

it('names each step', () => {
  expect(stageCopy(null, 'Household').title).toBe('Opening Household');
  expect(stageCopy('downloading', 'Household')).toEqual({
    title: 'Downloading Household',
    detail: 'This happens once on this phone. A large budget can take a few seconds.',
  });
  expect(stageCopy('opening', 'Household')).toEqual({
    title: 'Opening Household',
    detail: 'Reading your budget on this phone.',
  });
  expect(stageCopy('syncing', 'Household')).toEqual({
    title: 'Syncing Household',
    detail: 'Checking your server for changes.',
  });
});
