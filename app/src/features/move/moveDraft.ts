// The move sheet as data: from one pot to another, an amount. The sheet draws it; these
// functions are the only way it changes.
import { READY, type MoveRequest, type PlanMonth, type PotId } from '../../engine/types';
import { checkMove } from '../../engine/writeRules';
import { formatMoney } from '../../lib/money';
import { isOverspent } from '../plan/categoryView';
import { emptyEntry, entryCents, press, type Entry, type Key } from '../quickAdd/amountEntry';
import { bite, type Bite } from '../quickAdd/bite';
import type { RowDetail } from '../quickAdd/draft';
import { accepted, gain, pot, pots, wellFormed, type Gain, type Pot } from './pots';

/** `prefilled`: the entry is still the amount the link brought, untouched by the keypad. */
export type MoveDraft = { from: PotId | null; to: PotId | null; entry: Entry; prefilled: boolean };

/**
 * A pre-filled amount is shown with both decimals (1500 is 15.00, 50 is 0.50), so it reads like
 * every other amount. Anything that is not a whole number of cents above zero gives an empty entry.
 */
function entryOf(amount: number | undefined): Entry {
  if (amount === undefined || !Number.isSafeInteger(amount) || amount <= 0) return emptyEntry;
  return { digits: String(Math.floor(amount / 100)), decimals: String(amount % 100).padStart(2, '0') };
}

/**
 * The draft a link opens: its pots where the plan has them (an unknown id is ignored, and the
 * same pot twice is kept as `from` only), and its amount.
 */
export function moveFromLink(link: { from?: PotId; to?: PotId; amount?: number }, plan: PlanMonth): MoveDraft {
  const has = (id: PotId | undefined): id is PotId => id !== undefined && pot(plan, id) !== null;
  const from = has(link.from) ? link.from : undefined;
  const to = has(link.to) && link.to !== from ? link.to : undefined;
  return newMove({ from, to, amount: link.amount });
}

/** The draft against a plan read again (after a refusal): a pot the plan no longer has is let go. */
export function fitDraft(d: MoveDraft, plan: PlanMonth): MoveDraft {
  const from = d.from !== null && pot(plan, d.from) === null ? null : d.from;
  const to = d.to !== null && pot(plan, d.to) === null ? null : d.to;
  return from === d.from && to === d.to ? d : { ...d, from, to };
}

export function newMove(start: { from?: PotId; to?: PotId; amount?: number }): MoveDraft {
  const entry = entryOf(start.amount);
  return { from: start.from ?? null, to: start.to ?? null, entry, prefilled: !isEmpty(entry) };
}

/**
 * What one keypad key does to the draft. A pre-filled amount is replaced by the first digit or
 * "." (as if the entry were empty), and delete clears it entirely; a key the empty entry refuses
 * ("0", "00") leaves it as it is. After that first key the entry behaves as typed.
 */
export function withKey(d: MoveDraft, key: Key): MoveDraft {
  if (!d.prefilled) return { ...d, entry: press(d.entry, key) };
  if (key === 'back') return { ...d, entry: emptyEntry, prefilled: false };
  const entry = press(emptyEntry, key);
  return isEmpty(entry) ? d : { ...d, entry, prefilled: false };
}

const isEmpty = (entry: Entry): boolean => entry.digits === '' && entry.decimals === null;

/** Choosing the pot that is already `to` makes it `from`, and `to` is chosen again. */
export function withFrom(d: MoveDraft, id: PotId): MoveDraft {
  return { ...d, from: id, to: d.to === id ? null : d.to };
}

/** Choosing the pot that is already `from` makes it `to`, and `from` is chosen again. */
export function withTo(d: MoveDraft, id: PotId): MoveDraft {
  return { ...d, to: id, from: d.from === id ? null : d.from };
}

export function swap(d: MoveDraft): MoveDraft {
  return { ...d, from: d.to, to: d.from };
}

export type MoveView = {
  title: string; // "Move money" | "Assign" | "Fix overbudgeting"
  from: { name: string | null; bite: Bite | null };
  to: { name: string | null; gain: Gain | null };
  canSave: boolean;
  over: boolean; // more than the from pot has
  button: string; // "Assign" | "Move"
};

/**
 * The request a draft makes against `plan`, with what the plan says each pot has as `seen`, or
 * null without both pots. A pot the plan does not have is seen as 0; the checks refuse it anyway.
 */
function request(d: MoveDraft, plan: PlanMonth): MoveRequest | null {
  if (d.from === null || d.to === null) return null;
  const seen = { from: pot(plan, d.from)?.has ?? 0, to: pot(plan, d.to)?.has ?? 0 };
  return { month: plan.month, from: d.from, to: d.to, amount: entryCents(d.entry), seen };
}

/** True when the adapter's own rules accept the draft's request against `plan`. */
function savable(d: MoveDraft, plan: PlanMonth): boolean {
  const move = request(d, plan);
  return move !== null && wellFormed(move.month, move.amount) && accepted(() => checkMove(plan, move));
}

export function moveView(d: MoveDraft, plan: PlanMonth): MoveView {
  const amount = entryCents(d.entry);
  const from = d.from === null ? null : pot(plan, d.from);
  const to = d.to === null ? null : pot(plan, d.to);
  const fromBite = from ? bite({ name: from.name, balance: from.has }, amount) : null;
  // bite's "over" is exactly amount > max(has, 0) for an amount above zero: one comparison, not two.
  const over = fromBite?.state === 'over';
  let title = 'Move money';
  if (d.from === READY) title = 'Assign';
  else if (d.to === READY && plan.toBudget < 0) title = 'Fix overbudgeting';
  return {
    title,
    from: { name: from?.name ?? null, bite: fromBite },
    to: { name: to?.name ?? null, gain: to ? gain(to, amount) : null },
    canSave: savable(d, plan),
    over,
    button: d.from === READY ? 'Assign' : 'Move',
  };
}

/** One row of a pot list: PickerList's category row, plus whether it can be picked. */
export type PotRow = { id: PotId; name: string; detail?: RowDetail; disabled?: boolean };

function potRows(plan: PlanMonth, except: PotId | null, disableEmpty: boolean): PotRow[] {
  const categories = new Map(plan.groups.flatMap(g => g.categories).map(c => [c.id, c]));
  const coral = (p: Pot): boolean => {
    const category = categories.get(p.id);
    return p.id === READY ? p.has < 0 : category !== undefined && isOverspent(category);
  };
  return pots(plan)
    .filter(p => p.id !== except)
    .map(p => {
      const row: PotRow = { id: p.id, name: p.name, detail: { text: formatMoney(p.has), tone: coral(p) ? 'over' : 'mute' } };
      if (disableEmpty && p.has <= 0) row.disabled = true;
      return row;
    });
}

/** The pots money can come from: all but the current `to`; one with nothing in it cannot be picked. */
export function fromChoices(d: MoveDraft, plan: PlanMonth): PotRow[] {
  return potRows(plan, d.to, true);
}

/** The pots money can go to: all but the current `from`. */
export function toChoices(d: MoveDraft, plan: PlanMonth): PotRow[] {
  return potRows(plan, d.from, false);
}

/**
 * What Move sends to `engine.moveMoney`: the draft's pots and amount in `plan`'s month, and as
 * `seen` what `plan` (the one the sheet is drawn from) says each pot has, so the engine refuses
 * the move if the budget is no longer what the person saw. Throws for anything `canSave` refuses,
 * a move of more than the from pot has included.
 */
export function toMove(d: MoveDraft, plan: PlanMonth): MoveRequest {
  const move = request(d, plan);
  if (move === null || !savable(d, plan)) throw new Error('This move cannot be saved yet');
  return move;
}
