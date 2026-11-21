import { useState } from 'react';

import type { Engine, PotId } from '../../engine/types';
import type { MoveLink } from '../plan/planActions';
import { entryText, type EntryText, type Key } from '../quickAdd/amountEntry';
import {
  fitDraft, fromChoices, moveFromLink, moveView, swap, toChoices, toMove, withFrom, withKey, withTo,
  type MoveDraft, type MoveView, type PotRow,
} from './moveDraft';
import { useSheetWrite } from './useSheetWrite';

/** Everything the move sheet draws once its plan is read, already decided. */
export type MoveSheetReady = {
  state: 'ready';
  amount: EntryText;
  view: MoveView;
  fromId: PotId | null;
  toId: PotId | null;
  fromChoices: PotRow[];
  toChoices: PotRow[];
  canSave: boolean;
  saving: boolean;
  error: string | null;
  press(key: Key): void;
  pickFrom(id: PotId): void;
  pickTo(id: PotId): void;
  swap(): void;
  save(): Promise<void>;
};

export type MoveSheet = { state: 'loading' } | { state: 'failed'; retry(): void } | MoveSheetReady;

/**
 * The move sheet's state: reads `month`'s plan, opens the draft its link asks for (checked
 * against that plan), and moves. After a refusal the plan may have been read again: the draft is
 * kept, less any pot the plan no longer has.
 */
export function useMoveSheet(engine: Engine, month: string, link: MoveLink, { onDone }: { onDone(): void }): MoveSheet {
  const sheet = useSheetWrite(engine, month, { onDone });
  // Null until the first change: until then the draft is the link's.
  const [draft, setDraft] = useState<MoveDraft | null>(null);
  if (sheet.state !== 'ready') return sheet;

  const { plan } = sheet;
  const current = fitDraft(draft ?? moveFromLink(link, plan), plan);
  const view = moveView(current, plan);
  const change = (next: (d: MoveDraft) => MoveDraft) => {
    setDraft(d => next(fitDraft(d ?? moveFromLink(link, plan), plan)));
    sheet.clearError();
  };
  return {
    state: 'ready',
    amount: entryText(current.entry, false, { unsigned: true }),
    view,
    fromId: current.from,
    toId: current.to,
    fromChoices: fromChoices(current, plan),
    toChoices: toChoices(current, plan),
    canSave: view.canSave && !sheet.saving,
    saving: sheet.saving,
    error: sheet.error,
    press: key => change(d => withKey(d, key)),
    pickFrom: id => change(d => withFrom(d, id)),
    pickTo: id => change(d => withTo(d, id)),
    swap: () => change(swap),
    // toMove is only asked when the view says the move can be saved; it throws otherwise.
    save: async () => {
      if (!view.canSave) return;
      const move = toMove(current, plan);
      await sheet.write(() => engine.moveMoney(move));
    },
  };
}
