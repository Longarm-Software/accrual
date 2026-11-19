export type RemoteBudget = { name: string; groupId: string; cloudFileId: string; encrypted: boolean };
export type MonthCategory = { id: string; name: string; budgeted: number; spent: number; balance: number; carryover: boolean };
export type MonthGroup = { id: string; name: string; is_income: boolean; categories: MonthCategory[] };
export type BudgetMonth = {
  month: string; toBudget: number; totalBudgeted: number; totalSpent: number;
  totalIncome: number; totalBalance: number; categoryGroups: MonthGroup[];
};
export type OpenStage = 'downloading' | 'opening' | 'syncing';
export type Auth = { password: string } | { sessionToken: string };

export type NewTransaction = {
  date: string; // YYYY-MM-DD
  amount: number;
  payee_name?: string;
  category?: string;
  notes?: string;
  cleared?: boolean;
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
  sessionToken(): Promise<string>;
  listBudgets(): Promise<RemoteBudget[]>;
  openBudget(budget: RemoteBudget, onStage?: (stage: OpenStage) => void | Promise<void>): Promise<void>;
  getMonth(month: string): Promise<BudgetMonth>;
  sync(): Promise<void>;
  close(): Promise<void>;
  // kept from the spike, used by the harness and the scripted run:
  getAccounts(): Promise<{ id: string; name: string; offbudget: boolean; closed: boolean }[]>;
  getTransactions(accountId: string, startDate: string, endDate: string): Promise<any[]>;
  searchTransactions(text: string): Promise<{ id: string; date: string; amount: number; notes: string | null }[]>;
  addTransaction(accountId: string, transaction: NewTransaction): Promise<void>;
};
