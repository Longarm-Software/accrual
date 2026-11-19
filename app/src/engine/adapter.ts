// The engine adapter: the only file that touches Actual's engine (loot-core).
// UI code imports types from ./types and receives an Engine from context.
// All amounts are integers in cents, as in Actual.
//
// There is one engine per process. Calling createEngine again signs in afresh and
// replaces the previous session; an Engine returned earlier must not be used after that.
import { EngineError } from './types';
import type { Auth, Engine, RemoteBudget } from './types';

export * from './types';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const core = require('../../engine/dist/loot-core.rn.js') as {
  init(config: { dataDir: string; serverURL: string; password?: string; sessionToken?: string }): Promise<Lib>;
  defaultDocumentDir(): string;
  getSessionToken(): Promise<string | undefined>;
  onBudgetLoaded(listener: () => void): () => void;
};
type Lib = { send(name: string, args?: unknown): Promise<any>; q(table: string): any };

const fail = (code: unknown, message: string) =>
  new EngineError(typeof code === 'string' && code ? code : 'internal', message);

export async function createEngine(config: { serverURL: string; dataDir?: string } & Auth): Promise<Engine> {
  let lib: Lib;
  try {
    lib = await core.init({ dataDir: config.dataDir ?? core.defaultDocumentDir(), ...config });
  } catch (e: any) {
    // loot-core attaches a slug: 'invalid-password', 'network-failure', 'token-expired'.
    throw fail(e?.code, 'Could not sign in');
  }

  return {
    async sessionToken() {
      const token = await core.getSessionToken();
      if (!token) throw fail('token-expired', 'Not signed in');
      return token;
    },
    async listBudgets() {
      const files = await lib.send('get-remote-files');
      if (!files) throw fail('network-failure', 'Could not list budgets');
      return files
        .filter((f: any) => !f.deleted)
        .map((f: any): RemoteBudget => ({
          name: f.name,
          groupId: f.groupId,
          cloudFileId: f.fileId,
          encrypted: Boolean(f.encryptKeyId),
        }));
    },
    // Opens in steps so a screen can say which one is running (ADR 0002).
    //
    // First open (no local copy): `downloading` covers downloading AND opening, because
    // loot-core's download-budget downloads, loads and runs the first full sync in one call
    // and gives no signal between "downloaded" and "opened". `syncing` is reported when the
    // engine announces the budget has loaded, i.e. as that first sync begins. `opening` is
    // not reported. If the announcement never comes the open still succeeds, without `syncing`.
    //
    // Reopen (local copy exists): `opening` covers loading the local copy, `syncing` the sync.
    //
    // `onStage` is awaited where we control the order, which lets the caller paint a frame
    // before the next step blocks the thread. The `syncing` report on a first open comes from
    // an engine event and cannot be awaited.
    async openBudget(budget, onStage = () => {}) {
      const local = (await lib.send('get-budgets')).find((b: any) => b.groupId === budget.groupId);
      if (!local?.id) {
        await onStage('downloading');
        let reported = false;
        const unsubscribe = core.onBudgetLoaded(() => {
          if (reported) return;
          reported = true;
          // Called at the moment of the event; a throw or rejection must not escape into the engine.
          try {
            Promise.resolve(onStage('syncing')).catch(() => {});
          } catch {}
        });
        try {
          const downloaded = await lib.send('download-budget', { cloudFileId: budget.cloudFileId });
          if (downloaded?.error) throw fail(downloaded.error.reason, 'Could not download the budget');
        } finally {
          unsubscribe();
        }
        return;
      }
      const id: string = local.id;
      await onStage('opening');
      const loaded = await lib.send('load-budget', { id });
      if (loaded?.error) throw fail(loaded.error, 'Could not open the budget');
      await onStage('syncing');
      const synced = await lib.send('sync-budget');
      if (synced?.error) throw fail(synced.error.reason, 'Could not sync the budget');
    },
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
