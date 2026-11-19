// An in-memory Engine for component tests. Fake data only.
import type { Engine, PlanCategory, PlanMonth, RemoteBudget } from '../engine/types';

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
