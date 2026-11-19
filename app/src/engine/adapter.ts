// The engine adapter: the only file that touches Actual's engine (loot-core).
// UI code imports types from ./types and receives an Engine from context.
// All amounts are integers in cents, as in Actual.
//
// There is one engine per process. Calling createEngine again signs in afresh and
// replaces the previous session; an Engine returned earlier must not be used after that.
import { EngineError } from './types';
import type { Auth, Engine, PlanCategory, PlanMonth, RemoteBudget } from './types';

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

// Signing in with a saved token works without the server, so the app can open the copy on the
// phone. loot-core's own `init({ sessionToken })` cannot do that: when the server does not answer
// it clears the token and throws 'network-failure' (server/main.ts). So the token path starts the
// engine with the server address only and repeats init's steps itself: `subscribe-set-token`,
// then `subscribe-get-user` (server/auth/app.ts), which answers
//   null                         the server rejected the token ('unauthorized')
//   { tokenExpired: true, … }    the server says the token has expired
//   { offline: true }            the server could not be reached, or answered with another error
//   { offline: false, … }        signed in
// Offline, the token is kept: the syncs that follow use it once the server is back.
//
// `subscribe-get-user` ends in a bare `fetch` with no timeout (`get` in server/post.ts). A server
// that is refused answers at once, but one whose network silently drops packets (a home LAN or
// Tailscale address while away) leaves it waiting for the platform's own timeout, about a minute.
// So the check is raced against SIGN_IN_TIMEOUT_MS, and losing the race counts as unreachable.
// The abandoned call is harmless when it answers late: `getUser` only reads the token, fetches
// and returns a value. Clearing a rejected token is done here, by the caller, not by `getUser`,
// and nothing here is listening any more.
const SIGN_IN_TIMEOUT_MS = 5000;

export async function createEngine(
  config: { serverURL: string; dataDir?: string; /** For the harness. */ signInTimeoutMs?: number } & Auth,
): Promise<Engine> {
  const dataDir = config.dataDir ?? core.defaultDocumentDir();
  const { serverURL } = config;
  let lib: Lib;
  let offline = false;
  if ('password' in config) {
    try {
      lib = await core.init({ dataDir, serverURL, password: config.password });
    } catch (e: any) {
      // loot-core attaches a slug: 'invalid-password', 'network-failure'.
      throw fail(e?.code, 'Could not sign in');
    }
  } else {
    const { sessionToken } = config;
    const timeout = config.signInTimeoutMs ?? SIGN_IN_TIMEOUT_MS;
    try {
      lib = await core.init({ dataDir, serverURL });
      await lib.send('subscribe-set-token', { token: sessionToken });
      let timer: ReturnType<typeof setTimeout> | undefined;
      const unreachable = new Promise<{ offline: true }>(resolve => {
        timer = setTimeout(() => resolve({ offline: true }), timeout);
      });
      const check = lib.send('subscribe-get-user');
      check.catch(() => {}); // if it loses the race, a late failure must not go unhandled
      const user = await Promise.race([check, unreachable]).finally(() => clearTimeout(timer));
      if (!user || user.tokenExpired === true) {
        await lib.send('subscribe-set-token', { token: '' });
        throw fail('token-expired', 'Could not sign in');
      }
      offline = user.offline === true;
    } catch (e: any) {
      if (e instanceof EngineError) throw e;
      throw fail(e?.code, 'Could not sign in');
    }
  }

  return {
    offline,
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
    // Offline: a local copy is opened and not synced, so only `opening` is reported; with no
    // local copy there is nothing to open, and it fails with 'network-failure' without trying.
    //
    // `onStage` is awaited where we control the order, which lets the caller paint a frame
    // before the next step blocks the thread. The `syncing` report on a first open comes from
    // an engine event and cannot be awaited.
    async openBudget(budget, onStage = () => {}) {
      const local = (await lib.send('get-budgets')).find((b: any) => b.groupId === budget.groupId);
      if (!local?.id) {
        if (offline) throw fail('network-failure', 'The budget is not on this device and the server cannot be reached');
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
      if (offline) return;
      await onStage('syncing');
      const synced = await lib.send('sync-budget');
      if (synced?.error) throw fail(synced.error.reason, 'Could not sync the budget');
    },
    // The Plan screen's month. `envelope-budget-month` (server/budget/app.ts) is the read Actual's
    // own budget page uses: unlike `api/budget-month` it includes each category's goal, and it
    // does not refuse a month outside the budget's bounds. It returns a flat list of sheet cells,
    // `{ name: 'budget202611!budget-<id>', value }`, with '' already turned into 0. Names, order
    // and hidden flags come from `get-categories`, which runs the same category_groups query
    // `api/budget-month` does, so the order matches it.
    //
    // A tracking budget has no envelope cells (`tracking-budget-month` reads different ones), so
    // it is refused. Its type is the synced preference `budgetType`, absent meaning envelope
    // (`isTrackingBudget` in server/budget/actions.ts).
    async getPlanMonth(month) {
      const prefs = await lib.send('preferences/get');
      if (prefs?.budgetType === 'tracking') throw fail('tracking-budget', 'Tracking budgets are not supported');
      const { grouped } = await lib.send('get-categories');
      const cells: { name: string; value: unknown }[] = await lib.send('envelope-budget-month', { month });
      const values = new Map(cells.map(c => [c.name.slice(c.name.indexOf('!') + 1), c.value]));
      const amount = (name: string) => {
        const v = values.get(name);
        return typeof v === 'number' ? v : 0;
      };
      const groups = (grouped as any[])
        .filter(g => !g.is_income && !g.hidden)
        .map(g => ({
          id: g.id as string,
          name: g.name as string,
          categories: ((g.categories ?? []) as any[])
            .filter(c => !c.hidden)
            .map((c): PlanCategory => {
              // The goal cells copy the month's budget row (handleBudgetChange in server/budget/base.ts),
              // null when no template has set them; an unset cell reads as 0. So only a positive
              // amount is a goal. `long-goal` is 1 for a `#goal` line, a balance to reach
              // (runGoal in budget/category-template-context.ts), and null otherwise.
              const goal = values.get(`goal-${c.id}`);
              return {
                id: c.id,
                name: c.name,
                budgeted: amount(`budget-${c.id}`),
                spent: amount(`sum-amount-${c.id}`),
                balance: amount(`leftover-${c.id}`),
                carryover: Boolean(values.get(`carryover-${c.id}`)),
                goal: typeof goal === 'number' && goal > 0 ? goal : null,
                longGoal: Boolean(values.get(`long-goal-${c.id}`)),
              };
            }),
        }));
      const plan: PlanMonth = {
        month,
        toBudget: amount('to-budget'),
        totalIncome: amount('total-income'),
        // The envelope sheet stores this negated, as money leaving "to budget" (server/budget/envelope.ts).
        totalBudgeted: 0 - amount('total-budgeted'),
        totalSpent: amount('total-spent'),
        groups,
      };
      return plan;
    },
    // `get-budget-bounds` (server/budget/app.ts -> createAllBudgets in budget/base.ts): from three
    // months before the earliest transaction to twelve months after the current one, inclusive.
    async getMonthBounds() {
      const { start, end } = await lib.send('get-budget-bounds');
      return { start, end };
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
    // `api/sync` (server/api.ts) throws an Error carrying `code`, the reason from the failed sync:
    // with the server unreachable, the PostError's 'network-failure' (server/sync/index.ts,
    // fullSync). The budget stays loaded and readable; nothing is rolled back.
    async sync() {
      try {
        await lib.send('api/sync');
      } catch (e: any) {
        throw fail(e?.code, 'Could not sync the budget');
      }
    },
    close: () => lib.send('close-budget'),
  };
}
