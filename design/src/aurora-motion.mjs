// Round 3, board 2: motion, as storyboards. Each interaction is one piece of markup with four
// states (data-f="0".."3") and CSS transitions between them, so the same markup makes the
// still frames here and the moving version in aurora-motion-live.mjs.
import { alert, dock, groupHead, tile, topBar } from './aurora.mjs';
import { bite, css as shared, fonts, pad } from './aurora3.mjs';
import { groups, summary } from './data.mjs';
import { dollars, icon, money, phone } from './lib.mjs';

export const meta = {
  id: 'aurora',
  title: 'Aurora · motion',
  blurb:
    'Two interactions, frame by frame. Motion here has one job: to show where money went. Bars move on a spring, sheets on a 420 ms ease, and nothing loops or bounces for decoration.',
  fonts,
  height: 2330,
};

export const timing = { quick: 120, standard: 240, emphasised: 420, ease: 'cubic-bezier(.2,0,0,1)', spring: 'cubic-bezier(.3,1.4,.5,1)' };

export const css = `${shared}
#aurora .mo{position:absolute;inset:0}
#aurora .L{position:absolute;inset:0;padding-top:54px;display:flex;flex-direction:column;transition:transform ${timing.emphasised}ms ${timing.ease},opacity ${timing.standard}ms ${timing.ease},filter ${timing.standard}ms ${timing.ease}}
#aurora .L>*{flex-shrink:0}
#aurora .L.up{top:44px;padding-top:0;border-radius:34px 34px 0 0;background:var(--sheet);box-shadow:inset 0 1px 0 var(--edge),0 -30px 60px -20px rgba(0,0,0,.7);z-index:15}
#aurora .L.up.fit{top:auto;height:auto;display:block;padding:8px 16px 34px}
${[0, 1, 2, 3].map(f => `#aurora [data-f="${f}"] .v:not([data-on~="${f}"]){display:none!important}`).join('\n')}
#aurora .bite .bt i{transition:width ${timing.emphasised}ms ${timing.spring},opacity ${timing.standard}ms ${timing.ease}}
#aurora .tile,#aurora .hero .amount{transition:box-shadow ${timing.emphasised}ms ${timing.ease},color ${timing.standard}ms ${timing.ease}}
#aurora .fold{overflow:hidden;transition:max-height ${timing.emphasised}ms ${timing.ease},opacity ${timing.standard}ms ${timing.ease};max-height:80px}
#aurora .pulse{box-shadow:inset 0 0 0 1.5px var(--ok),0 0 34px -8px var(--ok)!important}
#aurora .tap{position:absolute;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;background:rgba(255,255,255,.28);box-shadow:0 0 0 2px rgba(255,255,255,.7);z-index:40}
#aurora .pad b.save{transition:transform 120ms cubic-bezier(.2,0,0,1),filter 120ms}
#aurora [data-f="2"] .pad b.save{transform:scale(.93);filter:brightness(.85)}
#aurora .ghost{opacity:.3}

/* Quick add: the sheet covers the Plan until it is saved. */
#aurora .qa[data-f="0"] .plan,#aurora .qa[data-f="1"] .plan{opacity:.3;filter:blur(3px)}
#aurora .qa[data-f="2"] .plan{opacity:.75}
#aurora .qa[data-f="2"] .up{transform:translateY(34%)}
#aurora .qa[data-f="3"] .up{transform:translateY(105%)}
#aurora .qa[data-f="0"] .gone{width:0!important}#aurora .qa[data-f="0"] .keep{width:100%!important}
#aurora .qa[data-f="2"] .gone{opacity:0}

/* Cover: the sheet rises over the Plan, then the Plan settles. */
#aurora .cv[data-f="0"] .up,#aurora .cv[data-f="3"] .up{transform:translateY(105%)}
#aurora .cv[data-f="2"] .up{transform:translateY(86%)}
#aurora .cv[data-f="1"] .plan{opacity:.3;filter:blur(3px)}
#aurora .cv[data-f="2"] .plan{opacity:.8}
#aurora .cv[data-f="3"] .fold{max-height:0;opacity:0}
`;

const v = (on, html) => html.replace(/^(\s*<\w+)/, `$1 data-on="${on}"`).replace(/class="/, 'class="v ');
const span = (on, html) => `<span class="v" data-on="${on}">${html}</span>`;

const heroWith = amount => `<div class="hero glass">
  <div class="lab">Ready to budget</div>
  <div class="amount disp">${amount}</div>
  <div class="flow"><i class="s" style="width:55%"></i><i class="b" style="width:40%"></i><i class="f" style="width:5%"></i></div>
  <div class="flowkey"><span>Spent <b>${dollars(summary.spent)}</b></span><span>Still set aside <b>${dollars(summary.budgeted - summary.spent)}</b></span></div>
  <div class="assign">Assign</div>
</div>`;

/** The Plan, with some tiles swapped per frame. `swap` maps a category name to its variants. */
const plan = (heroAmount, notice, swap) => `<div class="L plan">
${topBar}${heroWith(heroAmount)}${notice}
${groups
  .slice(0, 2)
  .map(g => `${groupHead(g)}<div class="grid">${g.categories.map(c => swap[c.name] ?? tile(c)).join('')}</div>`)
  .join('')}
${dock('plan')}</div>`;

// --- Quick add
const groceries = groups[1].categories[0];
const quickAdd = f => `<div class="mo qa" data-f="${f}">
${plan(money(summary.toBudget), alert, {
  Groceries:
    v('0 1 2', tile(groceries)) +
    v('3', tile({ ...groceries, balance: 18922, spent: 53078, note: '$15 a day for 12 days' }).replace('class="tile', 'class="tile pulse')),
})}
<div class="L up">
  <div class="grab"></div><div class="sheet-top"><span class="c">Cancel</span><span class="t">New transaction</span><span class="c">Today</span></div>
  <div class="entry"><div class="amount disp">${span('0', `<span class="ghost">${money(0)}</span>`)}${span('1 2 3', money(-1840))}</div>
    ${v('0', `<div class="who glass ghost">Who did you pay?</div>`)}${v('1 2 3', `<div class="who glass">${icon('check', 16, 2.4)}Corner Bakery</div>`)}</div>
  <div class="pot glass ok" style="margin-top:36px">
    <div class="h">${icon('basket', 19, 1.9)}Groceries<span>Suggested${icon('chevR', 14, 2.2)}</span></div>
    ${bite(20762, 1840, { label: false })}
    <div class="bite"><div class="bl">${span('0 1', `<span>${money(20762)}</span>`)}${span('2 3', `<span>${money(18922)}</span>`)}${span('1', `<b>${money(18922)} after</b>`)}${span('2 3', '<b>Saved</b>')}</div></div>
  </div>
  ${pad()}
</div>
<div class="tap v" data-on="1" style="left:206px;top:612px"></div>
</div>`;

// --- Cover overspending
const dining = groups[1].categories[1];
const check = icon('check', 15, 3);
const cover = f => `<div class="mo cv" data-f="${f}">
${plan(span('0 1', money(summary.toBudget)) + span('2 3', money(summary.toBudget - 2810)), `<div class="fold">${alert}</div>`, {
  'Dining out':
    v('0 1', tile(dining)) +
    v('2', tile({ ...dining, balance: 0, status: 'ok', note: 'Covered' }).replace('class="tile', 'class="tile pulse')) +
    v('3', tile({ ...dining, balance: 0, status: 'spent', note: 'Covered · fully spent' })),
})}
<div class="L up fit">
  <div class="grab"></div>
  <h2 class="disp" style="font-size:27px;margin:16px 8px 6px">Cover Dining out</h2>
  <div class="pot glass over" style="margin:10px 0 16px"><div class="h" style="margin-bottom:11px">${icon('fork', 19, 1.9)}Dining out</div>${bite(-2810, -2810)}</div>
  <p style="font-size:14.5px;color:var(--mute);margin:0 8px 4px">Take $28.10 from</p>
  <div class="src glass on"><div><div class="n">${icon('coins', 18, 1.9)}Ready to budget</div>${bite(31200, 2810, { small: true })}</div><div class="radio on">${check}</div></div>
  <div class="src glass"><div><div class="n">${icon('train', 18, 1.9)}Transport</div>${bite(7600, 2810, { small: true })}</div><div class="radio"></div></div>
  <div class="btn" style="flex:none;width:100%;height:56px;font-size:16px;margin-top:16px">Cover $28.10</div>
</div>
<div class="tap v" data-on="0" style="left:330px;top:296px"></div><div class="tap v" data-on="1" style="left:195px;top:778px"></div>
</div>`;

export const interactions = [
  {
    title: 'Quick add: the bite',
    note: 'Bars: spring, about 420 ms. Sheet: 420 ms ease-out. A light haptic when the bite lands, a success haptic on Save.',
    make: quickAdd,
    captions: [
      'Open. The category is suggested and its bar is whole.',
      'Type. Each digit grows the bite on a spring.',
      'Save. The hatching drains; the sheet starts to drop.',
      'Back on the Plan, Groceries has changed. One pulse, then still.',
    ],
  },
  {
    title: 'Cover overspending',
    note: 'The coral glow fades as the money arrives. The notice folds away and the tiles below slide up to fill the gap.',
    make: cover,
    captions: [
      'One notice. Tap “Cover it”.',
      'The sheet rises with a source already chosen.',
      'Cover. Dining out fills, Ready to budget drops by $28.10.',
      'Settled. The notice has folded away.',
    ],
  },
];

export const rows = interactions.map(i => ({
  title: i.title,
  note: i.note,
  shots: i.captions.map((c, f) => phone('dark', `${f + 1}. ${c}`, i.make(f))),
}));
