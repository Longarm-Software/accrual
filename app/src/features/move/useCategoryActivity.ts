import { useEffect, useState } from 'react';

import type { ActivityRow, Engine, PlanMonth } from '../../engine/types';

export type CategoryActivity =
  | { state: 'loading' }
  | { state: 'ready'; rows: ActivityRow[] }
  | { state: 'failed'; retry(): void };

/**
 * A category's transactions in `month`. Read when the screen opens and again each time the Plan
 * publishes a new read of its month (`plan`, by identity: a save or a sync, never a render), so
 * a transaction that a sync brings in shows too. Only the newest read counts. A failed read
 * never replaces rows already showing; the error is for when there is nothing to show.
 */
export function useCategoryActivity(engine: Engine, categoryId: string, month: string, plan: PlanMonth): CategoryActivity {
  const [result, setResult] = useState<{ state: 'loading' } | { state: 'ready'; rows: ActivityRow[] } | { state: 'failed' }>({
    state: 'loading',
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    engine.getCategoryActivity(categoryId, month).then(
      rows => {
        if (live) setResult({ state: 'ready', rows });
      },
      () => {
        if (live) setResult(prev => (prev.state === 'ready' ? prev : { state: 'failed' }));
      },
    );
    return () => {
      live = false;
    };
  }, [engine, categoryId, month, plan, attempt]);

  if (result.state === 'failed') {
    return {
      state: 'failed',
      retry: () => {
        setResult({ state: 'loading' });
        setAttempt(n => n + 1);
      },
    };
  }
  return result;
}
