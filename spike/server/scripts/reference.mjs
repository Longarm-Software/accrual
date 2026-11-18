// Reference client: the official @actual-app/api (Node, better-sqlite3) on the
// same throwaway server. Stands in for "what the web app shows" when checking
// the React Native engine build. Prints one JSON document on stdout.
//   node reference.mjs months <syncId> <YYYY-MM,YYYY-MM,...>
//   node reference.mjs find   <syncId> <accountId> <date> <notes>
//   node reference.mjs edit   <syncId> <accountId> <date> <amount> <notes> <month> <categoryId> <budgeted>
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
} else if (cmd === 'edit') {
  const [accountId, date, amount, notes, month, categoryId, budgeted] = args;
  await api.addTransactions(accountId, [{ date, amount: Number(amount), notes, payee_name: 'Reference Client' }]);
  await api.setBudgetAmount(month, categoryId, Number(budgeted));
  out = 'ok';
} else {
  throw new Error('unknown command ' + cmd);
}
await api.shutdown(); // syncs
log(JSON.stringify(out));
