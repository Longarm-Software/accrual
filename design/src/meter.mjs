// Direction C · Meter. Every category row is its own gauge: the card fills with what is
// left and drains as you spend. Monochrome, with one signal colour, like a good instrument.
import { groceries, groups, summary, today } from './data.mjs';
import { dollars, icon, money, phone } from './lib.mjs';

export const meta = {
  id: 'meter',
  title: 'C · Meter',
  blurb:
    'An instrument, not a spreadsheet. Each row is a fuel gauge: the card itself fills with what is left and drains as you spend, so the whole screen reads at a glance with no separate bars. Black, white and one lime; vermilion appears only when something is wrong.',
  fonts: 'family=Schibsted+Grotesk:wght@400;500;600;700;800&family=Geist+Mono:wght@400;500;600',
};

// What is left as a share of what was put in (or of the target, for goals).
const left = c =>
  c.status === 'goal' || c.status === 'needs'
    ? Math.min(100, (c.balance / c.target) * 100)
    : Math.max(0, Math.min(100, c.budgeted ? (c.balance / c.budgeted) * 100 : 0));

export const css = `
#meter .phone{font-family:'Schibsted Grotesk',system-ui,sans-serif;-webkit-font-smoothing:antialiased;background:var(--bg);color:var(--ink)}
#meter .light{--bg:#F3F3EF;--card:#FFFFFF;--ink:#0C0C0D;--mute:#7C7C78;--line:#E2E2DC;--lime:#D9F24A;--fill:#E3F57A;--hero:#0C0C0D;--onhero:#F3F3EF;--heroacc:#D9F24A;--bad:#F0461C;--badfill:#FFD9CC;--hatch:rgba(12,12,13,.16)}
#meter .dark{--bg:#0A0A0B;--card:#18181A;--ink:#F2F2EE;--mute:#8A8A85;--line:#2A2A2D;--lime:#D9F24A;--fill:#3C4710;--hero:#D9F24A;--onhero:#0C0C0D;--heroacc:#0C0C0D;--bad:#FF6A45;--badfill:#4A1D10;--hatch:rgba(242,242,238,.2)}
#meter .mono{font-family:'Geist Mono',ui-monospace,monospace;font-weight:500;letter-spacing:-.04em}
#meter .cents{font-size:.62em;opacity:.55}
#meter .tag{font:500 10.5px/1 'Geist Mono',monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--mute)}

#meter .top{display:flex;align-items:center;justify-content:space-between;padding:8px 18px 0 22px;height:44px}
#meter .top b{font-size:22px;font-weight:800;letter-spacing:-.03em}
#meter .top b span{color:var(--mute);font-weight:600}
#meter .sync{display:flex;align-items:center;gap:6px}
#meter .sync i{width:6px;height:6px;border-radius:50%;background:#3DBE6B}

#meter .hero{margin:12px 14px 0;border-radius:26px;background:var(--hero);color:var(--onhero);padding:20px 20px 18px;position:relative}
#meter .hero .tag{color:var(--onhero);opacity:.6}
#meter .hero .amount{font-size:60px;line-height:1;font-weight:800;letter-spacing:-.05em;margin:10px 0 18px;color:var(--heroacc)}
#meter .hero .amount .cents{font-weight:700;opacity:.7}
#meter .ticks{display:flex;gap:3px}
#meter .ticks i{flex:1;height:18px;border-radius:2px;background:var(--onhero);opacity:.2}
#meter .ticks i.p{opacity:.75}#meter .ticks i.t{opacity:1;background:var(--heroacc);height:26px;margin-top:-8px}
#meter .hero .foot{display:flex;justify-content:space-between;margin-top:10px;font:500 11.5px/1 'Geist Mono',monospace;opacity:.7}
#meter .assign{position:absolute;right:16px;top:16px;height:38px;padding:0 15px;border-radius:12px;background:var(--heroacc);color:var(--hero);display:flex;align-items:center;gap:4px;font-size:14px;font-weight:700}

#meter .gh{display:flex;justify-content:space-between;align-items:center;padding:16px 24px 8px}
#meter .gh b{font-size:13.5px;font-weight:700;display:flex;align-items:center;gap:4px}
#meter .rows{display:flex;flex-direction:column;gap:6px;padding:0 14px}
#meter .mrow{height:58px;border-radius:15px;background:var(--card);position:relative;overflow:hidden}
#meter .mrow .lvl{position:absolute;left:0;top:0;bottom:0;background:var(--fill)}
#meter .mrow .gap{position:absolute;top:0;bottom:0;background:repeating-linear-gradient(-45deg,var(--hatch) 0 2px,transparent 2px 7px)}
#meter .mrow .c{position:absolute;inset:0;display:flex;align-items:center;padding:0 16px 0 15px;gap:11px}
#meter .mrow .name{font-size:15.5px;font-weight:700;letter-spacing:-.015em}
#meter .mrow .note{font-size:12px;color:var(--ink);opacity:.58;margin-top:3px;font-weight:500}
#meter .mrow .amt{margin-left:auto;font-size:18px}
#meter .mrow.over{background:var(--badfill)}#meter .mrow.over .amt,#meter .mrow.over .note{color:var(--bad);opacity:1}
#meter .mrow.over .lvl{display:none}
#meter .mrow.spent .amt{color:var(--mute)}#meter .mrow.spent .name{opacity:.6}
#meter .mrow.needs .note{color:var(--bad);opacity:1}
#meter .cover{margin-left:auto;height:34px;padding:0 13px;border-radius:10px;background:var(--bad);color:#fff;display:flex;align-items:center;font-size:13px;font-weight:700}
#meter .mrow.over .amt{margin-left:10px}

#meter .tabs{position:absolute;left:0;right:0;bottom:0;height:92px;padding:10px 40px 0;display:flex;justify-content:space-between;align-items:flex-start;background:var(--bg);box-shadow:0 -1px 0 var(--line);z-index:10}
#meter .tab{display:flex;flex-direction:column;align-items:center;gap:5px;font:500 10.5px/1 'Geist Mono',monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--mute);width:70px;padding-top:6px}
#meter .tab.on{color:var(--ink)}
#meter .fab{width:62px;height:46px;border-radius:15px;background:var(--ink);color:var(--bg);display:grid;place-items:center;margin-top:2px}

#meter .bartop{display:flex;align-items:center;justify-content:space-between;padding:8px 14px 0;height:44px}
#meter .bartop .t{font-size:16px;font-weight:700}
#meter .sq{width:38px;height:38px;border-radius:12px;background:var(--card);display:grid;place-items:center}
#meter .dhero{padding:20px 22px 0}
#meter .dhero .amount{font-size:66px;line-height:1;font-weight:800;letter-spacing:-.05em;margin-top:10px}
#meter .dhero .amount .cents{font-weight:700}
#meter .gauge{margin:18px 14px 0;height:64px;border-radius:17px;background:var(--card);position:relative;overflow:hidden}
#meter .gauge .lvl{position:absolute;left:0;top:0;bottom:0;background:var(--fill)}
#meter .gauge .used{position:absolute;right:0;top:0;bottom:0;background:repeating-linear-gradient(-45deg,var(--hatch) 0 2px,transparent 2px 7px)}
#meter .gauge .pace{position:absolute;top:0;bottom:0;width:2px;background:var(--ink)}
#meter .gauge .pace:after{content:'';position:absolute;left:-4px;top:-1px;border:5px solid transparent;border-top-color:var(--ink)}
#meter .gauge .lab{position:absolute;inset:0;display:flex;align-items:center;justify-content:space-between;padding:0 16px;font:500 12px/1 'Geist Mono',monospace}
#meter .gkey{display:flex;justify-content:space-between;padding:9px 22px 0}
#meter .verdict{margin:14px 22px 0;font-size:17px;line-height:1.35;font-weight:600;letter-spacing:-.015em}
#meter .verdict span{color:var(--mute)}
#meter .cal{margin:16px 14px 0;border-radius:17px;background:var(--card);padding:14px 16px 14px}
#meter .cal .k{display:flex;justify-content:space-between;align-items:center;margin-bottom:11px}
#meter .heat{display:grid;grid-template-columns:repeat(15,1fr);gap:4px}
#meter .heat i{aspect-ratio:1;border-radius:4px;background:var(--line)}
#meter .heat i.f{background:transparent;box-shadow:inset 0 0 0 1px var(--line)}
#meter .heat i.t{box-shadow:0 0 0 2px var(--card),0 0 0 3.5px var(--ink)}
#meter .cta{display:flex;gap:8px;padding:12px 14px 0}
#meter .btn{flex:1;height:52px;border-radius:15px;display:flex;align-items:center;justify-content:center;gap:8px;font-size:15px;font-weight:700;background:var(--ink);color:var(--bg)}
#meter .btn.o{background:var(--card);color:var(--ink)}
#meter .tx{margin:12px 14px 0;border-radius:17px;background:var(--card);padding:2px 16px}
#meter .tx div{display:flex;align-items:center;height:48px;font-size:14.5px;font-weight:600}
#meter .tx div+div{box-shadow:inset 0 1px 0 var(--line)}
#meter .tx .d{font:500 11.5px/1 'Geist Mono',monospace;color:var(--mute);width:62px}
#meter .tx .a{margin-left:auto;font-size:15px}

#meter .ahero{margin:10px 14px 0;border-radius:26px;background:var(--hero);color:var(--onhero);padding:16px 20px 22px}
#meter .ahero .bar{display:flex;justify-content:space-between;font-size:15px;font-weight:600}
#meter .ahero .bar span:first-child,#meter .ahero .bar span:last-child{opacity:.6}
#meter .ahero .amount{font-size:84px;line-height:1;font-weight:800;letter-spacing:-.055em;margin:26px 0 6px;color:var(--heroacc);display:flex;align-items:baseline}
#meter .ahero .amount .cents{font-weight:700;opacity:.7}
#meter .ahero .amount u{display:inline-block;width:4px;height:62px;background:var(--heroacc);margin-left:6px;align-self:center;text-decoration:none}
#meter .ahero .who{display:flex;gap:6px;margin-top:14px}
#meter .ahero .who span{height:34px;padding:0 12px;border-radius:10px;display:flex;align-items:center;font-size:13.5px;font-weight:600;box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--onhero) 28%,transparent);white-space:nowrap}
#meter .ahero .who span.on{background:var(--onhero);color:var(--hero);box-shadow:none}
#meter .dent .now{position:absolute;top:0;bottom:0;background:var(--bad);opacity:.85}
#meter .two{display:flex;gap:6px;padding:6px 14px 0}
#meter .two>div{flex:1;height:50px;border-radius:15px;background:var(--card);display:flex;align-items:center;gap:9px;padding:0 15px;font-size:14.5px;font-weight:700}
#meter .two .icon{color:var(--mute)}
#meter .keys{position:absolute;left:0;right:0;bottom:0;padding:0 14px 30px;display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
#meter .keys b{height:56px;border-radius:15px;background:var(--card);display:grid;place-items:center;font-size:25px;font-weight:700}
#meter .keys b.fn{color:var(--mute)}
#meter .keys b.save{grid-row:span 2;height:auto;background:var(--lime);color:#0C0C0D;font-size:16px;font-weight:800}
`;

const row = c => {
  const l = left(c);
  const gap = c.status === 'needs' ? `<div class="gap" style="left:${l}%;right:0"></div>` : '';
  const right =
    c.status === 'over'
      ? `<div class="cover">Cover</div><div class="amt mono">${money(c.balance)}</div>`
      : `<div class="amt mono">${money(c.balance)}</div>`;
  return `<div class="mrow ${c.status}"><div class="lvl" style="width:${l}%"></div>${gap}
    <div class="c"><div><div class="name">${c.name}</div><div class="note">${c.note}</div></div>${right}</div></div>`;
};

const ticks = Array.from({ length: today.daysInMonth }, (_, i) =>
  `<i class="${i + 1 < today.dayOfMonth ? 'p' : i + 1 === today.dayOfMonth ? 't' : ''}"></i>`).join('');

const plan = `
<div class="top"><b>November <span>’26</span></b><div class="sync tag"><i></i>Synced 9:40</div></div>
<div class="hero">
  <div class="tag">To budget</div>
  <div class="amount">${money(summary.toBudget)}</div>
  <div class="ticks">${ticks}</div>
  <div class="foot"><span>DAY 18 OF 30</span><span>${dollars(summary.spent)} SPENT OF ${dollars(summary.budgeted)}</span></div>
  <div class="assign">Assign${icon('chevR', 15, 2.6)}</div>
</div>
${groups
  .map(
    g => `<div class="gh"><b>${g.name}${icon('chevD', 15, 2.4)}</b><span class="tag">${dollars(g.categories.reduce((n, c) => n + Math.max(0, c.balance), 0))} left</span></div>
<div class="rows">${g.categories.map(row).join('')}</div>`,
  )
  .join('')}
<div class="tabs">
  <div class="tab on">${icon('plan', 23, 2)}Plan</div>
  <div class="fab">${icon('plus', 26, 2.6)}</div>
  <div class="tab">${icon('wallet', 23, 2)}Accounts</div>
</div>`;

const maxDay = Math.max(...groceries.daily);
const heat = Array.from({ length: today.daysInMonth }, (_, i) => {
  const v = groceries.daily[i];
  if (v === undefined) return '<i class="f"></i>';
  const t = i + 1 === today.dayOfMonth ? ' class="t"' : '';
  return v ? `<i${t} style="background:color-mix(in srgb,var(--ink) ${Math.round(18 + (v / maxDay) * 82)}%,var(--line))"></i>` : `<i${t}></i>`;
}).join('');
const usedPct = (groceries.spent / groceries.budgeted) * 100;

const detail = `
<div class="bartop"><div class="sq">${icon('chevL', 20, 2.2)}</div><span class="t">Groceries</span><div class="sq">${icon('dots', 20, 2.2)}</div></div>
<div class="dhero"><div class="tag">Left this month</div><div class="amount">${money(groceries.balance)}</div></div>
<div class="gauge">
  <div class="used" style="width:${usedPct}%"></div><div class="lvl" style="width:${100 - usedPct}%"></div>
  <div class="pace" style="left:${(1 - today.dayOfMonth / today.daysInMonth) * 100}%"></div>
  <div class="lab"><span>LEFT $207</span><span>SPENT $512</span></div>
</div>
<div class="gkey"><span class="tag">Empty</span><span class="tag">▲ Even pace would leave $288</span><span class="tag">$720</span></div>
<div class="verdict">$17.30 a day for 12 days. <span>You have spent a bit more than an even pace, so ease off slightly.</span></div>
<div class="cal"><div class="k"><span class="tag">Spending by day</span><span class="tag">11 shops · avg $46</span></div><div class="heat">${heat}</div></div>
<div class="cta"><div class="btn">${icon('swap', 19, 2.4)}Move money</div><div class="btn o">Change budget</div></div>
<div class="tx">${groceries.activity
  .map((a, i) => `<div><span class="d">${['18 NOV', '17 NOV', '15 NOV', '14 NOV'][i]}</span>${a.payee}<span class="a mono">${money(a.amount)}</span></div>`)
  .join('')}</div>`;

const dentPct = (1840 / groceries.budgeted) * 100;
const add = `
<div class="ahero">
  <div class="bar"><span>Cancel</span><span>New transaction</span><span>Today</span></div>
  <div class="amount">${money(-1840)}<u></u></div>
  <div class="who"><span class="on">Corner Bakery</span><span>Fresh &amp; Co</span><span>Green Grocer</span></div>
</div>
<div class="gh"><b>Category</b><span class="tag">Suggested · change</span></div>
<div class="rows"><div class="mrow dent">
  <div class="lvl" style="width:${100 - usedPct - dentPct}%"></div>
  <div class="now" style="left:${100 - usedPct - dentPct}%;width:${dentPct}%"></div>
  <div class="c"><div><div class="name">Groceries</div><div class="note">was $207.62</div></div><div class="amt mono">${money(18922)}</div></div>
</div></div>
<div class="two"><div>${icon('wallet', 18, 2)}Everyday Checking</div><div style="flex:.5">${icon('cal', 18, 2)}Today</div></div>
<div class="keys">
  <b>1</b><b>2</b><b>3</b><b class="fn">${icon('del', 24, 2)}</b>
  <b>4</b><b>5</b><b>6</b><b class="fn">+/−</b>
  <b>7</b><b>8</b><b>9</b><b class="save">Save</b>
  <b>.</b><b>0</b><b>00</b>
</div>`;

export const shots = [
  phone('light', 'Plan', plan),
  phone('light', 'Category', detail),
  phone('light', 'Quick add', add),
  phone('dark', 'Plan · dark', plan),
];
