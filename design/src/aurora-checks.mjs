// Round 2, board 2: Aurora under stress. The cases round 1 left unchecked.
import { dock, groupHead, planFor, tile, topBar } from './aurora.mjs';
import { css as shared, fonts } from './aurora2.mjs';
import { groups, today } from './data.mjs';
import { icon, money, phone } from './lib.mjs';

export const meta = {
  id: 'aurora',
  title: 'Aurora · under stress',
  blurb:
    'The cases round 1 left unchecked: an Android phone with no live blur, the largest text size, long names with awkward numbers and bad news, and light mode with colours that pass contrast.',
  fonts,
};
export const css = shared;

// Long names, a big goal, a big overspend, and a category with nothing budgeted.
const awkward = [
  {
    name: 'Home',
    categories: [
      { name: 'Home maintenance and repairs', icon: 'home', budgeted: 150000, spent: 26000, balance: 124000, status: 'ok', note: 'On track' },
      { name: 'Kids’ activities and school trips', icon: 'user', budgeted: 21500, spent: 0, balance: 21500, target: 30000, status: 'needs', note: '$85 needed by 1 Dec' },
      { name: 'Car', icon: 'train', budgeted: 30000, spent: 150455, balance: -120455, status: 'over', note: 'Overspent' },
      { name: 'Subscriptions (streaming, software, news)', icon: 'wifi', budgeted: 6400, spent: 6400, balance: 0, status: 'spent', note: 'Fully spent' },
    ],
  },
  {
    name: 'Long-term',
    categories: [
      { name: 'House deposit', icon: 'house', budgeted: 250000, spent: 0, balance: 4825000, target: 6000000, status: 'goal', note: '80% of $60,000' },
      { name: 'Gifts', icon: 'umbrella', budgeted: 0, spent: 0, balance: 0, status: 'spent', note: 'Nothing budgeted' },
    ],
  },
];
// Six-figure and four-figure-negative amounts drop a size instead of being cut off.
const fitted = c => tile(c).replace('class="amt disp"', Math.abs(c.balance) >= 100000 ? 'class="amt disp long"' : 'class="amt disp"');

const staleTop = topBar.replace(
  /<div class="round glass">.*?<\/div>\n<\/div>$/s,
  `<div class="stale glass">${icon('cloudoff', 16, 2)}Offline · 3 days</div>\n</div>`,
);
const badHero = `<div class="hero glass bad">
  <div class="lab">Overbudgeted</div>
  <div class="amount disp">${money(-12000)}</div>
  <div class="flow"><i class="s" style="width:55%"></i><i class="b" style="width:45%"></i></div>
  <div class="flowkey"><span>You have assigned <b>$120 more</b> than you have</span></div>
  <div class="assign">Fix</div>
</div>`;
const badAlert = `<div class="alert"><span><b>Car</b> is $1,204.55 over</span><span class="go">Cover it</span></div>`;

const xl = `
${topBar}
<div class="hero glass"><div class="lab">Ready to budget</div><div class="amount disp">${money(31200)}</div><div class="flow"><i class="s" style="width:55%"></i><i class="b" style="width:40%"></i><i class="f" style="width:5%"></i></div><div class="assign">Assign</div></div>
<div class="alert"><span><b>Dining out</b> is $28.10 over</span><span class="go">Cover it</span></div>
${[groups[1]].map(g => `${groupHead(g)}<div class="grid">${g.categories.map(tile).join('')}</div>`).join('')}
${dock('plan')}`;

export const shots = [
  `<div class="solid">${phone('dark android', 'Android · solid tiles, no live blur', planFor(groups))}</div>`,
  `<div class="xl">${phone('dark', 'Largest text size · one column', xl)}</div>`,
  `<div class="wrap">${phone('dark', 'Long names, big numbers, bad news', planFor(awkward, { top: staleTop, head: badHero, notice: badAlert, each: fitted }))}</div>`,
  phone('light', 'Light · contrast-corrected', planFor(groups)),
];
void today;
