// Which buttons the Plan and the category screen offer, and the links they open.
//
// A link carries pot ids and an amount in its query: `/move?from=…&to=…&amount=…` and
// `/cover?category=…`. An id is letters, digits, "-" and "_" (Actual's ids are UUIDs; READY is
// "to-budget"), so it needs no escaping; an amount is whole cents, a plain integer above zero.
// The screens read them back with the parsers below and ignore any part that is malformed.
import { READY, type PlanMonth, type PotId } from '../../engine/types';
import { MAX_AMOUNT } from '../../engine/writeRules';
import { compareMonths, currentMonth } from '../../lib/month';
import { isOverspent } from './categoryView';

export type PlanAction = { label: string; href: string } | null;

export type MoveLink = { from?: PotId; to?: PotId; amount?: number };
export type CoverLink = { category?: string };

export function moveHref(link: MoveLink): string {
  const parts: string[] = [];
  if (link.from !== undefined) parts.push(`from=${link.from}`);
  if (link.to !== undefined) parts.push(`to=${link.to}`);
  if (link.amount !== undefined) parts.push(`amount=${link.amount}`);
  return parts.length === 0 ? '/move' : `/move?${parts.join('&')}`;
}

export function coverHref(category: string): string {
  return `/cover?category=${category}`;
}

/** A pot or category id from a link, or null when it is not one. */
export function parseId(value: unknown): string | null {
  return typeof value === 'string' && /^[A-Za-z0-9_-]+$/.test(value) ? value : null;
}

/** Whole cents from a link: digits only, no leading zero, from 1 to MAX_AMOUNT; otherwise null. */
export function parseAmount(value: unknown): number | null {
  if (typeof value !== 'string' || !/^[1-9]\d{0,15}$/.test(value)) return null;
  const amount = Number(value);
  return amount <= MAX_AMOUNT ? amount : null;
}

/** A move link's query, as the router hands it over. A malformed part is left out. */
export function parseMoveParams(params: { from?: unknown; to?: unknown; amount?: unknown }): MoveLink {
  const link: MoveLink = {};
  const from = parseId(params.from);
  const to = parseId(params.to);
  const amount = parseAmount(params.amount);
  if (from !== null) link.from = from;
  if (to !== null) link.to = to;
  if (amount !== null) link.amount = amount;
  return link;
}

export function parseCoverParams(params: { category?: unknown }): CoverLink {
  const category = parseId(params.category);
  return category === null ? {} : { category };
}

/** Nothing is moved, covered or assigned in a month before the current one (decision 7). */
export function canChange(month: string, today: Date): boolean {
  return compareMonths(month, currentMonth(today)) >= 0;
}

/** The top card's button: Assign what is ready, or Fix an overbudgeted month by the shortfall. */
export function heroAction(plan: PlanMonth, today: Date): PlanAction {
  if (!canChange(plan.month, today)) return null;
  if (plan.toBudget > 0) return { label: 'Assign', href: moveHref({ from: READY }) };
  if (plan.toBudget < 0) return { label: 'Fix', href: moveHref({ to: READY, amount: -plan.toBudget }) };
  return null;
}

/** The overspent notice's button: cover the first overspent category in plan order. */
export function noticeAction(plan: PlanMonth, today: Date): PlanAction {
  if (!canChange(plan.month, today)) return null;
  const first = plan.groups.flatMap(g => g.categories).find(isOverspent);
  return first ? { label: 'Cover', href: coverHref(first.id) } : null;
}

/** The category screen's button: Cover when it is overspent, else Move money from it (or to it, when it has nothing). */
export function categoryAction(plan: PlanMonth, categoryId: string, today: Date): PlanAction {
  if (!canChange(plan.month, today)) return null;
  const category = plan.groups.flatMap(g => g.categories).find(c => c.id === categoryId);
  if (!category) return null;
  if (isOverspent(category)) return { label: 'Cover', href: coverHref(category.id) };
  const link = category.balance > 0 ? { from: category.id } : { to: category.id };
  return { label: 'Move money', href: moveHref(link) };
}
