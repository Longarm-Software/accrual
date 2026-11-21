import { useState } from 'react';

import type { Engine, PotId } from '../../engine/types';
import { coverView, keepChoice, noLongerToCover, toCover, type CoverView } from './cover';
import { useSheetWrite } from './useSheetWrite';

/** Everything the cover sheet draws once its plan is read, already decided. */
export type CoverSheetReady = {
  state: 'ready';
  view: CoverView;
  canSave: boolean;
  /** A cover is under way: the sources are frozen (`choose` does nothing) and the button shows progress. */
  saving: boolean;
  error: string | null;
  choose(id: PotId): void;
  save(): Promise<void>;
};

export type CoverSheet =
  | { state: 'loading' }
  | { state: 'failed'; retry(): void }
  | { state: 'ended'; message: string }
  /** Opened for a category that is not overspent (or not in the plan): the sheet goes back without a form. */
  | { state: 'nothing' }
  /** Read again after a refusal, the category needs no cover any more: said, with a way back. */
  | { state: 'done'; message: string }
  | CoverSheetReady;

/**
 * The cover sheet's state: reads `month`'s plan, keeps the chosen source (the default until one
 * is pressed), and covers. After a refusal the plan may have been read again: the choice is kept
 * while that pot can still pay what the button said; otherwise none is chosen and the person
 * chooses again (`keepChoice`). If the category is no longer overspent the sheet says so.
 */
export function useCoverSheet(
  engine: Engine,
  month: string,
  categoryId: string,
  { onDone, today }: { onDone(): void; today: Date },
): CoverSheet {
  const sheet = useSheetWrite(engine, month, { onDone, today });
  // `selected` null is the default source, unless `chooseAgain`: then it is none.
  const [choice, setChoice] = useState<{ selected: PotId | null; chooseAgain: boolean }>({ selected: null, chooseAgain: false });
  if (sheet.state !== 'ready') return sheet;

  const { plan } = sheet;
  const view = coverView(plan, categoryId, choice.selected, { chooseAgain: choice.chooseAgain });
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
      if (sheet.saving) return;
      setChoice({ selected: id, chooseAgain: false });
      sheet.clearError();
    },
    // toCover is only asked when the view says the cover can be saved; it throws otherwise.
    save: async () => {
      if (!view.canSave) return;
      const cover = toCover(view);
      await sheet.write(() => engine.coverOverspending(cover), {
        onReread: next => {
          const kept = keepChoice(view, next);
          setChoice({ selected: kept, chooseAgain: kept === null });
        },
      });
    },
  };
}
