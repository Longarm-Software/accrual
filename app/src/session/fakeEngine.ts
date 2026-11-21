// An in-memory Engine for component tests. Fake data only.
import { READY } from '../engine/types';
import { checkCover, checkMonthAndAmount, checkMove, checkTransaction } from '../engine/writeRules';
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

const fakeBounds = { start: '2026-01', end: '2027-12' };

/** The fake, plus what a test needs to play the other device. */
export type FakeEngine = Engine & {
  /**
   * Another device changed the budget and the change has reached the phone (the adapter's sync
   * before a write pulls it): the next read, and the next write's checks, see `edit(plan)`.
   */
  elsewhere(edit: (plan: PlanMonth) => PlanMonth): void;
};

/** `plan` with one category's figures changed, as another device would leave them. */
export function withCategory(plan: PlanMonth, id: string, change: Partial<PlanCategory>): PlanMonth {
  return {
    ...plan,
    groups: plan.groups.map(g => ({ ...g, categories: g.categories.map(c => (c.id === id ? { ...c, ...change } : c)) })),
  };
}

/**
 * An in-memory Engine for component tests. Every engine starts from `fakePlanMonth`, which it
 * returns for any month. Moving and covering refuse what the adapter refuses (the same checks,
 * from writeRules.ts, against the month as it stands, `seen` included) and otherwise change that
 * month: `amount` leaves one pot and reaches the other. For a category that is its budgeted and
 * balance, for READY its toBudget; totalBudgeted follows the categories, so it changes only when
 * READY is one end.
 */
export function fakeEngine(overrides: Partial<Engine> = {}): FakeEngine {
  let plan: PlanMonth = fakePlanMonth;
  const shift = (pot: PotId, delta: number) => {
    plan =
      pot === READY
        ? { ...plan, toBudget: plan.toBudget + delta }
        : {
            ...plan,
            totalBudgeted: plan.totalBudgeted + delta,
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
    getMonthBounds: async () => fakeBounds,
    getQuickAddLists: async () => fakeQuickAddLists,
    getCategoryActivity: async (categoryId, month) =>
      categoryId === 'cat-dining' ? fakeActivity.filter(row => row.date.startsWith(`${month}-`)) : [],
    moveMoney: async request => {
      checkMonthAndAmount(request.month, request.amount, fakeBounds);
      checkMove(plan, request);
      move(request.from, request.to, request.amount);
    },
    coverOverspending: async request => {
      checkMonthAndAmount(request.month, request.amount, fakeBounds);
      checkCover(plan, request);
      move(request.from, request.category, request.amount);
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
    addTransaction: async (_accountId, transaction) => checkTransaction(transaction),
    elsewhere: edit => {
      plan = edit(plan);
    },
    ...overrides,
  };
}
