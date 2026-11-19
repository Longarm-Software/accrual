// One made-up household, used by every direction so they can be compared like for like.
// Nothing here comes from a real budget. Amounts are in cents, as in Actual.
export const today = { label: 'Wed 18 Nov', month: 'November', year: 2026, daysLeft: 12, dayOfMonth: 18, daysInMonth: 30 };

export const summary = { toBudget: 31200, budgeted: 588000, spent: 341617, income: 619200 };

// status: 'ok' | 'spent' (fully spent, as planned) | 'needs' (target not yet funded) | 'over' | 'goal'
export const groups = [
  {
    name: 'Bills',
    categories: [
      { name: 'Rent', icon: 'home', budgeted: 185000, spent: 185000, balance: 0, status: 'spent', note: 'Fully spent' },
      { name: 'Electricity', icon: 'bolt', budgeted: 12000, spent: 0, balance: 12000, status: 'ok', note: 'Funded · due 24 Nov' },
      { name: 'Internet', icon: 'wifi', budgeted: 7500, spent: 7500, balance: 0, status: 'spent', note: 'Fully spent' },
      { name: 'Insurance', icon: 'shield', budgeted: 10000, spent: 0, balance: 10000, target: 14000, status: 'needs', note: '$40 needed by 5 Dec' },
    ],
  },
  {
    name: 'Everyday',
    categories: [
      { name: 'Groceries', icon: 'basket', budgeted: 72000, spent: 51238, balance: 20762, status: 'ok', note: '$17 a day for 12 days' },
      { name: 'Dining out', icon: 'fork', budgeted: 22000, spent: 24810, balance: -2810, status: 'over', note: 'Overspent' },
      { name: 'Transport', icon: 'train', budgeted: 16000, spent: 8400, balance: 7600, status: 'ok', note: 'On track' },
      { name: 'Coffee', icon: 'cup', budgeted: 4500, spent: 3150, balance: 1350, status: 'ok', note: 'On track' },
    ],
  },
  {
    name: 'Goals',
    categories: [
      { name: 'Emergency fund', icon: 'umbrella', budgeted: 40000, spent: 0, balance: 640000, target: 1000000, status: 'goal', note: '64% of $10,000' },
      { name: 'Summer trip', icon: 'plane', budgeted: 20000, spent: 0, balance: 115000, target: 240000, status: 'goal', note: '$1,250 to go by June' },
    ],
  },
];

/** How full a category's bar is, 0–100: spent against budgeted, or saved against a target. */
export const fill = c =>
  c.status === 'goal' || c.status === 'needs'
    ? Math.min(100, (c.balance / c.target) * 100)
    : Math.min(100, c.budgeted ? (c.spent / c.budgeted) * 100 : 0);

export const groceries = {
  ...groups[1].categories[0],
  perDay: 1730,
  // Spending on each day of the month so far (cents); 0 for days with none.
  daily: [0, 6412, 0, 0, 2380, 0, 8915, 0, 1240, 0, 0, 7630, 0, 3105, 9480, 0, 4326, 7750],
  activity: [
    { payee: 'Fresh & Co Market', date: 'Today', amount: -7750, account: 'Everyday Checking' },
    { payee: 'Corner Bakery', date: 'Yesterday', amount: -4326, account: 'Credit Card' },
    { payee: 'Fresh & Co Market', date: 'Sun 15 Nov', amount: -9480, account: 'Everyday Checking' },
    { payee: 'Green Grocer', date: 'Sat 14 Nov', amount: -3105, account: 'Everyday Checking' },
  ],
};

export const quickAdd = {
  amount: 1840,
  payee: 'Corner Bakery',
  category: 'Groceries',
  categoryLeft: 20762,
  account: 'Everyday Checking',
  date: 'Today',
  suggestions: ['Corner Bakery', 'Fresh & Co Market', 'Green Grocer'],
};
