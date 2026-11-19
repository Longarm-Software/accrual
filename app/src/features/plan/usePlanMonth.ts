import { useCallback, useEffect, useRef, useState } from 'react';

import { EngineError } from '../../engine/types';
import type { Engine, PlanMonth } from '../../engine/types';

export type PlanLoad =
  | { state: 'loading' }
  | { state: 'ready'; month: PlanMonth }
  | { state: 'failed'; code: string };

/** What the last sync said, besides "fine". */
type SyncState = 'synced' | 'offline' | 'failed';

/**
 * Reads `month` from the engine, and reads it again when it changes. Only the newest read
 * counts: a result for a month the person has already left, or one overtaken by a later
 * read, is dropped.
 */
export function usePlanMonth(engine: Engine | null, month: string): {
  load: PlanLoad;
  /** The last sync could not reach the server, or the engine opened without it and has not synced since. */
  offline: boolean;
  /** The last sync failed for another reason: the numbers are the phone's, and may be behind. */
  syncFailed: boolean;
  refreshing: boolean;
  /** Read the month again, without syncing (after a failed read). */
  reload(): void;
  /** Sync with the server, then read the month again. A failed sync keeps the numbers. */
  refresh(): Promise<void>;
} {
  // The load is kept with the month it belongs to, so a render after the month changed,
  // but before its read started, never shows the old month's numbers as the new one's.
  const [result, setResult] = useState<{ month: string; load: PlanLoad } | null>(null);
  const [sync, setSync] = useState<SyncState>(engine?.offline ? 'offline' : 'synced');
  const [refreshing, setRefreshing] = useState(false);
  const latest = useRef(0);

  const read = useCallback(
    async (showLoading: boolean) => {
      if (!engine) return;
      const n = ++latest.current;
      if (showLoading) setResult({ month, load: { state: 'loading' } });
      let load: PlanLoad;
      try {
        load = { state: 'ready', month: await engine.getPlanMonth(month) };
      } catch (e) {
        load = { state: 'failed', code: e instanceof EngineError ? e.code : 'internal' };
      }
      if (n === latest.current) setResult({ month, load });
    },
    [engine, month],
  );

  useEffect(() => {
    void read(true);
    // Leaving the month, or the screen, makes any read still running stale.
    return () => {
      latest.current++;
    };
  }, [read]);

  const refresh = useCallback(async () => {
    if (!engine) return;
    setRefreshing(true);
    try {
      await engine.sync();
      setSync('synced');
    } catch (e) {
      setSync(e instanceof EngineError && e.code === 'network-failure' ? 'offline' : 'failed');
    }
    try {
      // Keep showing the numbers while they are read again.
      await read(false);
    } finally {
      setRefreshing(false);
    }
  }, [engine, read]);

  const reload = useCallback(() => void read(true), [read]);

  const load: PlanLoad = result && result.month === month ? result.load : { state: 'loading' };
  return { load, offline: sync === 'offline', syncFailed: sync === 'failed', refreshing, reload, refresh };
}
