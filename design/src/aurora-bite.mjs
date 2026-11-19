// Round 3, board 1: the bite on every sheet that moves money.
import { planFor } from './aurora.mjs';
import { bite, css as shared, fonts, pad } from './aurora3.mjs';
import { groups } from './data.mjs';
import { icon, money, phone } from './lib.mjs';

export const meta = {
  id: 'aurora',
  title: 'Aurora · the bite',
  blurb:
    'Aurora’s signature. Wherever money is about to move, the pot it leaves shows the bite before you commit, and the pot it joins shows the gain. Hatched means “not yet”. Tap Save and the hatching becomes real.',
  fonts,
};
export const css = shared;

const check = icon('check', 15, 3);
const sheetTop = (title, right = 'Today') =>
  `<div class="grab"></div><div class="sheet-top"><span class="c">Cancel</span><span class="t">${title}</span><span class="c">${right}</span></div>`;
const meta2 = `<div class="meta"><div class="glass">${icon('wallet', 18)}Everyday Checking</div><div class="glass" style="flex:.55">${icon('cal', 18)}Today</div></div>`;

const add = `
${sheetTop('New transaction')}
<div class="entry"><div class="amount disp">${money(-1840)}</div><div class="who glass">${icon('check', 16, 2.4)}Corner Bakery</div></div>
<div class="pot glass ok" style="margin-top:44px">
  <div class="h">${icon('basket', 19, 1.9)}Groceries<span>Suggested${icon('chevR', 14, 2.2)}</span></div>
  ${bite(20762, 1840)}
</div>
${meta2}
${pad()}`;

const addOver = `
${sheetTop('New transaction')}
<div class="entry"><div class="amount disp">${money(-1840)}</div><div class="who glass">${icon('check', 16, 2.4)}Harbour Coffee</div></div>
<div class="pot glass over warn" style="margin-top:30px">
  <div class="h">${icon('cup', 19, 1.9)}Coffee<span>Suggested${icon('chevR', 14, 2.2)}</span></div>
  ${bite(1350, 1840)}
</div>
<div class="fixit glass"><span>That is <b>$4.90</b> more than Coffee has</span><span class="go">Cover it now</span></div>
${meta2}
${pad(icon('check', 28, 2.6), 'warn')}`;

const source = (name, ic, now, state = '') =>
  `<div class="src glass ${state}"><div><div class="n">${icon(ic, 18, 1.9)}${name}</div>${
    now < 2810 ? `<div class="d">${money(now)} · not enough</div>` : bite(now, 2810, { small: true })
  }</div><div class="radio ${state === 'on' ? 'on' : ''}">${state === 'on' ? check : ''}</div></div>`;

const cover = `
<div class="dim">${planFor(groups)}</div>
<div class="sheet">
  <div class="grab"></div>
  <h2 class="disp">Cover Dining out</h2>
  <div class="pot glass over" style="margin:10px 0 16px">
    <div class="h" style="margin-bottom:11px">${icon('fork', 19, 1.9)}Dining out</div>
    ${bite(-2810, -2810)}
  </div>
  <p style="margin-bottom:4px">Take $28.10 from</p>
  ${source('Ready to budget', 'coins', 31200, 'on')}
  ${source('Transport', 'train', 7600)}
  ${source('Coffee', 'cup', 1350, 'off')}
  <div class="btn">Cover $28.10</div>
</div>`;

const move = `
${sheetTop('Move money', '')}
<div class="entry tight"><div class="amount disp">${money(5000)}</div></div>
<div class="pot glass ok" style="margin-top:22px">
  <div class="role">From</div>
  <div class="h">${icon('basket', 19, 1.9)}Groceries<span>Change${icon('chevR', 14, 2.2)}</span></div>
  ${bite(20762, 5000)}
</div>
<div class="swap">${icon('swap', 18, 2.2)}</div>
<div class="pot glass goal">
  <div class="role">To</div>
  <div class="h">${icon('plane', 19, 1.9)}Summer trip<span>Change${icon('chevR', 14, 2.2)}</span></div>
  ${bite(115000, -5000, { full: 240000 })}
</div>
${pad('<span style="font-size:16px">Move</span>')}`;

const give = (name, ic, status, now, amount, full) =>
  `<div class="give ${status}"><div class="av" style="width:36px;height:36px;border-radius:12px;display:grid;place-items:center;background:var(--track)">${icon(ic, 19, 1.9)}</div><div><div class="n">${name}</div>${bite(now, -amount, { full, small: true, label: false })}</div><div class="step set"><i>−</i>$${amount / 100}<i>+</i></div></div>`;

const assign = `
<div class="bartop"><div class="round glass">${icon('close', 19, 2.2)}</div><span class="t">Assign</span><div class="round" style="opacity:0"></div></div>
<div class="big glass"><div class="sub">Ready to budget</div><div class="amount disp">${money(31200)}</div>
  ${bite(31200, 31200)}</div>
<div class="gh2"><span>Needs money first</span></div>
<div class="list glass" style="margin-top:0">${give('Insurance', 'shield', 'needs', 10000, 4000, 14000)}</div>
<div class="gh2"><span>Your goals</span><span>Suggested split</span></div>
<div class="list glass" style="margin-top:0">
  ${give('Emergency fund', 'umbrella', 'goal', 640000, 20000, 1000000)}
  ${give('Summer trip', 'plane', 'goal', 115000, 7200, 240000)}
</div>
<div class="bottom"><div class="done"><span>Every dollar has a job</span><b>$0.00 left</b></div><div class="btn">Assign $312.00</div></div>`;

export const shots = [
  phone('dark', 'Quick add', add),
  phone('dark', 'Quick add · more than the category has', addOver),
  phone('dark', 'Cover overspending', cover),
  phone('dark', 'Move money', move),
  phone('dark', 'Assign', assign),
];
