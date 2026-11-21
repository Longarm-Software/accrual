import { useState } from 'react';

import type { Engine, PotId } from '../../engine/types';
import { coverView, noLongerToCover, toCover, type CoverView } from './cover';
import { useSheetWrite } from './useSheetWrite';

/** Everything the cover sheet draws once its plan is read, already decided. */
export type CoverSheetReady = {
  state: 'ready';
  view: CoverView;
  canSave: boolean;
  saving: boolean;
  error: string | null;
  choose(id: PotId): void;
  save(): Promise<void>;
};

export type CoverSheet =
  | { state: 'loading' }
  | { state: 'failed'; retry(): void }
  /** Opened for a category that is not overspent (or not in the plan): the sheet goes back without a form. */
  | { state: 'nothing' }
  /** Read again after a refusal, the category needs no cover any more: said, with a way back. */
  | { state: 'done'; message: string }
  | CoverSheetReady;

/**
 * The cover sheet's state: reads `month`'s plan, keeps the chosen source (the default until one
 * is pressed), and covers. After a refusal the plan may have been read again: the choice is kept
 * while that pot can still pay, and if the category is no longer overspent the sheet says so.
 */
export function useCoverSheet(engine: Engine, month: string, categoryId: string, { onDone }: { onDone(): void }): CoverSheet {
  const sheet = useSheetWrite(engine, month, { onDone });
  const [selected, setSelected] = useState<PotId | null>(null);
  if (sheet.state !== 'ready') return sheet;

  const { plan } = sheet;
  const view = coverView(plan, categoryId, selected);
  if (view === null) {
    return sheet.reread ? { state: 'done', message: noLongerToCover(plan, categoryId) } : { state: 'nothing' };
  }
  return {
    state: 'ready',
    view,
    canSave: view.canSave && !sheet.saving,
    saving: sheet.saving,
    error: sheet.error,
    choose: id => {
      setSelected(id);
      sheet.clearError();
    },
    // toCover is only asked when the view says the cover can be saved; it throws otherwise.
    save: async () => {
      if (!view.canSave) return;
      const cover = toCover(view);
      await sheet.write(() => engine.coverOverspending(cover));
    },
  };
}
