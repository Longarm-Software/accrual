// Direction B · Aurora. Dark first. Categories are tiles of frosted glass over a slow
// gradient, two to a row, so twice as much of a budget fits on one screen.
import { fill, groceries, groups, summary, today } from './data.mjs';
import { dollars, icon, money, phone } from './lib.mjs';

export const meta = {
  id: 'aurora',
  title: 'B · Aurora',
  blurb:
    'Dark first, built on depth. Each category is a glass tile, two to a row, so twice as much of the month fits on a screen. Colour is light, not paint: mint means funded, amber means it needs money, coral means over. It should feel like the platform at its best, on both iOS and Android.',
  fonts: 'family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700',
};

export const css = `
#aurora .phone{font-family:'Geist',system-ui,sans-serif;-webkit-font-smoothing:antialiased;color:var(--ink);background:var(--bg)}
#aurora .dark{--bg:radial-gradient(120% 60% at 0% 0%,#123B3A 0%,transparent 60%),radial-gradient(90% 50% at 100% 18%,#16294D 0%,transparent 62%),radial-gradient(100% 50% at 50% 100%,#0F2B2A 0%,transparent 70%),#07090C;--ink:#F3F6F8;--mute:#8D98A6;--glass:rgba(255,255,255,.065);--edge:rgba(255,255,255,.11);--track:rgba(255,255,255,.1);--ok:#62EFC2;--ok2:#49C6F2;--need:#FFC95C;--over:#FF7F70;--zero:#6F7A88;--onok:#04221B;--bar:rgba(16,20,25,.72);--key:rgba(255,255,255,.07)}
#aurora .light{--bg:radial-gradient(120% 55% at 0% 0%,#CFF3E6 0%,transparent 62%),radial-gradient(90% 50% at 100% 15%,#D5E4FB 0%,transparent 62%),#F1F4F6;--ink:#0D1418;--mute:#667382;--glass:rgba(255,255,255,.72);--edge:rgba(255,255,255,.95);--track:rgba(13,20,24,.08);--ok:#0FA57C;--ok2:#1284C9;--need:#B97A00;--over:#D9432F;--zero:#8B96A3;--onok:#fff;--bar:rgba(255,255,255,.78);--key:rgba(255,255,255,.8)}
#aurora .disp{font-family:'Bricolage Grotesque',system-ui,sans-serif;font-weight:600;letter-spacing:-.035em}
#aurora .cents{font-size:.5em;opacity:.6;font-weight:500;letter-spacing:-.01em}
#aurora .glass{background:var(--glass);box-shadow:inset 0 0 0 1px var(--edge),0 18px 40px -24px rgba(0,0,0,.5);backdrop-filter:blur(24px)}
#aurora .light .glass{box-shadow:inset 0 0 0 1px var(--edge),0 14px 30px -20px rgba(20,40,60,.28)}

#aurora .top{display:flex;align-items:center;justify-content:space-between;padding:8px 20px 0}
#aurora .month{display:flex;align-items:center;gap:6px;font-size:17px;font-weight:600;padding:9px 14px 9px 16px;border-radius:99px}
#aurora .month span{color:var(--mute);font-weight:500}
#aurora .round{width:40px;height:40px;border-radius:50%;display:grid;place-items:center}

#aurora .hero{margin:14px 16px 0;border-radius:30px;padding:20px 22px 20px;position:relative;overflow:hidden}
#aurora .hero:before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,var(--ok),var(--ok2));opacity:.16}
#aurora .hero>*{position:relative}
#aurora .hero .lab{font-size:13.5px;color:var(--mute);font-weight:500}
#aurora .hero .amount{font-size:58px;line-height:1;margin:6px 0 16px}
#aurora .flow{display:flex;height:8px;border-radius:99px;overflow:hidden;background:var(--track);gap:2px}
#aurora .flow i{display:block;height:100%;border-radius:99px}
#aurora .flow .s{background:var(--ink);opacity:.9}#aurora .flow .b{background:var(--ink);opacity:.38}#aurora .flow .f{background:linear-gradient(90deg,var(--ok),var(--ok2))}
#aurora .flowkey{display:flex;justify-content:space-between;margin-top:10px;font-size:12px;color:var(--mute)}
#aurora .flowkey b{color:var(--ink);font-weight:600}
#aurora .assign{position:absolute!important;right:18px;top:18px;padding:10px 16px;border-radius:99px;background:linear-gradient(135deg,var(--ok),var(--ok2));color:var(--onok);font-size:14px;font-weight:700}

#aurora .alert{margin:10px 16px 0;border-radius:20px;padding:12px 14px 12px 16px;display:flex;align-items:center;gap:10px;font-size:14px;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--over) 45%,transparent);background:color-mix(in srgb,var(--over) 13%,transparent)}
#aurora .alert b{font-weight:600}
#aurora .alert .go{margin-left:auto;padding:7px 13px;border-radius:99px;background:var(--over);color:#1b0704;font-weight:700;font-size:13px}
#aurora .light .alert .go{color:#fff}

#aurora .gh{display:flex;justify-content:space-between;padding:16px 26px 8px;font-size:13px;font-weight:600;color:var(--mute)}
#aurora .gh span:last-child{font-weight:500;font-variant-numeric:tabular-nums}
#aurora .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 16px}
#aurora .tile{border-radius:22px;padding:13px 14px 13px;min-width:0}
#aurora .tile .h{display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:500;color:var(--mute)}
#aurora .tile .h .icon{color:var(--c)}
#aurora .tile .amt{font-size:27px;line-height:1.05;margin:7px 0 9px;color:var(--c)}
#aurora .tile .track{height:5px;border-radius:99px;background:var(--track);overflow:hidden}
#aurora .tile .track i{display:block;height:100%;border-radius:99px;background:var(--c)}
#aurora .tile .note{font-size:11.5px;color:var(--mute);margin-top:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#aurora .ok{--c:var(--ok)}#aurora .goal{--c:var(--ok2)}#aurora .needs{--c:var(--need)}#aurora .over{--c:var(--over)}#aurora .spent{--c:var(--zero)}
#aurora .tile.ok .track i,#aurora .tile.goal .track i{background:linear-gradient(90deg,var(--ok),var(--ok2))}
#aurora .tile.over{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--over) 50%,transparent),0 0 30px -10px var(--over)}
#aurora .tile.over .note,#aurora .tile.needs .note{color:var(--c)}

#aurora .dock{position:absolute;left:50%;transform:translateX(-50%);bottom:26px;height:64px;padding:0 8px;border-radius:99px;display:flex;align-items:center;gap:6px;background:var(--bar);box-shadow:inset 0 0 0 1px var(--edge),0 20px 40px -12px rgba(0,0,0,.55);backdrop-filter:blur(30px);z-index:10}
#aurora .dock .t{height:48px;padding:0 18px;border-radius:99px;display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:var(--mute)}
#aurora .dock .t.on{background:var(--glass);color:var(--ink);box-shadow:inset 0 0 0 1px var(--edge)}
#aurora .dock .add{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,var(--ok),var(--ok2));color:var(--onok)}
#aurora .fade{position:absolute;left:0;right:0;bottom:0;height:120px;background:linear-gradient(to top,#07090C 20%,transparent);z-index:5}
#aurora .light .fade{background:linear-gradient(to top,#F1F4F6 20%,transparent)}

#aurora .bartop{display:flex;align-items:center;justify-content:space-between;padding:8px 16px 0}
#aurora .bartop .t{font-size:16px;font-weight:600}
#aurora .ringwrap{position:relative;width:236px;height:236px;margin:18px auto 0}
#aurora .ringwrap .mid{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
#aurora .ringwrap .lab{font-size:13px;color:var(--mute);font-weight:500}
#aurora .ringwrap .amount{font-size:50px;line-height:1.05;margin:4px 0 4px}
#aurora .ringwrap .sub{font-size:13px;color:var(--ok);font-weight:600}
#aurora .trio{display:flex;gap:10px;padding:18px 16px 0}
#aurora .trio>div{flex:1;border-radius:18px;padding:12px 13px}
#aurora .trio .k{font-size:11.5px;color:var(--mute);font-weight:500}
#aurora .trio .v{font-size:19px;margin-top:4px}
#aurora .days{margin:10px 16px 0;border-radius:22px;padding:14px 16px 12px}
#aurora .days .k{display:flex;justify-content:space-between;font-size:12.5px;color:var(--mute);font-weight:500}
#aurora .days .k b{color:var(--ink);font-weight:600}
#aurora .bars{display:flex;align-items:flex-end;gap:4px;height:58px;margin-top:10px}
#aurora .bars i{flex:1;border-radius:4px;background:linear-gradient(180deg,var(--ok),var(--ok2));min-height:3px}
#aurora .bars i.z{background:var(--track)}#aurora .bars i.f{background:var(--track);opacity:.5;height:3px;min-height:3px}
#aurora .cta{display:flex;gap:10px;padding:12px 16px 0}
#aurora .btn{flex:1;height:52px;border-radius:99px;display:flex;align-items:center;justify-content:center;gap:8px;font-size:15px;font-weight:700;background:linear-gradient(135deg,var(--ok),var(--ok2));color:var(--onok)}
#aurora .btn.g{background:var(--glass);color:var(--ink);box-shadow:inset 0 0 0 1px var(--edge)}
#aurora .list{margin:12px 16px 0;border-radius:22px;padding:4px 16px}
#aurora .li{display:flex;align-items:center;gap:12px;padding:11px 0}
#aurora .li+.li{box-shadow:inset 0 1px 0 var(--track)}
#aurora .li .av{width:36px;height:36px;border-radius:12px;display:grid;place-items:center;background:var(--track);font-weight:700;font-size:14px}
#aurora .li .p{font-size:14.5px;font-weight:600}#aurora .li .d{font-size:12px;color:var(--mute);margin-top:2px}
#aurora .li .a{margin-left:auto;font-size:17px}

#aurora .grab{width:38px;height:5px;border-radius:9px;background:var(--track);margin:6px auto 0}
#aurora .sheet-top{display:flex;justify-content:space-between;align-items:center;padding:12px 22px 0;font-size:15.5px}
#aurora .sheet-top .c{color:var(--mute)}#aurora .sheet-top .t{font-weight:600}
#aurora .entry{text-align:center;padding:52px 0 0}
#aurora .entry .amount{font-size:88px;line-height:1}
#aurora .entry .who{display:inline-flex;align-items:center;gap:8px;margin-top:14px;padding:9px 16px;border-radius:99px;font-size:14.5px;font-weight:600}
#aurora .pick{margin:44px 16px 0;border-radius:24px;padding:14px 16px 15px}
#aurora .pick .h{display:flex;align-items:center;gap:9px;font-size:15px;font-weight:600}
#aurora .pick .h .icon{color:var(--ok)}
#aurora .pick .h span{margin-left:auto;font-size:12.5px;color:var(--mute);font-weight:500;display:flex;align-items:center;gap:2px}
#aurora .pick .track{height:8px;border-radius:99px;background:var(--track);margin:13px 0 9px;display:flex;overflow:hidden}
#aurora .pick .track i{height:100%}
#aurora .pick .track .was{background:var(--ink);opacity:.4}#aurora .pick .track .now{background:var(--need)}
#aurora .pick .f{display:flex;justify-content:space-between;font-size:12.5px;color:var(--mute)}
#aurora .pick .f b{color:var(--ok);font-weight:600}
#aurora .meta{display:flex;gap:10px;padding:10px 16px 0}
#aurora .meta>div{flex:1;border-radius:18px;padding:11px 14px;display:flex;align-items:center;gap:9px;font-size:14px;font-weight:600}
#aurora .meta .icon{color:var(--mute)}
#aurora .pad{position:absolute;left:0;right:0;bottom:0;padding:0 26px 34px;display:grid;grid-template-columns:repeat(4,1fr);gap:9px}
#aurora .pad b{height:60px;border-radius:20px;background:var(--key);box-shadow:inset 0 0 0 1px var(--edge);display:grid;place-items:center;font:600 24px/1 'Bricolage Grotesque',sans-serif}
#aurora .pad b.fn{color:var(--mute)}
#aurora .pad b.save{grid-row:span 2;height:auto;background:linear-gradient(160deg,var(--ok),var(--ok2));color:var(--onok);box-shadow:none}
`;

export const tile = c => `<div class="tile glass ${c.status}">
  <div class="h">${icon(c.icon, 17, 1.9)}<span>${c.name}</span></div>
  <div class="amt disp">${money(c.balance)}</div>
  <div class="track"><i style="width:${fill(c)}%"></i></div>
  <div class="note">${c.note}</div>
</div>`;

export const topBar = `<div class="top">
  <div class="month glass">${today.month} <span>${today.year}</span>${icon('chevD', 16, 2.2)}</div>
  <div class="round glass">${icon('user', 20)}</div>
</div>`;

export const hero = `<div class="hero glass">
  <div class="lab">Ready to budget</div>
  <div class="amount disp">${money(summary.toBudget)}</div>
  <div class="flow"><i class="s" style="width:${(summary.spent / summary.income) * 100}%"></i><i class="b" style="width:${((summary.budgeted - summary.spent) / summary.income) * 100}%"></i><i class="f" style="width:${(summary.toBudget / summary.income) * 100}%"></i></div>
  <div class="flowkey"><span>Spent <b>${dollars(summary.spent)}</b></span><span>Still set aside <b>${dollars(summary.budgeted - summary.spent)}</b></span><span>Free <b>${dollars(summary.toBudget)}</b></span></div>
  <div class="assign">Assign</div>
</div>`;

export const alert = `<div class="alert"><span><b>Dining out</b> is $28.10 over</span><span class="go">Cover it</span></div>`;

export const groupHead = g =>
  `<div class="gh"><span>${g.name}</span><span>${dollars(g.categories.reduce((n, c) => n + Math.max(0, c.balance), 0))}</span></div>`;

export const dock = on => `<div class="fade"></div>
<div class="dock"><div class="t ${on === 'plan' ? 'on' : ''}">${icon('plan', 20, 2)}Plan</div><div class="add">${icon('plus', 24, 2.4)}</div><div class="t ${on === 'accounts' ? 'on' : ''}">${icon('wallet', 20, 2)}Accounts</div></div>`;

/** The Plan screen for any set of groups, with any hero and notice above them. */
export const planFor = (gs, { top = topBar, head = hero, notice = alert, each = tile } = {}) => `
${top}${head}${notice}
${gs.map(g => `${groupHead(g)}<div class="grid">${g.categories.map(each).join('')}</div>`).join('')}
${dock('plan')}`;

const plan = planFor(groups);

function ring() {
  const r = 104, c = 2 * Math.PI * r, part = groceries.spent / groceries.budgeted;
  return `<svg width="236" height="236" viewBox="0 0 236 236" fill="none">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--ok)"/><stop offset="1" stop-color="var(--ok2)"/></linearGradient></defs>
    <circle cx="118" cy="118" r="${r}" stroke="var(--track)" stroke-width="14"/>
    <circle cx="118" cy="118" r="${r}" stroke="url(#g)" stroke-width="14" stroke-linecap="round" stroke-dasharray="${(c * (1 - part)).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 118 118)"/>
  </svg>`;
}
const max = Math.max(...groceries.daily);
const detail = `
<div class="bartop"><div class="round glass">${icon('chevL', 20, 2)}</div><span class="t">Groceries</span><div class="round glass">${icon('dots', 20, 2)}</div></div>
<div class="ringwrap">${ring()}<div class="mid"><div class="lab">Available</div><div class="amount disp">${money(groceries.balance)}</div><div class="sub">$17.30 a day · 12 days</div></div></div>
<div class="trio">
  <div class="glass"><div class="k">Budgeted</div><div class="v disp">${money(groceries.budgeted)}</div></div>
  <div class="glass"><div class="k">Spent</div><div class="v disp">${money(groceries.spent)}</div></div>
  <div class="glass"><div class="k">Last month</div><div class="v disp">${money(68410)}</div></div>
</div>
<div class="days glass"><div class="k"><span>This month, day by day</span><b>Slightly over pace</b></div>
  <div class="bars">${Array.from({ length: today.daysInMonth }, (_, i) => {
    const v = groceries.daily[i];
    return v === undefined ? '<i class="f"></i>' : v ? `<i style="height:${Math.max(8, (v / max) * 100)}%"></i>` : '<i class="z"></i>';
  }).join('')}</div>
</div>
<div class="cta"><div class="btn">${icon('swap', 19, 2.2)}Move money</div><div class="btn g">Change budget</div></div>
<div class="list glass">${groceries.activity
  .slice(0, 3)
  .map(a => `<div class="li"><div class="av">${a.payee[0]}</div><div><div class="p">${a.payee}</div><div class="d">${a.date} · ${a.account}</div></div><div class="a disp">${money(a.amount)}</div></div>`)
  .join('')}</div>`;

const after = groceries.balance - 1840;
const add = `
<div class="grab"></div>
<div class="sheet-top"><span class="c">Cancel</span><span class="t">New transaction</span><span class="c">Today</span></div>
<div class="entry"><div class="amount disp">${money(-1840)}</div><div class="who glass">${icon('check', 16, 2.4)}Corner Bakery</div></div>
<div class="pick glass">
  <div class="h">${icon('basket', 19, 1.9)}Groceries<span>Suggested${icon('chevR', 14, 2.2)}</span></div>
  <div class="track"><i class="was" style="width:${(groceries.spent / groceries.budgeted) * 100}%"></i><i class="now" style="width:${(1840 / groceries.budgeted) * 100}%"></i></div>
  <div class="f"><span>$207.62 left now</span><b>${dollars(after)}.${String(after % 100).padStart(2, '0')} after</b></div>
</div>
<div class="meta"><div class="glass">${icon('wallet', 18)}Everyday Checking</div><div class="glass" style="flex:.55">${icon('cal', 18)}Today</div></div>
<div class="pad">
  <b>1</b><b>2</b><b>3</b><b class="fn">${icon('del', 24)}</b>
  <b>4</b><b>5</b><b>6</b><b class="fn">+/−</b>
  <b>7</b><b>8</b><b>9</b><b class="save">${icon('check', 28, 2.6)}</b>
  <b>.</b><b>0</b><b>00</b>
</div>`;

export const shots = [
  phone('dark', 'Plan', plan),
  phone('dark', 'Category', detail),
  phone('dark', 'Quick add', add),
  phone('light', 'Plan · light', plan),
];
