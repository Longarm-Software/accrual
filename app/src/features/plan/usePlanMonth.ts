import { useCallback, useEffect, useRef, useState } from 'react';

import { EngineError } from '../../engine/types';
import type { Engine, MonthBounds, PlanMonth } from '../../engine/types';
import { now } from '../../lib/clock';

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
  /** Sync and read again as `refresh` does, without the pull spinner (the app came back to the foreground). */
  refreshInBackground(): Promise<void>;
  /** When a sync last succeeded: the budget's opening, if it opened online. Null if none has. */
  lastSynced(): Date | null;
} {
  // The load is kept with the month it belongs to, so a render after the month changed,
  // but before its read started, never shows the old month's numbers as the new one's.
  const [result, setResult] = useState<{ month: string; load: PlanLoad } | null>(null);
  const [bounds, setBounds] = useState<MonthBounds | null>(null);
  const [sync, setSync] = useState<SyncState>(engine?.offline ? 'offline' : 'synced');
  const [refreshing, setRefreshing] = useState(false);
  // Opening the budget synced it, unless it opened without the server.
  const [openedAt] = useState(() => (engine && !engine.offline ? now() : null));
  const syncedAt = useRef(openedAt);
  // Once the Plan has gone (signed out, another budget), nothing may start or report here: the
  // engine may be closed, and `onSessionExpired` would sign out a session that has moved on.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
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

  // The sync running now, sync and read after it together, or null. Only one runs at a time:
  // a pull or a save that comes while one runs waits for it rather than starting another.
  const running = useRef<Promise<void> | null>(null);
  // A save made while a sync ran may not be in that sync, so it is owed one more when it ends.
  // A flag, not a queue: any number of saves during one sync owe exactly one more.
  const owed = useRef(false);

  // The one sync path, for a pull, after a save and on coming back to the app: what a failed sync shows, and signing out
  // when the session has expired, are decided here only.
  /** Returns false when the session has expired and the person is being signed out, or the Plan has gone. */
  const syncOnce = useCallback(async (): Promise<boolean> => {
    if (!engine) return false;
    let synced = false;
    try {
      await engine.sync();
      if (!alive.current) return false;
      synced = true;
      syncedAt.current = now();
      setSync('synced');
    } catch (e) {
      if (!alive.current) return false;
      const code = e instanceof EngineError ? e.code : 'internal';
      if (code === 'token-expired' && onSessionExpired) {
        setRefreshing(false);
        onSessionExpired();
        return false;
      }
      setSync(code === 'network-failure' ? 'offline' : 'failed');
    }
    // Keep showing the numbers while they are read again. A sync can add months.
    await Promise.all([read(shown.current, false), synced ? readBounds() : null]);
    return true;
  }, [engine, read, readBounds, onSessionExpired]);

  // Starts a sync. When it ends, successfully or not, a sync owed by a save runs once more,
  // through this same path, and its result is what the Plan shows. A signed-out session, or a
  // Plan that has gone, owes nothing. The sync is over however it ends, a throw included, so
  // `running` is cleared in `finally`: a rejection must never leave every later sync waiting on it.
  const startSync = useCallback((): Promise<void> => {
    // Those waiting on this sync (a pull's spinner) are done when it ends, not when the one owed does.
    const run = (async () => {
      let stillSignedIn = false;
      try {
        stillSignedIn = await syncOnce();
      } finally {
        running.current = null;
        const again = owed.current && stillSignedIn && alive.current;
        owed.current = false;
        if (again) void startSync();
      }
    })();
    running.current = run;
    return run;
  }, [syncOnce]);

  /**
   * Syncs then reads, or joins the sync already running. `spinner`: a pull, which shows it
   * until the sync it joined is done. `afterSave`: the change may not be in a sync already
   * running, so one more is owed after it.
   */
  const syncThenRead = useCallback(
    async (spinner: boolean, afterSave = false) => {
      if (!engine || !alive.current) return;
      if (spinner) setRefreshing(true);
      try {
        if (running.current) {
          if (afterSave) owed.current = true;
          await running.current;
        } else {
          await startSync();
        }
      } finally {
        if (spinner) setRefreshing(false);
      }
    },
    [engine, startSync],
  );

  const refresh = useCallback(() => syncThenRead(true), [syncThenRead]);

  const afterSave = useCallback(async () => {
    await read(shown.current, false);
    await syncThenRead(false, true);
  }, [read, syncThenRead]);

  const refreshInBackground = useCallback(() => syncThenRead(false), [syncThenRead]);

  const lastSynced = useCallback(() => syncedAt.current, []);

  const reload = useCallback(() => void read(month, true), [read, month]);

  const load: PlanLoad = result && result.month === month ? result.load : { state: 'loading' };
  return {
    load, bounds, offline: sync === 'offline', syncFailed: sync === 'failed', refreshing,
    reload, refresh, afterSave, refreshInBackground, lastSynced,
  };
}
