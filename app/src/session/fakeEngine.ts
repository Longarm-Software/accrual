// An in-memory Engine for component tests. Fake data only.
import { EngineError, READY } from '../engine/types';
import type { ActivityRow, Engine, PlanCategory, PlanMonth, PotId, QuickAddLists, RemoteBudget } from '../engine/types';

export const fakeBudgets: RemoteBudget[] = [
  { name: 'Household', groupId: 'g-household', cloudFileId: 'c-household', encrypted: false },
  { name: 'Side business', groupId: 'g-side', cloudFileId: 'c-side', encrypted: true },
];

const category = (
  id: string, name: string, budgeted: number, spent: number, balance: number,
  goal: number | null = null, longGoal = false,
): PlanCategory => ({ id, name, budgeted, spent, balance, carryover: false, goal, longGoal });

/** One fake household month, the same one as the design mockups. Cents. */
export const fakePlanMonth: PlanMonth = {
  month: '2026-11',
  toBudget: 31200,
  totalIncome: 619200,
  totalBudgeted: 588000,
  totalSpent: -341617,
  groups: [
    {
      id: 'grp-bills',
      name: 'Bills',
      categories: [
        category('cat-rent', 'Rent', 185000, -185000, 0),
        category('cat-electricity', 'Electricity', 12000, 0, 12000),
        category('cat-insurance', 'Insurance', 10000, 0, 10000, 14000),
      ],
    },
    {
      id: 'grp-everyday',
      name: 'Everyday',
      categories: [
        category('cat-groceries', 'Groceries', 72000, -51238, 20762),
        category('cat-dining', 'Dining out', 22000, -24810, -2810),
      ],
    },
    {
      id: 'grp-goals',
      name: 'Goals',
      categories: [category('cat-emergency', 'Emergency fund', 40000, 0, 640000, 1000000, true)],
    },
  ],
};

/** What the quick-add sheet offers, for the same fake household. Categories are the plan month's. */
export const fakeQuickAddLists: QuickAddLists = {
  accounts: [
    { id: 'acct-checking', name: 'Everyday Checking' },
    { id: 'acct-savings', name: 'Rainy Day Savings' },
    { id: 'acct-card', name: 'Travel Card' },
  ],
  payees: [
    { id: 'payee-corner-shop', name: 'Corner Shop', lastCategoryId: 'cat-groceries' },
    { id: 'payee-noodle-bar', name: 'Noodle Bar', lastCategoryId: 'cat-dining' },
    { id: 'payee-landlord', name: 'Maple Street Lettings', lastCategoryId: 'cat-rent' },
    { id: 'payee-power', name: 'Bright Spark Energy', lastCategoryId: 'cat-electricity' },
    { id: 'payee-employer', name: 'Acme Widgets', lastCategoryId: 'cat-salary' },
    { id: 'payee-market', name: 'Saturday Market', lastCategoryId: null },
  ],
  incomeCategories: [
    { id: 'cat-salary', name: 'Salary' },
    { id: 'cat-other-income', name: 'Other income' },
  ],
  lastAccountId: 'acct-checking',
};

/** Dining out's transactions in the fake month, newest first. They add up to its `spent`. */
export const fakeActivity: ActivityRow[] = [
  { id: 'tx-noodles-2', date: '2026-11-18', amount: -4210, payee: 'Noodle Bar', account: 'Travel Card', notes: null },
  { id: 'tx-cafe', date: '2026-11-12', amount: -1850, payee: 'Little Lantern Cafe', account: 'Everyday Checking', notes: 'coffee' },
  { id: 'tx-pizza', date: '2026-11-07', amount: -9600, payee: 'Moonlight Pizza', account: 'Travel Card', notes: null },
  { id: 'tx-noodles-1', date: '2026-11-02', amount: -9150, payee: 'Noodle Bar', account: 'Everyday Checking', notes: 'birthday' },
];

/**
 * An in-memory Engine for component tests. Moving and covering change the month `getPlanMonth`
 * returns afterwards: a move takes `amount` from one pot and adds it to the other (budgeted and
 * balance for a category, toBudget for READY); a cover is a move of up to `amount`, capped at
 * what the source has, as loot-core caps it. Every engine starts from `fakePlanMonth`.
 */
export function fakeEngine(overrides: Partial<Engine> = {}): Engine {
  let plan: PlanMonth = fakePlanMonth;
  const has = (pot: PotId) =>
    pot === READY ? plan.toBudget : (plan.groups.flatMap(g => g.categories).find(c => c.id === pot)?.balance ?? 0);
  const shift = (pot: PotId, delta: number) => {
    plan =
      pot === READY
        ? { ...plan, toBudget: plan.toBudget + delta }
        : {
            ...plan,
            groups: plan.groups.map(g => ({
              ...g,
              categories: g.categories.map(c =>
                c.id === pot ? { ...c, budgeted: c.budgeted + delta, balance: c.balance + delta } : c,
              ),
            })),
          };
  };
  const move = (from: PotId, to: PotId, amount: number) => {
    shift(from, -amount);
    shift(to, amount);
  };
  return {
    offline: false,
    sessionToken: async () => 'token-for-tests',
    listBudgets: async () => fakeBudgets,
    openBudget: async (_budget, onStage = () => {}) => {
      for (const stage of ['downloading', 'syncing'] as const) await onStage(stage);
    },
    getPlanMonth: async () => plan,
    getMonthBounds: async () => ({ start: '2026-01', end: '2027-12' }),
    getQuickAddLists: async () => fakeQuickAddLists,
    getCategoryActivity: async categoryId => (categoryId === 'cat-dining' ? fakeActivity : []),
    moveMoney: async ({ from, to, amount }) => {
      if (amount <= 0 || from === to) throw new EngineError('invalid-move', 'Not a move');
      move(from, to, amount);
    },
    coverOverspending: async ({ category, from, amount }) => {
      if (amount <= 0) throw new EngineError('invalid-move', 'Not a cover');
      move(from, category, Math.max(0, Math.min(amount, has(from))));
    },
    getMonth: async month => ({
      month, toBudget: 31200, totalBudgeted: 588000, totalSpent: 341617, totalIncome: 619200, totalBalance: 246383,
      categoryGroups: [],
    }),
    sync: async () => {},
    close: async () => {},
    getAccounts: async () => [],
    getTransactions: async () => [],
    searchTransactions: async () => [],
    addTransaction: async () => {},
    ...overrides,
  };
}
