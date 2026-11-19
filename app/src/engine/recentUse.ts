// What the newest transactions say about how the budget is used: which payees were used most
// recently, the category each was last used with, and the account of the newest transaction.
// Pure, so it is tested without the engine; the adapter supplies the rows, newest first.
export type UseRow = { payee: string | null; category: string | null; account: string | null };

export function recentUse(rows: UseRow[]): {
  payeeOrder: string[]; // payee ids, newest use first, no duplicates
  lastCategory: Map<string, string>; // payee id -> category id
  lastAccount: string | null;
} {
  const seen = new Set<string>();
  const payeeOrder: string[] = [];
  const lastCategory = new Map<string, string>();
  for (const { payee, category } of rows) {
    if (!payee) continue;
    if (!seen.has(payee)) {
      seen.add(payee);
      payeeOrder.push(payee);
    }
    // The newest row that has a category wins; a newer row without one does not hide it.
    if (category && !lastCategory.has(payee)) lastCategory.set(payee, category);
  }
  return { payeeOrder, lastCategory, lastAccount: rows[0]?.account ?? null };
}
