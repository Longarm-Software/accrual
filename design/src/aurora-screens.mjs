// Round 2, board 1: the rest of the Phase 1 screens in Aurora.
import { dock, planFor } from './aurora.mjs';
import { css as shared, fonts } from './aurora2.mjs';
import { groups } from './data.mjs';
import { icon, money, phone } from './lib.mjs';

export const meta = {
  id: 'aurora',
  title: 'Aurora · the rest of Phase 1',
  blurb:
    'Getting connected, accounts, an account’s transactions, covering overspending and assigning money. Every sheet shows the result before you commit: what a category will have left, and what is still unassigned.',
  fonts,
};
export const css = shared;

const check = icon('check', 15, 3);

const setup = `
<div class="setup">
  <div class="word disp"><i></i>Accrual</div>
  <h1 class="disp">Connect to your Actual server</h1>
  <p>Accrual talks to your server directly. Your budget never passes through us.</p>
</div>
<div class="fld glass" style="margin-top:26px"><label>Server address</label><div>budget.example.com</div><span class="chip ok"><i></i>Actual 26.11</span></div>
<div class="fld glass"><label>Password</label><div>••••••••••••</div></div>
<div class="gh2"><span>Budgets on this server</span></div>
<div class="list glass" style="margin-top:0">
  <div class="opt"><div><div class="n">Household</div><div class="d">Last changed today</div></div><div class="radio on">${check}</div></div>
  <div class="opt"><div><div class="n">Side business</div><div class="d">Last changed 3 Nov</div></div><div class="radio"></div></div>
</div>
<div class="bottom"><div class="btn">Open Household</div><div class="fine">${icon('shield', 15, 2)}Password stays in your phone’s keychain</div></div>`;

const accountRow = (ic, name, sub, amount, cls = '') =>
  `<div class="li"><div class="av">${icon(ic, 19, 1.9)}</div><div><div class="p">${name}</div><div class="d">${sub}</div></div><div class="a disp ${cls}">${money(amount)}</div></div>`;

const accounts = `
<div class="hd"><span class="disp">Accounts</span><div class="round glass">${icon('search', 20)}</div></div>
<div class="big glass"><div class="sub">On budget</div><div class="amount disp">${money(887240)}</div><div class="sub">Synced just now · 4 accounts</div></div>
<div class="gh2"><span>On budget</span><span>${money(887240)}</span></div>
<div class="list glass" style="margin-top:0">
  ${accountRow('wallet', 'Everyday Checking', '<span class="chip needs"><i></i>3 to categorize</span>', 294018)}
  ${accountRow('coins', 'Savings', 'No activity this week', 640000)}
  ${accountRow('card', 'Credit Card', 'Payment due 28 Nov', -52778)}
  ${accountRow('coins', 'Cash', 'Last used 9 Nov', 6000)}
</div>
<div class="gh2"><span>Off budget</span><span>${money(-16419000)}</span></div>
<div class="list glass" style="margin-top:0">
  ${accountRow('chart', 'Retirement', 'Updated 1 Nov', 4821000)}
  ${accountRow('house', 'Mortgage', 'Updated 1 Nov', -21240000)}
</div>
${dock('accounts')}`;

const tx = (payee, cat, amount, status = 'ok') =>
  `<div class="li"><div class="av">${payee[0]}</div><div><div class="p">${payee}</div><div class="d"><span class="chip ${status}"><i></i>${cat}</span></div></div><div class="a disp ${amount > 0 ? 'in' : ''}">${amount > 0 ? '+' : ''}${money(amount)}</div></div>`;

const register = `
<div class="bartop"><div class="round glass">${icon('chevL', 20, 2)}</div><span class="t">Everyday Checking</span><div class="round glass">${icon('search', 20)}</div></div>
<div class="big glass" style="padding-bottom:18px"><div class="sub">Balance</div><div class="amount disp">${money(294018)}</div>
  <div class="split"><span>Cleared <b>$2,812.02</b></span><span>Pending <b>$128.16</b></span></div></div>
<div class="strip"><span><b>3 transactions</b> need a category</span><span class="go">Categorize</span></div>
<div class="gh2"><span>Today</span></div>
<div class="list glass" style="margin-top:0">
  ${tx('Fresh & Co Market', 'Groceries', -7750)}
  ${tx('Harbour Parking', 'Choose category', -1200, 'needs')}
</div>
<div class="gh2"><span>Yesterday</span></div>
<div class="list glass" style="margin-top:0">
  ${tx('Northwind Payroll', 'Income', 309600)}
  ${tx('Metro Transit', 'Transport', -4200)}
  ${tx('Pinecone Books', 'Choose category', -2315, 'needs')}
</div>
<div class="plusfab">${icon('plus', 26, 2.4)}</div>`;

const source = (name, ic, before, after, state = '') =>
  `<div class="src glass ${state}"><div><div class="n">${icon(ic, 18, 1.9)}${name}</div><div class="d">${
    after === null ? `${money(before)} · not enough` : `${money(before)} → <b>${money(after)}</b>`
  }</div></div><div class="radio ${state === 'on' ? 'on' : ''}">${state === 'on' ? check : ''}</div></div>`;

const cover = `
<div class="dim">${planFor(groups)}</div>
<div class="sheet">
  <div class="grab"></div>
  <h2 class="disp">Cover Dining out</h2>
  <p>It is <b>$28.10 over</b>. Choose where the money comes from.</p>
  ${source('Ready to budget', 'coins', 31200, 28390, 'on')}
  ${source('Transport', 'train', 7600, 4790)}
  ${source('Groceries', 'basket', 20762, 17952)}
  ${source('Coffee', 'cup', 1350, null, 'off')}
  <div class="btn">Cover $28.10</div>
</div>`;

const give = (name, ic, note, amount, status, set = true) =>
  `<div class="give ${status}"><div class="av" style="width:36px;height:36px;border-radius:12px;display:grid;place-items:center;background:var(--track)">${icon(ic, 19, 1.9)}</div><div><div class="n">${name}</div><div class="d">${note}</div></div><div class="step ${set ? 'set' : ''}"><i>−</i>${amount}<i>+</i></div></div>`;

const assign = `
<div class="bartop"><div class="round glass">${icon('close', 19, 2.2)}</div><span class="t">Assign</span><div class="round" style="opacity:0"></div></div>
<div class="big glass"><div class="sub">Ready to budget</div><div class="amount disp">${money(31200)}</div>
  <div class="flow"><i class="f" style="width:100%"></i></div>
  <div class="flowkey" style="margin-top:10px"><span>Assigning <b>$312.00</b></span><span>Left after <b>$0.00</b></span></div></div>
<div class="gh2"><span>Needs money first</span></div>
<div class="list glass" style="margin-top:0">
  ${give('Insurance', 'shield', '$40 short · due 5 Dec', '$40', 'needs')}
</div>
<div class="gh2"><span>Your goals</span><span>Suggested split</span></div>
<div class="list glass" style="margin-top:0">
  ${give('Emergency fund', 'umbrella', '64% of $10,000', '$200', 'goal')}
  ${give('Summer trip', 'plane', '$1,250 to go by June', '$72', 'goal')}
  ${give('Groceries', 'basket', '$207.62 left', '$0', 'ok', false)}
</div>
<div class="bottom"><div class="done"><span>Every dollar has a job</span><b>$0.00 left</b></div><div class="btn">Assign $312.00</div></div>`;

export const shots = [
  phone('dark', 'Connect', setup),
  phone('dark', 'Accounts', accounts),
  phone('dark', 'Transactions', register),
  phone('dark', 'Cover overspending', cover),
  phone('dark', 'Assign', assign),
];
