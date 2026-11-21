// The cover sheet as data: an overspent category, the pots that could pay, and which one will.
import { READY, type PlanCategory, type PlanMonth, type PotId } from '../../engine/types';
import { checkCover } from '../../engine/writeRules';
import { formatMoney } from '../../lib/money';
import { isOverspent } from '../plan/categoryView';
import { bite, type Bite } from '../quickAdd/bite';
import { NOT_IN_BUDGET } from './categoryDetail';
import { accepted, gain, pots, wellFormed, type Gain } from './pots';

export type Source = { id: PotId; name: string; has: number; bite: Bite; covers: number; enough: boolean };
export type CoverView = {
  title: string; // "Cover Dining out"
  name: string; // the overspent category's name
  take: string; // "Take $28.10 from", over the sources
  month: string; // the plan's month, YYYY-MM
  category: string; // the overspent category's id
  deficit: number; // positive cents
  target: Gain; // the overspent category filling to zero (or part way)
  sources: Source[]; // READY first when it has money, then categories in plan order with money
  selected: PotId | null;
  button: string; // "Cover $28.10" | "Cover $13.50 of $28.10" | "Nothing to cover with"
  canSave: boolean;
};

function overspent(plan: PlanMonth, categoryId: string): PlanCategory | null {
  const category = plan.groups.flatMap(g => g.categories).find(c => c.id === categoryId);
  return category && isOverspent(category) ? category : null;
}

/** Every pot with money in it, Ready to budget first. The overspent category has none, so it is never one. */
function sourcesFor(plan: PlanMonth, deficit: number): Source[] {
  return pots(plan)
    .filter(p => p.has > 0)
    .map(p => {
      const covers = Math.min(deficit, p.has);
      return { id: p.id, name: p.name, has: p.has, covers, enough: p.has >= deficit, bite: bite({ name: p.name, balance: p.has }, covers) };
    });
}

// Ready to budget if it is enough; else the first that is enough; else the one with the most, the first of equals.
function pick(sources: Source[]): Source | null {
  const ready = sources.find(s => s.id === READY);
  if (ready?.enough) return ready;
  const enough = sources.find(s => s.enough);
  if (enough) return enough;
  return sources.reduce<Source | null>((best, s) => (best === null || s.has > best.has ? s : best), null);
}

export function defaultSource(plan: PlanMonth, categoryId: string): PotId | null {
  const category = overspent(plan, categoryId);
  return category ? (pick(sourcesFor(plan, -category.balance))?.id ?? null) : null;
}

export function coverView(plan: PlanMonth, categoryId: string, selected: PotId | null): CoverView | null {
  const category = overspent(plan, categoryId);
  if (!category) return null;
  const deficit = -category.balance;
  const sources = sourcesFor(plan, deficit);
  const source = sources.find(s => s.id === selected) ?? pick(sources);
  const covers = source?.covers ?? 0;
  let button = 'Nothing to cover with';
  if (source) button = source.enough ? `Cover ${formatMoney(deficit)}` : `Cover ${formatMoney(covers)} of ${formatMoney(deficit)}`;
  const request = { month: plan.month, category: category.id, from: source?.id ?? READY, amount: covers };
  const canSave =
    source !== null &&
    wellFormed(request.month, request.amount) &&
    accepted(() => checkCover(plan, request));
  return {
    title: `Cover ${category.name}`,
    name: category.name,
    take: `Take ${formatMoney(deficit)} from`,
    month: plan.month,
    category: category.id,
    deficit,
    target: gain({ id: category.id, name: category.name, has: category.balance }, covers),
    sources,
    selected: source?.id ?? null,
    button,
    canSave,
  };
}

/** What Cover sends to `engine.coverOverspending`. Throws when the view cannot be saved. */
export function toCover(view: CoverView): { month: string; category: string; from: PotId; amount: number } {
  const source = view.sources.find(s => s.id === view.selected);
  if (!view.canSave || !source) throw new Error('This cover cannot be saved');
  return { month: view.month, category: view.category, from: source.id, amount: source.covers };
}

/** What a screen reader says for the overspent category's card: what it has now, and after the cover. */
export function targetLabel(view: CoverView): string {
  return `${view.name}, ${view.target.before} now, ${view.target.after}`;
}

/** Said when, read again after a refusal, the category is no longer overspent. */
export const alreadyCovered = (name: string): string => `${name} is already covered.`;

/** What the cover sheet says when `coverView` is null after a refusal: covered, or gone from the plan. */
export function noLongerToCover(plan: PlanMonth, categoryId: string): string {
  const category = plan.groups.flatMap(g => g.categories).find(c => c.id === categoryId);
  return category ? alreadyCovered(category.name) : NOT_IN_BUDGET;
}

/** Said under a source's amounts, and in its label, when it cannot cover all of the deficit. */
export const NOT_ENOUGH = 'not enough for all of it';

/** What a screen reader says for a cover source; whether it is chosen is said by its radio role. */
export function sourceLabel(source: Source): string {
  const text = `${source.name}, ${source.bite.before} now, ${source.bite.after}`;
  return source.enough ? text : `${text}, ${NOT_ENOUGH}`;
}
