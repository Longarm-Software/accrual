// The engine adapter: the only file that touches Actual's engine (loot-core).
// UI code imports types from ./types and receives an Engine from context.
// All amounts are integers in cents, as in Actual.
//
// There is one engine per process. Calling createEngine again signs in afresh and
// replaces the previous session; an Engine returned earlier must not be used after that.
import { recentUse, type UseRow } from './recentUse';
import { EngineError, READY } from './types';
import type { ActivityRow, Auth, Engine, MonthBounds, PlanCategory, PlanMonth, QuickAddLists, RemoteBudget } from './types';
import { checkCover, checkMonthAndAmount, checkMove, checkTransaction } from './writeRules';

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
// A sync gives up after this long, for the same reason; see `sync` below.
const SYNC_TIMEOUT_MS = 15000;
// How many of the newest transactions quick add reads to order payees and suggest categories.
const RECENT_USE_ROWS = 1000;

export async function createEngine(
  config: {
    serverURL: string;
    dataDir?: string;
    /** For the harness. */ signInTimeoutMs?: number;
    /** For the harness. */ syncTimeoutMs?: number;
  } & Auth,
): Promise<Engine> {
  const dataDir = config.dataDir ?? core.defaultDocumentDir();
  const { serverURL } = config;
  const syncTimeoutMs = config.syncTimeoutMs ?? SYNC_TIMEOUT_MS;
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

  // The currency Actual's own client passes to the budget actions; see `moveMoney`.
  const currency = async (): Promise<string> => {
    const prefs = await lib.send('preferences/get');
    return typeof prefs?.defaultCurrencyCode === 'string' ? prefs.defaultCurrencyCode : '';
  };
  // The month a budget write is checked against, read just before it. The month and amount are
  // checked first, so no read is made with a month the budget does not have.
  const currentMonth = async (month: string, amount: number): Promise<PlanMonth> => {
    let bounds: MonthBounds;
    try {
      bounds = await readMonthBounds();
    } catch {
      throw new EngineError('internal', 'Could not read the budget');
    }
    checkMonthAndAmount(month, amount, bounds);
    try {
      return await readPlanMonth(month);
    } catch (e) {
      if (e instanceof EngineError) throw e;
      throw new EngineError('internal', 'Could not read the budget');
    }
  };
  // A budget action that throws inside loot-core rejects with 'internal'.
  const budgetAction = async (message: string, run: () => Promise<void>) => {
    try {
      await run();
    } catch {
      throw new EngineError('internal', message);
    }
  };

  // The Plan screen's month; see `getPlanMonth`. Budget writes also read it, to check against.
  async function readPlanMonth(month: string): Promise<PlanMonth> {
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
  }

  // `get-budget-bounds` (server/budget/app.ts -> createAllBudgets in budget/base.ts): from three
  // months before the earliest transaction to twelve months after the current one, inclusive.
  async function readMonthBounds(): Promise<MonthBounds> {
    const { start, end } = await lib.send('get-budget-bounds');
    return { start, end };
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
    getPlanMonth: month => readPlanMonth(month),
    getMonthBounds: () => readMonthBounds(),
    getMonth: month => lib.send('api/budget-month', { month }),
    // What the quick-add sheet offers. `api/accounts-get` returns live accounts in Actual's order
    // (sort_order, name) with `offbudget` and `closed` as booleans (accountModel in
    // server/api-models.ts). `api/payees-get` returns live payees as { id, name, transfer_acct }.
    // `get-categories` returns every group, hidden ones included, each with its categories and
    // `is_income` / `hidden` as booleans, in the order the Plan screen uses.
    //
    // Recent use is one query on `transactions`. The default `splits: 'inline'` drops split
    // parents (`is_parent = 0`, server/aql/schema/executors.ts), so 'all' is asked for and the
    // children left out with `is_child`. The `tombstone: false` filter is required, not a
    // restatement: with `splits: 'all'` the query reads `v_transactions_internal`, which keeps
    // deleted transactions, and the executor adds no tombstone condition of its own
    // (server/aql/schema/index.ts tableViews; executors.ts). Without it, deleted transactions
    // would set the payee order, the default account and the suggested categories. A payee,
    // category or account that has been deleted reads as null (the compiler's `validateRefs`
    // joins them on `tombstone = 0`).
    async getQuickAddLists() {
      const [rawAccounts, rawPayees, { grouped }] = await Promise.all([
        lib.send('api/accounts-get'),
        lib.send('api/payees-get'),
        lib.send('get-categories'),
      ]);
      const query = lib
        .q('transactions')
        .options({ splits: 'all' })
        .filter({ is_child: false, tombstone: false })
        .select(['payee', 'category', 'account'])
        .orderBy([{ date: 'desc' }, { sort_order: 'desc' }])
        .limit(RECENT_USE_ROWS);
      const rows: UseRow[] = (await lib.send('api/query', { query: query.serialize() })).data;
      const use = recentUse(rows);

      const accounts = (rawAccounts as any[])
        .filter(a => !a.offbudget && !a.closed)
        .map(a => ({ id: a.id as string, name: a.name as string }));
      // A category is offered, and suggested, only when the Plan screen would show it: neither it
      // nor its group is hidden.
      const visibleGroups = (grouped as any[]).filter(g => !g.hidden);
      const visibleCategories = new Set<string>(
        visibleGroups.flatMap(g => ((g.categories ?? []) as any[]).filter(c => !c.hidden).map(c => c.id as string)),
      );
      const incomeCategories = visibleGroups
        .filter(g => g.is_income)
        .flatMap(g => ((g.categories ?? []) as any[]).filter(c => !c.hidden))
        .map(c => ({ id: c.id as string, name: c.name as string }));

      const byId = new Map<string, { id: string; name: string }>(
        (rawPayees as any[]).filter(p => !p.transfer_acct).map(p => [p.id, { id: p.id, name: p.name }]),
      );
      const choice = (p: { id: string; name: string }) => {
        const category = use.lastCategory.get(p.id);
        return { ...p, lastCategoryId: category && visibleCategories.has(category) ? category : null };
      };
      const recent = use.payeeOrder.filter(id => byId.has(id));
      const recentSet = new Set(recent);
      const rest = [...byId.values()]
        .filter(p => !recentSet.has(p.id))
        .sort((a, b) => {
          const x = a.name.toLowerCase();
          const y = b.name.toLowerCase();
          return x < y ? -1 : x > y ? 1 : 0;
        });
      const lists: QuickAddLists = {
        accounts,
        payees: [...recent.map(id => choice(byId.get(id)!)), ...rest.map(choice)],
        incomeCategories,
        lastAccountId: accounts.some(a => a.id === use.lastAccount) ? use.lastAccount : null,
      };
      return lists;
    },
    // A category's transactions for the month, as the category screen lists them. The default
    // `splits: 'inline'` is the mode wanted here: it leaves split parents out (`is_parent = 0`) and
    // keeps their children, each with its own category; a parent's category reads as null anyway
    // (the `v_transactions_internal` view in server/aql/schema/index.ts). Inline reads
    // `v_transactions_internal_alive`, which already drops deleted transactions and the children
    // of deleted parents; `tombstone: false` is kept so the rule does not hang on the mode.
    // Only on-budget accounts count, as in the `sum-amount` cell the Plan's `spent` comes from
    // (getSumAmountsByMonth in server/budget/base.ts), so the rows add up to `spent`. Dates are
    // stored as YYYYMMDD integers, so `-31` bounds every month. A transfer's payee is the other
    // account's transfer payee; the row names that account (`payee.transfer_acct.name`) rather
    // than trusting the payee's own name to match it.
    async getCategoryActivity(categoryId, month) {
      const query = lib
        .q('transactions')
        .options({ splits: 'inline' })
        .filter({
          category: categoryId,
          // Two conditions, not `{ $gte, $lte }` in one object: given both on one field, AQL keeps
          // only one, and a past month listed every later month's transactions too.
          $and: [{ date: { $gte: `${month}-01` } }, { date: { $lte: `${month}-31` } }],
          'account.offbudget': false,
          tombstone: false,
        })
        .select([
          'id',
          'date',
          'amount',
          'notes',
          { payeeName: 'payee.name' },
          { transferName: 'payee.transfer_acct.name' },
          { accountName: 'account.name' },
        ])
        .orderBy([{ date: 'desc' }, { sort_order: 'desc' }]);
      const rows: any[] = (await lib.send('api/query', { query: query.serialize() })).data;
      return rows.map(
        (r): ActivityRow => ({
          id: r.id,
          date: r.date,
          amount: r.amount,
          payee: r.transferName || r.payeeName || null,
          account: r.accountName ?? '',
          notes: r.notes ?? null,
        }),
      );
    },
    // Moving and covering call Actual's own budget actions (server/budget/actions.ts), registered
    // as `budget/...` mutators wrapped in `undoable` (server/budget/app.ts), so the budget rows and
    // the movement note on the month are what Actual's apps would write, and they sync like any
    // other change. Months are YYYY-MM (`sheetForMonth`, `dbMonth`).
    //
    // loot-core checks almost none of what it is given (see writeRules.ts), and two people edit
    // the same budget, so a sheet can be showing older figures. Each write therefore reads the
    // budget's bounds and the month as they are now, immediately before the action, and refuses
    // with 'invalid-move' or 'stale' anything that would not do exactly what was asked. With the
    // checks passed, every action below moves exactly `amount`:
    //
    // `transfer-category` subtracts from `from`'s budgeted amount and adds to `to`'s, or to nothing
    // when `to` is 'to-budget' (READY), and appends "Reassigned …" to the month's note. It checks
    // nothing itself. `transfer-category` cannot move FROM READY: it would write a budget row for
    // a category called 'to-budget'. So READY as `from` goes through `transfer-available`, as
    // Actual's own Ready to budget menu does. That adds to the category, clamped to between zero
    // and what Ready to budget has, and writes no note; the check that Ready to budget has the
    // amount keeps the clamp from ever cutting a move short.
    //
    // `currencyCode` only sets the decimal places of the amount in that note (`getCurrency` falls
    // back to "None", two places, for a missing or unknown code). Actual's web app passes
    // `format.currency.code`, which is the synced preference `defaultCurrencyCode` or '' (useFormat),
    // so the same is passed here.
    async moveMoney(move) {
      const { month, from, to, amount } = move;
      checkMove(await currentMonth(month, amount), move);
      await budgetAction('Could not move the money', async () => {
        if (from === READY) {
          await lib.send('budget/transfer-available', { month, amount, category: to });
        } else {
          const currencyCode = await currency();
          await lib.send('budget/transfer-category', { month, amount, from, to, currencyCode });
        }
      });
    },
    // `cover-overspending` takes a positive amount and inverts it itself. Given an amount it never
    // reads the category's balance: it moves min(amount, what `from` has) whether or not the
    // category is overspent, and treats an amount of 0 as "cover all of it". The checks refuse a
    // category that is not overspent, an amount above what it is over by or above what the source
    // has, and READY as the category (that would write a budget row for a category 'to-budget').
    async coverOverspending(cover) {
      const { month, category, from, amount } = cover;
      checkCover(await currentMonth(month, amount), cover);
      await budgetAction('Could not cover the overspending', async () => {
        const currencyCode = await currency();
        await lib.send('budget/cover-overspending', { month, to: category, from, amount, currencyCode });
      });
    },
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
    // loot-core stores the date as parseInt of its digits without checking it, so a malformed
    // date would be stored as NaN; the date and amount are checked first (writeRules.ts).
    async addTransaction(accountId, transaction) {
      checkTransaction(transaction);
      await lib.send('api/transactions-add', { accountId, transactions: [transaction] });
    },
    // `api/sync` (server/api.ts) throws an Error carrying `code`, the reason from the failed sync:
    // with the server unreachable, the PostError's 'network-failure' (server/sync/index.ts,
    // fullSync). The budget stays loaded and readable; nothing is rolled back.
    //
    // Like sign-in, a sync ends in fetches with no timeout, so a server that silently drops
    // packets would leave it waiting about a minute. It is raced against SYNC_TIMEOUT_MS, and
    // losing the race counts as 'network-failure'. The abandoned sync keeps running underneath
    // and finishes or fails on its own; changes on the phone stay queued either way. loot-core
    // runs one sync at a time: `fullSync` is wrapped in `once` (shared/async.ts), so a sync
    // started while another is still running joins it rather than starting a second one. A
    // second call here therefore waits on the same underlying sync, with its own time limit.
    async sync() {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timedOut = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(fail('network-failure', 'Could not sync the budget')), syncTimeoutMs);
      });
      const run = lib.send('api/sync').catch((e: any) => {
        throw fail(e?.code, 'Could not sync the budget');
      });
      run.catch(() => {}); // if it loses the race, a late failure must not go unhandled
      await Promise.race([run, timedOut]).finally(() => clearTimeout(timer));
    },
    close: () => lib.send('close-budget'),
  };
}
