// An in-memory Engine for component tests. Fake data only.
import type { Engine, PlanCategory, PlanMonth, QuickAddLists, RemoteBudget } from '../engine/types';

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

export function fakeEngine(overrides: Partial<Engine> = {}): Engine {
  return {
    offline: false,
    sessionToken: async () => 'token-for-tests',
    listBudgets: async () => fakeBudgets,
    openBudget: async (_budget, onStage = () => {}) => {
      for (const stage of ['downloading', 'syncing'] as const) await onStage(stage);
    },
    getPlanMonth: async () => fakePlanMonth,
    getMonthBounds: async () => ({ start: '2026-01', end: '2027-12' }),
    getQuickAddLists: async () => fakeQuickAddLists,
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
