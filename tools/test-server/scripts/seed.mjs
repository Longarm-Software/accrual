// Seeds the throwaway server with generated FAKE budgets (deterministic PRNG).
//   Spike Small: ~4 months, a few hundred transactions
//   Spike Large: 36 months, 12,000+ transactions (for timing)
// Nothing here is derived from a real budget.
import * as api from '@actual-app/api';

import { PASSWORD, SERVER_URL, clientDataDir } from './env.mjs';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GROUPS = {
  Bills: ['Rent', 'Electricity', 'Internet', 'Phone', 'Insurance', 'Water'],
  Everyday: ['Groceries', 'Dining Out', 'Fuel', 'Transit', 'Household', 'Pets', 'Coffee'],
  Lifestyle: ['Clothing', 'Hobbies', 'Subscriptions', 'Gifts', 'Fitness', 'Books'],
  Goals: ['Emergency Fund', 'Holiday', 'Car Repairs', 'New Laptop'],
};
const PAYEES = [
  'Corner Grocer', 'Fresh Fields Market', 'Bean There Café', 'Zoë’s Bakery', 'Volt Energy Co',
  'FibreLink Internet', 'Ringo Mobile', 'Harbour Insurance', 'City Water Board', 'Pump & Go',
  'Metro Transit', 'Hammer & Nail Hardware', 'Paws Pet Supply', 'Thread & Needle', 'Pixel Games',
  'StreamBox', 'Giftwrap Lane', 'Iron Temple Gym', 'Dog-Eared Books', 'Noodle Republic',
  'Taco Estación', 'Brick Oven Pizza', 'Sunrise Diner', 'Greenleaf Pharmacy', 'Quick Stop',
  'Parkside Rentals', 'Wrench Works Auto', 'Byte Electronics', 'Nimbus Airlines', 'Seaside Inn',
];
const pad = n => String(n).padStart(2, '0');
function monthAdd(base, delta) {
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}
const daysIn = m => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)).getUTCDate();

async function build({ seed, months, txPerMonth }) {
  const rand = mulberry32(seed);
  const pick = arr => arr[Math.floor(rand() * arr.length)];
  const cents = (lo, hi) => Math.round((lo + rand() * (hi - lo)) * 100);
  const now = new Date();
  const today = now.getUTCDate();
  const thisMonth = monthAdd(now, 0);

  const accounts = {};
  for (const [name, bal, extra] of [
    ['Everyday Checking', 412345, {}],
    ['Rainy Day Savings', 1250000, {}],
    ['Rewards Credit Card', -84512, {}],
    ['Cash Wallet', 6500, {}],
    ['Index Fund', 3400000, { offbudget: true }],
  ]) {
    accounts[name] = await api.createAccount({ name, ...extra }, bal);
  }
  const spendAccounts = ['Everyday Checking', 'Rewards Credit Card', 'Cash Wallet'].map(n => accounts[n]);

  const cats = [];
  for (const [group, names] of Object.entries(GROUPS)) {
    const groupId = await api.createCategoryGroup({ name: group });
    for (const name of names) {
      cats.push({ name, id: await api.createCategory({ name, group_id: groupId }) });
    }
  }
  const income = (await api.getCategories()).find(c => c.is_income && c.name === 'Income');
  const payees = await api.getPayees();
  const savingsTransfer = payees.find(p => p.transfer_acct === accounts['Rainy Day Savings']);

  const batches = Object.fromEntries(Object.values(accounts).map(id => [id, []]));
  let count = 0;
  for (let i = -(months - 1); i <= 0; i++) {
    const month = monthAdd(now, i);
    const lastDay = month === thisMonth ? today : daysIn(month);
    const day = () => `${month}-${pad(1 + Math.floor(rand() * lastDay))}`;

    // Two pay days, a savings transfer and one split shop per month.
    for (const d of [1, 15]) {
      if (d <= lastDay) {
        batches[accounts['Everyday Checking']].push({
          date: `${month}-${pad(d)}`, amount: cents(2400, 2600), payee_name: 'Acme Widgets Payroll',
          category: income.id, cleared: true,
        });
        count++;
      }
    }
    batches[accounts['Everyday Checking']].push({
      date: `${month}-02`.slice(0, 8) + pad(Math.min(2, lastDay)), amount: -25000,
      payee: savingsTransfer.id, cleared: true,
    });
    const a = -cents(20, 90), b = -cents(5, 40);
    batches[accounts['Rewards Credit Card']].push({
      date: day(), amount: a + b, payee_name: 'Fresh Fields Market', notes: 'split shop',
      subtransactions: [
        { amount: a, category: cats.find(c => c.name === 'Groceries').id },
        { amount: b, category: cats.find(c => c.name === 'Household').id },
      ],
    });
    count += 2;

    for (let t = 0; t < txPerMonth; t++) {
      const cat = pick(cats);
      const big = cat.name === 'Rent';
      const uncategorized = rand() < 0.01;
      batches[pick(spendAccounts)].push({
        date: day(),
        amount: big ? -cents(300, 500) : rand() < 0.03 ? cents(5, 60) : -cents(2, 140),
        payee_name: pick(PAYEES),
        category: uncategorized ? undefined : cat.id,
        notes: rand() < 0.15 ? pick(['weekly shop', 'refund pending', 'shared with flatmate', '#trip']) : undefined,
        cleared: rand() < 0.9,
      });
      count++;
    }
  }
  for (const [accountId, txns] of Object.entries(batches)) {
    if (txns.length) await api.addTransactions(accountId, txns, { runTransfers: true, learnCategories: false });
  }

  // Budget every month; leave a few categories deliberately under/over-budgeted.
  for (let i = -(months - 1); i <= 0; i++) {
    const month = monthAdd(now, i);
    for (const cat of cats) {
      if (rand() < 0.08) continue;
      await api.setBudgetAmount(month, cat.id, cat.name === 'Rent' ? cents(1200, 1700) : cents(40, 420));
    }
  }
  for (const name of ['Emergency Fund', 'Dining Out']) {
    await api.setBudgetCarryover(monthAdd(now, -(months - 1)), cats.find(c => c.name === name).id, true);
  }
  return count;
}

async function main() {
  const needs = await (await fetch(`${SERVER_URL}/account/needs-bootstrap`)).json();
  if (!needs.data.bootstrapped) {
    const res = await fetch(`${SERVER_URL}/account/bootstrap`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: PASSWORD }),
    });
    if (!res.ok) throw new Error(`bootstrap failed: ${res.status}`);
    console.log('server bootstrapped');
  }

  await api.init({ dataDir: clientDataDir('seed-client'), serverURL: SERVER_URL, password: PASSWORD });
  const existing = new Set((await api.getBudgets()).map(b => b.name));
  for (const spec of [
    { name: 'Spike Small', seed: 1, months: 4, txPerMonth: 60 },
    { name: 'Spike Large', seed: 2, months: 36, txPerMonth: 340 },
  ]) {
    if (existing.has(spec.name)) {
      console.log(`${spec.name}: already on server, skipping`);
      continue;
    }
    const t0 = Date.now();
    let count;
    await api.runImport(spec.name, async () => {
      count = await build(spec);
    });
    console.log(`${spec.name}: ${count} transactions generated and uploaded in ${Date.now() - t0} ms`);
  }
  await api.shutdown();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
