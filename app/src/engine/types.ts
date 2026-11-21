export type RemoteBudget = { name: string; groupId: string; cloudFileId: string; encrypted: boolean };
export type MonthCategory = { id: string; name: string; budgeted: number; spent: number; balance: number; carryover: boolean };
export type MonthGroup = { id: string; name: string; is_income: boolean; categories: MonthCategory[] };
export type BudgetMonth = {
  month: string; toBudget: number; totalBudgeted: number; totalSpent: number;
  totalIncome: number; totalBalance: number; categoryGroups: MonthGroup[];
};
export type PlanCategory = {
  id: string;
  name: string;
  budgeted: number; // cents assigned this month
  spent: number; // cents, negative or zero
  balance: number; // cents left; negative when overspent
  carryover: boolean; // overspending rolls into next month
  goal: number | null; // cents; the target a goal template set for this month, or null
  longGoal: boolean; // true when `goal` is a balance to reach, false when it is an amount to budget
};
export type PlanGroup = { id: string; name: string; categories: PlanCategory[] };
export type PlanMonth = {
  month: string; // YYYY-MM
  toBudget: number; // negative when overbudgeted
  totalIncome: number;
  totalBudgeted: number; // positive: loot-core's own figure is negated, see adapter.ts
  totalSpent: number; // negative or zero
  groups: PlanGroup[]; // expense groups only, in Actual's order; hidden groups and categories left out
};
export type MonthBounds = { start: string; end: string }; // YYYY-MM, inclusive
export type OpenStage = 'downloading' | 'opening' | 'syncing';
export type Auth = { password: string } | { sessionToken: string };

export type AccountChoice = { id: string; name: string };
export type PayeeChoice = { id: string; name: string; lastCategoryId: string | null };
export type CategoryChoice = { id: string; name: string };
export type QuickAddLists = {
  accounts: AccountChoice[]; // open, on-budget, in Actual's order
  payees: PayeeChoice[]; // most recently used first, then the rest by name; no transfer payees
  incomeCategories: CategoryChoice[]; // visible income categories, in Actual's order
  lastAccountId: string | null; // the account of the most recent transaction, if it is in `accounts`
};

export type NewTransaction = {
  date: string; // YYYY-MM-DD
  amount: number;
  payee?: string; // an existing payee's id; use this or payee_name, not both
  payee_name?: string;
  category?: string;
  notes?: string;
  cleared?: boolean;
};

export const READY = 'to-budget'; // the pot that is Ready to budget
export type PotId = string; // a category id, or READY
export type ActivityRow = {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number; // cents; negative is money out
  payee: string | null; // the payee's name; for a transfer, the other account's name
  account: string; // the account's name
  notes: string | null;
};

/** An engine failure with a short code the UI can turn into a sentence. */
export class EngineError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'EngineError';
    this.code = code;
  }
}

export type Engine = {
  /** True when the server could not be reached at sign-in. Budgets open from the copy on the phone. */
  readonly offline: boolean;
  sessionToken(): Promise<string>;
  listBudgets(): Promise<RemoteBudget[]>;
  openBudget(budget: RemoteBudget, onStage?: (stage: OpenStage) => void | Promise<void>): Promise<void>;
  getPlanMonth(month: string): Promise<PlanMonth>;
  getMonthBounds(): Promise<MonthBounds>;
  getMonth(month: string): Promise<BudgetMonth>;
  getQuickAddLists(): Promise<QuickAddLists>;
  /** The month's transactions in a category, newest first. A split's children count, not its parent. */
  getCategoryActivity(categoryId: string, month: string): Promise<ActivityRow[]>;
  /**
   * Moves exactly `amount` cents from one pot to another in `month` (YYYY-MM), or refuses:
   * 'invalid-move' for a month the budget does not have, an amount that is not a whole number
   * from 1 to MAX_AMOUNT, a pot that is neither READY nor a category the Plan shows, or the same
   * pot twice; 'stale' when the source now has less than `amount`. See writeRules.ts.
   */
  moveMoney(move: { month: string; from: PotId; to: PotId; amount: number }): Promise<void>;
  /**
   * Covers exactly `amount` cents of `category`'s overspending in `month` from `from`, or refuses:
   * 'invalid-move' as for a move, and when `category` is READY or `from === category`; 'stale'
   * when the category is not now overspent by at least `amount` or the source has less than it.
   */
  coverOverspending(cover: { month: string; category: string; from: PotId; amount: number }): Promise<void>;
  /** Rejects with code 'network-failure' if it has not finished within the sync time limit (15 s). */
  sync(): Promise<void>;
  close(): Promise<void>;
  // kept from the spike, used by the harness and the scripted run:
  getAccounts(): Promise<{ id: string; name: string; offbudget: boolean; closed: boolean }[]>;
  getTransactions(accountId: string, startDate: string, endDate: string): Promise<any[]>;
  searchTransactions(text: string): Promise<{ id: string; date: string; amount: number; notes: string | null }[]>;
  /** Rejects with 'invalid-transaction' for a date not on the calendar or a zero, fractional or out-of-range amount. */
  addTransaction(accountId: string, transaction: NewTransaction): Promise<void>;
};
