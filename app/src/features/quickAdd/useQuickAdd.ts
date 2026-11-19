import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

import type { AccountChoice, Engine, PayeeChoice, PlanMonth, QuickAddLists } from '../../engine/types';
import { currentMonth } from '../../lib/month';
import { announceSaved } from '../plan/quickAddSignal';
import { entryCents, press, type Key } from './amountEntry';
import {
  canSave, canStepForward, cardView, categoryChoices, dateLabel, expenseCategoryIds, newDraft, resolvePayee, stepDate,
  toggleIncome, toTransaction, withAccount, withCategory, withPayee, withPayeeText,
  type CardView, type CategoryRow, type Draft,
} from './draft';
import { matchPayees } from './payees';

export const SAVE_FAILED = 'Could not save that. Try again.';
export const SAVE_FAILED_CLOSED = 'Could not save that transaction. Add it again.';

/** Everything the sheet draws once its lists are read, already decided. */
export type QuickAddReady = {
  state: 'ready';
  /** No open, on-budget account: nothing can be saved, and the sheet says so. */
  noAccounts: boolean;
  cents: number;
  income: boolean;
  payeeText: string;
  payeeMatches: PayeeChoice[];
  card: CardView;
  categories: CategoryRow[];
  categoryId: string | null;
  accounts: AccountChoice[];
  accountId: string | null;
  accountName: string;
  dateLabel: string;
  canGoForward: boolean;
  canSave: boolean;
  /** The amount is more than the category has: Save turns coral. */
  over: boolean;
  saving: boolean;
  error: string | null;
  press(key: Key): void;
  toggleSign(): void;
  typePayee(text: string): void;
  pickPayee(payee: PayeeChoice): void;
  pickCategory(id: string | null): void;
  pickAccount(id: string): void;
  stepDate(days: -1 | 1): void;
  save(): Promise<void>;
};

export type QuickAdd = { state: 'loading' } | { state: 'failed'; retry(): void } | QuickAddReady;

type Loaded = { lists: QuickAddLists; plan: PlanMonth };

/**
 * The quick-add sheet's state: reads the lists and this month's plan, holds the draft, saves.
 * `today` is the Plan's, read once when the sheet opens. After a save it calls `onSaved` (the
 * sheet closes), then tells the Plan, which reads its month and syncs.
 */
export function useQuickAdd(engine: Engine, today: Date, { onSaved }: { onSaved(): void }): QuickAdd {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
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
    Promise.all([engine.getQuickAddLists(), engine.getPlanMonth(currentMonth(today))]).then(
      ([lists, plan]) => {
        if (!live) return;
        setLoaded({ lists, plan });
        setDraft(newDraft(lists, today));
      },
      () => {
        if (live) setFailed(true);
      },
    );
    return () => {
      live = false;
    };
  }, [engine, today, attempt]);

  const change = useCallback((next: (d: Draft) => Draft) => {
    setDraft(d => (d === null ? d : next(d)));
    setError(null);
  }, []);

  const expenseIds = useMemo(() => (loaded ? expenseCategoryIds(loaded.plan) : new Set<string>()), [loaded]);

  const save = useCallback(async () => {
    if (busy.current || !loaded || draft === null || !canSave(draft)) return;
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      const { accountId, transaction } = toTransaction(resolvePayee(draft, loaded.lists.payees));
      await engine.addTransaction(accountId, transaction);
    } catch {
      busy.current = false;
      if (mounted.current) {
        setSaving(false);
        setError(SAVE_FAILED);
      } else {
        // The sheet was swiped away (or Back pressed) while the write ran: there is no form left
        // to show the message on, so say it where the person is now.
        Alert.alert('Not saved', SAVE_FAILED_CLOSED);
      }
      return;
    }
    // Saved. The Plan reads its month again whether or not the sheet is still open: the
    // transaction exists. Closing is only for a sheet that is still showing; one already
    // dismissed must not send the Plan back. Save stays disabled while the sheet closes.
    if (mounted.current) onSaved();
    announceSaved();
  }, [engine, loaded, draft, onSaved]);

  if (failed) return { state: 'failed', retry: () => setAttempt(n => n + 1) };
  if (!loaded || draft === null) return { state: 'loading' };

  const { lists, plan } = loaded;
  const card = cardView(draft, lists, plan);
  return {
    state: 'ready',
    noAccounts: lists.accounts.length === 0,
    cents: entryCents(draft.entry),
    income: draft.income,
    payeeText: draft.payeeText,
    payeeMatches: matchPayees(lists.payees, draft.payeeText),
    card,
    categories: categoryChoices(draft, lists, plan),
    categoryId: draft.categoryId,
    accounts: lists.accounts,
    accountId: draft.accountId,
    accountName: lists.accounts.find(a => a.id === draft.accountId)?.name ?? '',
    dateLabel: dateLabel(draft.date, today),
    canGoForward: canStepForward(draft, today),
    canSave: canSave(draft) && !saving,
    over: card.bite?.state === 'over',
    saving,
    error,
    press: key => change(d => ({ ...d, entry: press(d.entry, key) })),
    toggleSign: () => change(d => toggleIncome(d, lists.payees, expenseIds)),
    typePayee: text => change(d => withPayeeText(d, text)),
    pickPayee: payee => change(d => withPayee(d, payee, expenseIds)),
    pickCategory: id => change(d => withCategory(d, id)),
    pickAccount: id => change(d => withAccount(d, id)),
    stepDate: days => change(d => stepDate(d, days, today)),
    save,
  };
}
