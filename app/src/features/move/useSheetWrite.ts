import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

import type { Engine, PlanMonth } from '../../engine/types';
import { announceSaved } from '../plan/planSignal';
import { writeFailure } from './writeFailure';

/** The alert's title when a write fails after its sheet was dismissed. */
export const NOT_DONE = 'Not done';

export type SheetWrite =
  | { state: 'loading' }
  | { state: 'failed'; retry(): void }
  | {
      state: 'ready';
      plan: PlanMonth;
      /** True once the plan has been read again after a `stale` refusal. */
      reread: boolean;
      saving: boolean;
      error: string | null;
      clearError(): void;
      /** Sends one write, unless one is in flight. */
      write(send: () => Promise<void>): Promise<void>;
    };

/**
 * What the move and cover sheets share: reading `month`'s plan, and writing to it as quick add
 * saves. One write at a time (a second press does nothing); after it, the sheet closes
 * (`onDone`, only while it still shows) and the Plan is told, so it reads its month and syncs.
 * A refusal keeps the sheet open with a sentence: for `stale`, the plan is read again first, so
 * the sheet shows the numbers as they are now. A failure after the sheet was dismissed is said
 * in an alert, as quick add does.
 */
export function useSheetWrite(engine: Engine, month: string, { onDone }: { onDone(): void }): SheetWrite {
  // The plan and whether it was read again after a refusal change together, in one render: a
  // render between them would see a covered category with no refusal behind it.
  const [read, setRead] = useState<{ plan: PlanMonth; reread: boolean } | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set at once on the first press, so a second press before React re-renders does nothing.
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let live = true;
    setFailed(false);
    engine.getPlanMonth(month).then(
      next => {
        if (live) setRead({ plan: next, reread: false });
      },
      () => {
        if (live) setFailed(true);
      },
    );
    return () => {
      live = false;
    };
  }, [engine, month, attempt]);

  const write = useCallback(
    async (send: () => Promise<void>) => {
      if (busy.current) return;
      busy.current = true;
      setSaving(true);
      setError(null);
      try {
        await send();
      } catch (e) {
        const failure = writeFailure(e);
        if (!mounted.current) {
          busy.current = false;
          // The sheet was swiped away (or Back pressed) while the write ran: say it where the person is now.
          Alert.alert(NOT_DONE, failure.message);
          return;
        }
        if (failure.reread) {
          // Still busy: nothing is sent again on the old numbers while the new ones are read.
          try {
            const next = await engine.getPlanMonth(month);
            if (mounted.current) setRead({ plan: next, reread: true });
          } catch {
            // Keep the numbers shown; the sentence still says to check them.
          }
        }
        busy.current = false;
        if (mounted.current) {
          setSaving(false);
          setError(failure.message);
        }
        return;
      }
      // Done. The Plan reads its month again whether or not the sheet is still open; closing is
      // only for a sheet still showing. The button stays off while the sheet closes.
      if (mounted.current) onDone();
      announceSaved();
    },
    [engine, month, onDone],
  );

  const clearError = useCallback(() => setError(null), []);

  if (failed) return { state: 'failed', retry: () => setAttempt(n => n + 1) };
  if (read === null) return { state: 'loading' };
  return { state: 'ready', plan: read.plan, reread: read.reread, saving, error, clearError, write };
}
