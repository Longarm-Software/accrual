import { useCallback, useEffect, useRef, useState } from 'react';

import { EngineError } from '../../engine/types';
import type { Engine, MonthBounds, PlanMonth } from '../../engine/types';

export type PlanLoad =
  | { state: 'loading' }
  | { state: 'ready'; month: PlanMonth }
  | { state: 'failed'; code: string };

/** What the last sync said, besides "fine". */
type SyncState = 'synced' | 'offline' | 'failed';

type Options = {
  /** The server said the session token is no longer good. The caller signs out. */
  onSessionExpired?: () => void;
};

/**
 * Reads `month` from the engine, and reads it again when it changes. Only the newest read
 * counts: a result for a month the person has already left, or one overtaken by a later
 * read, is dropped. Also reads which months the budget has.
 */
export function usePlanMonth(engine: Engine | null, month: string, { onSessionExpired }: Options = {}): {
  load: PlanLoad;
  /** The first and last month in the budget, or null until known. */
  bounds: MonthBounds | null;
  /** The last sync could not reach the server, or the engine opened without it and has not synced since. */
  offline: boolean;
  /** The last sync failed for another reason: the numbers are the phone's, and may be behind. */
  syncFailed: boolean;
  refreshing: boolean;
  /** Read the month again, without syncing (after a failed read). */
  reload(): void;
  /** Sync with the server, then read the month (and the bounds) again. A failed sync keeps the numbers. */
  refresh(): Promise<void>;
  /**
   * A transaction was just saved on the phone: read the month at once, so it shows, then sync
   * in the background and read again, as `refresh` does but without the pull spinner. A failed
   * sync is handled exactly as a pull's is.
   */
  afterSave(): Promise<void>;
} {
  // The load is kept with the month it belongs to, so a render after the month changed,
  // but before its read started, never shows the old month's numbers as the new one's.
  const [result, setResult] = useState<{ month: string; load: PlanLoad } | null>(null);
  const [bounds, setBounds] = useState<MonthBounds | null>(null);
  const [sync, setSync] = useState<SyncState>(engine?.offline ? 'offline' : 'synced');
  const [refreshing, setRefreshing] = useState(false);
  const latest = useRef(0);
  const latestBounds = useRef(0);
  // The month on screen now. A refresh reads this after its sync, not the month that was
  // showing when the pull began: the person may have moved on while it synced.
  const shown = useRef(month);
  useEffect(() => {
    shown.current = month;
  }, [month]);

  const read = useCallback(
    async (which: string, showLoading: boolean) => {
      if (!engine) return;
      const n = ++latest.current;
      if (showLoading) setResult({ month: which, load: { state: 'loading' } });
      let load: PlanLoad;
      try {
        load = { state: 'ready', month: await engine.getPlanMonth(which) };
      } catch (e) {
        load = { state: 'failed', code: e instanceof EngineError ? e.code : 'internal' };
      }
      if (n !== latest.current) return;
      // A failed read never replaces numbers already showing for that month; the error is
      // only for when there is nothing to show.
      setResult(prev =>
        load.state === 'failed' && prev?.month === which && prev.load.state === 'ready' ? prev : { month: which, load },
      );
    },
    [engine],
  );

  const readBounds = useCallback(async () => {
    if (!engine) return;
    const n = ++latestBounds.current;
    try {
      const next = await engine.getMonthBounds();
      if (n === latestBounds.current) setBounds(next);
    } catch {
      // Keep the bounds already known (none at first: then neither arrow moves).
    }
  }, [engine]);

  useEffect(() => {
    void read(month, true);
    // Leaving the month, or the screen, makes any read still running stale.
    return () => {
      latest.current++;
    };
  }, [read, month]);

  useEffect(() => {
    void readBounds();
    return () => {
      latestBounds.current++;
    };
  }, [readBounds]);

  // The one sync path, for a pull and after a save: what a failed sync shows, and signing out
  // when the session has expired, are decided here only.
  const syncThenRead = useCallback(async (spinner: boolean) => {
    if (!engine) return;
    if (spinner) setRefreshing(true);
    let synced = false;
    try {
      await engine.sync();
      synced = true;
      setSync('synced');
    } catch (e) {
      const code = e instanceof EngineError ? e.code : 'internal';
      if (code === 'token-expired' && onSessionExpired) {
        setRefreshing(false);
        onSessionExpired();
        return;
      }
      setSync(code === 'network-failure' ? 'offline' : 'failed');
    }
    try {
      // Keep showing the numbers while they are read again. A sync can add months.
      await Promise.all([read(shown.current, false), synced ? readBounds() : null]);
    } finally {
      if (spinner) setRefreshing(false);
    }
  }, [engine, read, readBounds, onSessionExpired]);

  const refresh = useCallback(() => syncThenRead(true), [syncThenRead]);

  const afterSave = useCallback(async () => {
    await read(shown.current, false);
    await syncThenRead(false);
  }, [read, syncThenRead]);

  const reload = useCallback(() => void read(month, true), [read, month]);

  const load: PlanLoad = result && result.month === month ? result.load : { state: 'loading' };
  return { load, bounds, offline: sync === 'offline', syncFailed: sync === 'failed', refreshing, reload, refresh, afterSave };
}
