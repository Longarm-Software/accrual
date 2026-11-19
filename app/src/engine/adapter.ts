// The engine adapter: the only thing UI code talks to. The same interface can
// be backed by loot-core running in-app (this file) or, as a fallback, by a
// REST bridge (architecture.md).
//
// All amounts are integers in cents, as in Actual.

// eslint-disable-next-line @typescript-eslint/no-require-imports
const core = require('../../engine/dist/loot-core.rn.js') as {
  init(config: { dataDir: string; serverURL: string; password: string }): Promise<Lib>;
  defaultDocumentDir(): string;
};
type Lib = { send(name: string, args?: unknown): Promise<any>; q(table: string): any };

export type RemoteBudget = { name: string; groupId: string; cloudFileId: string };
export type MonthCategory = {
  id: string;
  name: string;
  budgeted: number;
  spent: number;
  balance: number;
  carryover: boolean;
};
export type MonthGroup = { id: string; name: string; is_income: boolean; categories: MonthCategory[] };
export type BudgetMonth = {
  month: string;
  toBudget: number;
  totalBudgeted: number;
  totalSpent: number;
  totalIncome: number;
  totalBalance: number;
  categoryGroups: MonthGroup[];
};
export type NewTransaction = {
  date: string; // YYYY-MM-DD
  amount: number;
  payee_name?: string;
  category?: string;
  notes?: string;
  cleared?: boolean;
};

export type Engine = {
  listBudgets(): Promise<RemoteBudget[]>;
  /** Downloads the budget on first use, otherwise opens the local copy and syncs. */
  openBudget(groupId: string): Promise<void>;
  getMonth(month: string): Promise<BudgetMonth>;
  getAccounts(): Promise<{ id: string; name: string; offbudget: boolean; closed: boolean }[]>;
  getTransactions(accountId: string, startDate: string, endDate: string): Promise<any[]>;
  /** Case- and accent-insensitive search over payee names and notes. */
  searchTransactions(text: string): Promise<{ id: string; date: string; amount: number; notes: string | null }[]>;
  addTransaction(accountId: string, transaction: NewTransaction): Promise<void>;
  sync(): Promise<void>;
  close(): Promise<void>;
};

export async function createEngine(config: {
  serverURL: string;
  password: string;
  dataDir?: string;
}): Promise<Engine> {
  const lib = await core.init({
    dataDir: config.dataDir ?? core.defaultDocumentDir(),
    serverURL: config.serverURL,
    password: config.password,
  });

  return {
    async listBudgets() {
      const files = (await lib.send('get-remote-files')) ?? [];
      return files
        .filter((f: any) => !f.deleted)
        .map((f: any) => ({ name: f.name, groupId: f.groupId, cloudFileId: f.fileId }));
    },
    openBudget: groupId => lib.send('api/download-budget', { syncId: groupId }),
    getMonth: month => lib.send('api/budget-month', { month }),
    getAccounts: () => lib.send('api/accounts-get'),
    getTransactions: (accountId, startDate, endDate) =>
      lib.send('api/transactions-get', { accountId, startDate, endDate }),
    async searchTransactions(text) {
      const like = `%${text}%`;
      const query = lib
        .q('transactions')
        .filter({ $or: [{ 'payee.name': { $like: like } }, { notes: { $like: like } }] })
        .select(['id', 'date', 'amount', 'notes'])
        .orderBy({ date: 'desc' });
      return (await lib.send('api/query', { query: query.serialize() })).data;
    },
    async addTransaction(accountId, transaction) {
      await lib.send('api/transactions-add', { accountId, transactions: [transaction] });
    },
    sync: () => lib.send('api/sync'),
    close: () => lib.send('close-budget'),
  };
}
