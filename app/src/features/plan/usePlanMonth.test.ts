import { act, renderHook } from '@testing-library/react-native';

import { EngineError } from '../../engine/types';
import { fakeEngine } from '../../session/fakeEngine';
import { usePlanMonth } from './usePlanMonth';

/** A sync that waits until `end` is called, and ends as it is told. */
function heldSync() {
  let end!: (error?: Error) => void;
  const sync = jest.fn(() => new Promise<void>((resolve, reject) => (end = e => (e ? reject(e) : resolve()))));
  return { sync, end: (error?: Error) => end(error) };
}

/** The Plan with a sync running, a save made during it (which owes one more), then gone. */
async function saveThenLeaveDuringSync() {
  const held = heldSync();
  const onSessionExpired = jest.fn();
  const engine = fakeEngine({ sync: held.sync });
  const hook = await renderHook(() => usePlanMonth(engine, '2026-11', { onSessionExpired }));
  let pull!: Promise<void>;
  await act(async () => {
    pull = hook.result.current.refresh();
  });
  await act(async () => {
    void hook.result.current.afterSave();
  });
  // Signing out unmounts the Plan before the sync ends.
  await hook.unmount();
  const end = async (error?: Error) => {
    await act(async () => {
      held.end(error);
      await pull;
    });
    await act(async () => {});
  };
  return { sync: held.sync, onSessionExpired, end };
}

it('starts no owed sync once the Plan has gone', async () => {
  const { sync, end } = await saveThenLeaveDuringSync();
  await end();
  expect(sync).toHaveBeenCalledTimes(1);
});

it('does not sign out from a Plan that has gone', async () => {
  const { onSessionExpired, end } = await saveThenLeaveDuringSync();
  await end(new EngineError('token-expired', 'x'));
  expect(onSessionExpired).not.toHaveBeenCalled();
});

it('can sync again after a sync path that threw', async () => {
  const sync = jest
    .fn<Promise<void>, []>()
    .mockRejectedValueOnce(new EngineError('token-expired', 'x'))
    .mockResolvedValue(undefined);
  const onSessionExpired = jest.fn().mockImplementationOnce(() => {
    throw new Error('sign-out failed');
  });
  const engine = fakeEngine({ sync });
  const hook = await renderHook(() => usePlanMonth(engine, '2026-11', { onSessionExpired }));
  await act(async () => {
    await expect(hook.result.current.refresh()).rejects.toThrow('sign-out failed');
  });
  await act(async () => {
    await hook.result.current.refresh();
  });
  expect(sync).toHaveBeenCalledTimes(2);
});
