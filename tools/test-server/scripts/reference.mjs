// Reference client: the official @actual-app/api (Node, better-sqlite3) on the
// same throwaway server. Stands in for "what the web app shows" when checking
// the React Native engine build. Prints one JSON document on stdout.
//   node reference.mjs months <syncId> <YYYY-MM,YYYY-MM,...>
//   node reference.mjs find   <syncId> <accountId> <date> <notes>
//   node reference.mjs search <syncId> <text>
//   node reference.mjs edit   <syncId> <accountId> <date> <amount> <notes> <month> <categoryId> <budgeted>
//   node reference.mjs activity <syncId> <YYYY-MM>
//   node reference.mjs note   <syncId> <YYYY-MM>
import * as api from '@actual-app/api';

import { PASSWORD, SERVER_URL, clientDataDir } from './env.mjs';

const [cmd, syncId, ...args] = process.argv.slice(2);
const log = console.log;
console.log = console.info = console.warn = () => {}; // keep stdout clean

await api.init({ dataDir: clientDataDir('reference-client'), serverURL: SERVER_URL, password: PASSWORD });
await api.downloadBudget(syncId);
let out;
if (cmd === 'months') {
  out = [];
  for (const month of args[0].split(',')) out.push(await api.getBudgetMonth(month));
} else if (cmd === 'find') {
  const [accountId, date, notes] = args;
  out = (await api.getTransactions(accountId, date, date)).filter(t => t.notes === notes);
} else if (cmd === 'search') {
  const like = `%${args[0]}%`;
  const { data } = await api.aqlQuery(
    api.q('transactions')
      .filter({ $or: [{ 'payee.name': { $like: like } }, { notes: { $like: like } }] })
      .select(['id'])
      .orderBy({ date: 'desc' }),
  );
  const payees = (await api.getPayees()).filter(p => /bakery/i.test(p.name)).map(p => p.name);
  out = { ids: data.map(t => t.id), bakeryPayees: payees };
} else if (cmd === 'edit') {
  const [accountId, date, amount, notes, month, categoryId, budgeted] = args;
  await api.addTransactions(accountId, [{ date, amount: Number(amount), notes, payee_name: 'Reference Client' }]);
  await api.setBudgetAmount(month, categoryId, Number(budgeted));
  out = 'ok';
} else if (cmd === 'activity') {
  // Each category's transactions in the month, on on-budget accounts, newest first, from the
  // public API's grouped read: a split counts as its children, each with its own category.
  const month = args[0];
  const onBudget = new Set((await api.getAccounts()).filter(a => !a.offbudget).map(a => a.id));
  const rows = (await api.getTransactions(undefined, `${month}-01`, `${month}-31`))
    .filter(t => onBudget.has(t.account))
    .flatMap(t => (t.subtransactions?.length ? t.subtransactions.map(s => ({ ...s, child: true })) : [t]));
  // Newest first: date, then sort_order, both descending.
  rows.sort((a, b) => (a.date === b.date ? b.sort_order - a.sort_order : a.date < b.date ? 1 : -1));
  out = {};
  for (const t of rows) {
    if (!t.category) continue;
    const entry = (out[t.category] ??= { ids: [], children: 0, sum: 0 });
    entry.ids.push(t.id);
    entry.sum += t.amount;
    if (t.child) entry.children++;
  }
} else if (cmd === 'note') {
  const { data } = await api.aqlQuery(api.q('notes').filter({ id: `budget-${args[0]}` }).select(['note']));
  out = data[0]?.note ?? null;
} else {
  throw new Error('unknown command ' + cmd);
}
await api.shutdown(); // syncs
log(JSON.stringify(out));
