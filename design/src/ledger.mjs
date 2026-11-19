// Direction A · Ledger. Paper, ink and a serif for the figures. No cards: rows on a page,
// separated by hairlines that double as the progress bars.
import { fill, groceries, groups, quickAdd, summary, today } from './data.mjs';
import { dollars, icon, money, phone } from './lib.mjs';

export const meta = {
  id: 'ledger',
  title: 'A · Ledger',
  blurb:
    'A private-bank statement you can act on. Warm paper, deep ink, serif figures, one evergreen accent. No cards and no chrome: each category is a line on a page, and the rule under it is its progress bar. Quiet until something needs you.',
  fonts: 'family=Instrument+Serif:ital@0;1',
};

export const css = `
#ledger .phone{font-family:'Geist',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
#ledger .light{--bg:#F6F2EA;--ink:#1C1A17;--mute:#8A8377;--rule:#E3DCCF;--accent:#1F5D4C;--accent-soft:#DDE9E2;--over:#B4472E;--over-soft:#F3DDD5;--need:#9A6A12;--need-soft:#F1E4C8;--zero-soft:#EAE4D8;--raise:#FFFDF8;--key:#EFE9DD}
#ledger .dark{--bg:#151410;--ink:#EFE9DC;--mute:#8C867A;--rule:#2B2922;--accent:#86D1AE;--accent-soft:#1E3A30;--over:#F08A6E;--over-soft:#43231A;--need:#E3B863;--need-soft:#3B2F16;--zero-soft:#26241E;--raise:#1E1C17;--key:#211F19}
#ledger .phone{background:var(--bg);color:var(--ink)}
#ledger .serif{font-family:'Instrument Serif',Georgia,serif;font-weight:400;letter-spacing:-.01em}
#ledger .cents{font-size:.56em;opacity:.62;margin-left:.02em}
#ledger .caps{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--mute);font-weight:600}
#ledger .pad{padding:0 26px}

#ledger .top{display:flex;align-items:center;justify-content:space-between;padding:10px 20px 0 26px}
#ledger .month{display:flex;align-items:baseline;gap:8px}
#ledger .month b{font:400 34px/1 'Instrument Serif',serif}
#ledger .month span{font-size:14px;color:var(--mute)}
#ledger .top .nav{display:flex;gap:2px;color:var(--mute)}
#ledger .top .nav i{width:36px;height:36px;display:grid;place-items:center}

#ledger .hero{padding:24px 26px 20px}
#ledger .hero .amount{font-size:74px;line-height:.95;margin:8px 0 14px;letter-spacing:-.025em}
#ledger .hero .line{display:flex;gap:18px;font-size:13px;color:var(--mute)}
#ledger .hero .line b{color:var(--ink);font-weight:500}
#ledger .assign{position:absolute;right:26px;top:150px;font-size:14px;font-weight:600;color:var(--accent);display:flex;align-items:center;gap:2px}

#ledger .notice{margin:0 26px;padding:13px 0;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule);display:flex;align-items:center;gap:10px;font-size:14.5px}
#ledger .notice .dot{width:8px;height:8px;border-radius:50%;background:var(--over)}
#ledger .notice b{font-weight:600}
#ledger .notice .act{margin-left:auto;color:var(--over);font-weight:600;display:flex;align-items:center}

#ledger .group{display:flex;justify-content:space-between;align-items:baseline;padding:22px 26px 6px}
#ledger .group .sum{font-size:13px;color:var(--mute);font-variant-numeric:tabular-nums}
#ledger .cat{padding:13px 26px 0;position:relative}
#ledger .cat .r{display:flex;align-items:center;gap:12px;padding-bottom:13px}
#ledger .cat .name{font-size:16.5px;font-weight:500;letter-spacing:-.01em}
#ledger .cat .note{font-size:13px;color:var(--mute);margin-top:3px}
#ledger .cat .note.over{color:var(--over)}#ledger .cat .note.needs{color:var(--need)}
#ledger .pill{margin-left:auto;padding:5px 12px 6px;border-radius:99px;font:400 21px/1.1 'Instrument Serif',serif;background:var(--accent-soft);color:var(--accent)}
#ledger .pill.spent{background:var(--zero-soft);color:var(--mute)}
#ledger .pill.over{background:var(--over-soft);color:var(--over)}
#ledger .pill.needs{background:var(--need-soft);color:var(--need)}
#ledger .bar{height:2px;background:var(--rule);position:relative}
#ledger .bar i{position:absolute;left:0;top:0;bottom:0;background:var(--ink);opacity:.82}
#ledger .bar.over i{background:var(--over);opacity:1}#ledger .bar.needs i{background:var(--need);opacity:1}
#ledger .bar.goal i{background:var(--accent);opacity:1}#ledger .bar.spent i{opacity:.28}

#ledger .tabs{position:absolute;left:0;right:0;bottom:0;height:124px;padding:40px 34px 0;display:flex;justify-content:space-between;align-items:flex-start;background:linear-gradient(to top,var(--bg) 72%,transparent);z-index:10}
#ledger .tab{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:11px;font-weight:500;color:var(--mute);width:64px;padding-top:8px}
#ledger .tab.on{color:var(--ink)}
#ledger .fab{width:58px;height:58px;border-radius:50%;background:var(--ink);color:var(--bg);display:grid;place-items:center;box-shadow:0 10px 24px -8px rgba(0,0,0,.45)}

#ledger .bartop{display:flex;align-items:center;justify-content:space-between;padding:8px 18px 0;height:48px;color:var(--ink)}
#ledger .bartop .t{font-size:16px;font-weight:600}
#ledger .bartop i{width:36px;height:36px;display:grid;place-items:center}
#ledger .dhero{padding:22px 26px 6px}
#ledger .dhero .amount{font-size:84px;line-height:.95;letter-spacing:-.03em;margin:8px 0 12px;color:var(--accent)}
#ledger .dhero p{font-size:15px;color:var(--mute)}#ledger .dhero p b{color:var(--ink);font-weight:500}
#ledger .chart{margin:20px 26px 0}
#ledger .chart .legend{display:flex;justify-content:space-between;font-size:12px;color:var(--mute);margin-top:8px}
#ledger .stats{display:flex;margin:22px 26px 0;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}
#ledger .stats>div{flex:1;padding:13px 0}
#ledger .stats>div+div{border-left:1px solid var(--rule);padding-left:14px}
#ledger .stats .v{font:400 23px/1.1 'Instrument Serif',serif;margin-top:5px}
#ledger .actions{display:flex;gap:10px;padding:18px 26px 0}
#ledger .btn{flex:1;height:50px;border-radius:14px;display:flex;align-items:center;justify-content:center;gap:8px;font-size:15.5px;font-weight:600;background:var(--ink);color:var(--bg)}
#ledger .btn.ghost{background:transparent;color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--rule)}
#ledger .act-row{display:flex;align-items:center;padding:13px 0;border-bottom:1px solid var(--rule);margin:0 26px}
#ledger .act-row .p{font-size:15.5px;font-weight:500}
#ledger .act-row .d{font-size:12.5px;color:var(--mute);margin-top:3px}
#ledger .act-row .a{margin-left:auto;font:400 20px/1 'Instrument Serif',serif}

#ledger .sheet-top{display:flex;justify-content:space-between;align-items:center;padding:14px 26px 0;font-size:15.5px}
#ledger .sheet-top .c{color:var(--mute)}#ledger .sheet-top .t{font-weight:600}#ledger .sheet-top .s{color:var(--accent);font-weight:600}
#ledger .entry{text-align:center;padding:34px 0 6px}
#ledger .entry .amount{font-size:92px;line-height:1;letter-spacing:-.03em}
#ledger .entry .caret{display:inline-block;width:2px;height:66px;background:var(--accent);margin-left:4px;vertical-align:-6px}
#ledger .effect{margin:10px auto 0;font-size:13.5px;color:var(--mute);text-align:center}
#ledger .effect b{color:var(--accent);font-weight:600}
#ledger .fields{margin:24px 26px 0;border-top:1px solid var(--rule)}
#ledger .field{display:flex;align-items:center;gap:12px;padding:13px 0;border-bottom:1px solid var(--rule);font-size:15.5px}
#ledger .field .k{color:var(--mute);width:78px;font-size:13.5px}
#ledger .field .v{font-weight:500}
#ledger .field .x{margin-left:auto;color:var(--mute);font-size:13px;display:flex;align-items:center;gap:2px}
#ledger .sugg{display:flex;gap:8px;padding:14px 26px 0;overflow:hidden}
#ledger .sugg span{padding:8px 13px;border-radius:99px;font-size:13.5px;font-weight:500;box-shadow:inset 0 0 0 1.5px var(--rule);white-space:nowrap}
#ledger .sugg span.on{background:var(--ink);color:var(--bg);box-shadow:none}
#ledger .keys{position:absolute;left:0;right:0;bottom:0;padding:10px 14px 34px;display:grid;grid-template-columns:repeat(3,1fr);gap:7px;background:var(--key)}
#ledger .keys b{height:52px;border-radius:12px;background:var(--raise);display:grid;place-items:center;font:400 28px/1 'Instrument Serif',serif}
#ledger .keys b.fn{background:transparent;color:var(--mute)}
`;

const tabs = `<div class="tabs">
  <div class="tab on">${icon('plan', 24)}Plan</div>
  <div class="fab">${icon('plus', 26, 2)}</div>
  <div class="tab">${icon('wallet', 24)}Accounts</div>
</div>`;

const category = c => `<div class="cat">
  <div class="r">
    <div><div class="name">${c.name}</div><div class="note ${c.status}">${c.note}</div></div>
    <div class="pill ${c.status}">${money(c.balance)}</div>
  </div>
  <div class="bar ${c.status}"><i style="width:${fill(c)}%"></i></div>
</div>`;

const plan = `
<div class="top">
  <div class="month"><b>${today.month}</b><span>${today.year}</span></div>
  <div class="nav"><i>${icon('chevL')}</i><i>${icon('chevR')}</i></div>
</div>
<div class="hero">
  <div class="caps">To budget</div>
  <div class="amount serif">${money(summary.toBudget)}</div>
  <div class="line"><span>Income <b>${dollars(summary.income)}</b></span><span>Budgeted <b>${dollars(summary.budgeted)}</b></span><span>Spent <b>${dollars(summary.spent)}</b></span></div>
</div>
<div class="assign">Assign${icon('chevR', 16, 2)}</div>
<div class="notice"><span class="dot"></span><span><b>Dining out</b> is $28.10 over</span><span class="act">Cover${icon('chevR', 16, 2)}</span></div>
${groups
  .map(
    g => `<div class="group"><span class="caps">${g.name}</span><span class="sum">${dollars(g.categories.reduce((n, c) => n + Math.max(0, c.balance), 0))} available</span></div>
${g.categories.map(category).join('')}`,
  )
  .join('')}
${tabs}`;

// Cumulative spending against an even pace, drawn in a 338 × 120 box.
function paceChart() {
  const W = 338, H = 120, days = today.daysInMonth, budget = groceries.budgeted;
  const x = d => (d / days) * W, y = v => H - (v / budget) * H;
  let run = 0;
  const pts = [`0,${H}`, ...groceries.daily.map((v, i) => `${x(i + 1).toFixed(1)},${y((run += v)).toFixed(1)}`)];
  const [lx, ly] = pts.at(-1).split(',');
  return `<svg width="${W}" height="${H + 8}" viewBox="0 -4 ${W} ${H + 8}" fill="none">
    <line x1="0" y1="${H}" x2="${W}" y2="0" stroke="var(--mute)" stroke-width="1.2" stroke-dasharray="2 5" stroke-linecap="round"/>
    <line x1="0" y1="${H}" x2="${W}" y2="${H}" stroke="var(--rule)"/>
    <polygon points="${pts.join(' ')} ${lx},${H}" fill="var(--accent)" opacity=".1"/>
    <polyline points="${pts.join(' ')}" stroke="var(--accent)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
    <line x1="${lx}" y1="${ly}" x2="${lx}" y2="${H}" stroke="var(--accent)" stroke-width="1" opacity=".4"/>
    <circle cx="${lx}" cy="${ly}" r="5" fill="var(--bg)" stroke="var(--accent)" stroke-width="2.2"/>
  </svg>`;
}

const detail = `
<div class="bartop"><i>${icon('chevL', 22)}</i><span class="t">Groceries</span><i>${icon('dots', 22)}</i></div>
<div class="dhero">
  <div class="caps">Available</div>
  <div class="amount serif">${money(groceries.balance)}</div>
  <p><b>$17.30 a day</b> for the 12 days left. A little ahead of an even pace.</p>
</div>
<div class="chart">${paceChart()}<div class="legend"><span>1 Nov</span><span>Today · $512 of $720</span><span>30 Nov</span></div></div>
<div class="stats">
  <div><div class="caps">Budgeted</div><div class="v">${money(groceries.budgeted)}</div></div>
  <div><div class="caps">Spent</div><div class="v">${money(groceries.spent)}</div></div>
  <div><div class="caps">Last month</div><div class="v">${money(68410)}</div></div>
</div>
<div class="actions"><div class="btn">${icon('swap', 19, 2)}Move money</div><div class="btn ghost">Change budget</div></div>
<div class="group" style="padding-bottom:0"><span class="caps">Activity</span><span class="sum">See all</span></div>
${groceries.activity
  .map(a => `<div class="act-row"><div><div class="p">${a.payee}</div><div class="d">${a.date} · ${a.account}</div></div><div class="a">${money(a.amount)}</div></div>`)
  .join('')}`;

const add = `
<div class="sheet-top"><span class="c">Cancel</span><span class="t">New transaction</span><span class="s">Save</span></div>
<div class="entry"><span class="amount serif">${money(-quickAdd.amount)}</span><span class="caret"></span></div>
<div class="effect">Leaves <b>$189.22</b> in Groceries</div>
<div class="sugg"><span class="on">Corner Bakery</span><span>Fresh &amp; Co Market</span><span>Green Grocer</span></div>
<div class="fields">
  <div class="field"><span class="k">Category</span><span class="v">Groceries</span><span class="x">suggested${icon('chevR', 15, 2)}</span></div>
  <div class="field"><span class="k">Account</span><span class="v">Everyday Checking</span><span class="x">${icon('chevR', 15, 2)}</span></div>
  <div class="field"><span class="k">Date</span><span class="v">Today</span><span class="x">${icon('chevR', 15, 2)}</span></div>
</div>
<div class="keys">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'].map(k => `<b>${k}</b>`).join('')}<b class="fn">${icon('del', 26)}</b></div>`;

export const shots = [
  phone('light', 'Plan', plan),
  phone('light', 'Category', detail),
  phone('light', 'Quick add', add),
  phone('dark', 'Plan · dark', plan),
];
