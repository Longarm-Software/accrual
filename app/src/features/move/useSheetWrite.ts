import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

import type { Engine, PlanMonth } from '../../engine/types';
import { canChange } from '../plan/planActions';
import { announceSaved } from '../plan/planSignal';
import { MONTH_ENDED, writeFailure } from './writeFailure';

/** The alert's title when a write fails after its sheet was dismissed. */
export const NOT_DONE = 'Not done';

/** After a refusal, the plan as read again: what a sheet needs to reconsider what was chosen. */
export type WriteOptions = { onReread?(plan: PlanMonth): void };

export type SheetWrite =
  | { state: 'loading' }
  | { state: 'failed'; retry(): void }
  /** Move or Cover was pressed after the month ended: nothing was written; said, with a way back. */
  | { state: 'ended'; message: string }
  | {
      state: 'ready';
      plan: PlanMonth;
      /** True once the plan has been read again after a `stale` refusal. */
      reread: boolean;
      saving: boolean;
      error: string | null;
      clearError(): void;
      /** Sends one write, unless one is in flight or the month has ended. */
      write(send: () => Promise<void>, options?: WriteOptions): Promise<void>;
    };

/**
 * What the move and cover sheets share: reading `month`'s plan, and writing to it as quick add
 * saves. One write at a time (a second press does nothing); after it, the sheet closes
 * (`onDone`, only while it still shows) and the Plan is told, so it reads its month and syncs.
 * A refusal keeps the sheet open with a sentence: for `stale`, the plan is read again first, so
 * the sheet shows the numbers as they are now. A failure after the sheet was dismissed is said
 * in an alert, as quick add does.
 *
 * `today` is the Plan's, followed while the sheet is open (it renews it when the app comes back).
 * A sheet left open past the end of its month would write to a month that is now past (decision
 * 7), so each press checks `canChange` against it first; if the month has ended nothing is sent
 * and the sheet says so.
 *
 * While a write runs (`saving`) the sheets ignore every change to the form, so what is written is
 * what was on screen when the button was pressed. A press is a committed intent: swiping the
 * sheet away meanwhile does not stop the write (see the alert above).
 */
export function useSheetWrite(engine: Engine, month: string, { onDone, today }: { onDone(): void; today: Date }): SheetWrite {
  // The plan and whether it was read again after a refusal change together, in one render: a
  // render between them would see a covered category with no refusal behind it.
  const [read, setRead] = useState<{ plan: PlanMonth; reread: boolean } | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const day = useRef(today);
  useEffect(() => {
    day.current = today;
  }, [today]);
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
    async (send: () => Promise<void>, { onReread }: WriteOptions = {}) => {
      if (busy.current) return;
      if (!canChange(month, day.current)) {
        setEnded(true);
        return;
      }
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
            if (mounted.current) {
              setRead({ plan: next, reread: true });
              onReread?.(next);
            }
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

  if (ended) return { state: 'ended', message: MONTH_ENDED };
  if (failed) return { state: 'failed', retry: () => setAttempt(n => n + 1) };
  if (read === null) return { state: 'loading' };
  return { state: 'ready', plan: read.plan, reread: read.reread, saving, error, clearError, write };
}
