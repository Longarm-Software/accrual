// Aurora, round 3: the "bite". One component, used on every sheet that moves money, that
// shows what a pot of money will look like after the change, before you commit to it.
import { css as round2, fonts } from './aurora2.mjs';
import { icon, money } from './lib.mjs';

export { fonts };

export const css = `${round2}
/* The bar is the pot as it is now. The hatched end is what is about to leave (a bite) or
   arrive (a gain). A bite bigger than the pot turns the whole bar coral. */
#aurora .bite .bt{height:10px;border-radius:99px;background:var(--track);display:flex;overflow:hidden}
#aurora .bite .bt i{height:100%;display:block}
#aurora .bite .keep{background:linear-gradient(90deg,var(--ok),var(--ok2))}
#aurora .bite .gone{background:repeating-linear-gradient(-55deg,var(--need) 0 3px,transparent 3px 6px);box-shadow:inset 2px 0 0 var(--need)}
#aurora .bite .gain{background:repeating-linear-gradient(-55deg,var(--ok) 0 3px,transparent 3px 6px);box-shadow:inset -2px 0 0 var(--ok)}
#aurora .bite .debt{background:var(--over);opacity:.55}
#aurora .bite.bust .gone{background:repeating-linear-gradient(-55deg,var(--over) 0 3px,transparent 3px 6px);box-shadow:none}
#aurora .bite .bl{display:flex;justify-content:space-between;margin-top:9px;font-size:13px;color:var(--mute);font-variant-numeric:tabular-nums}
#aurora .bite .bl b{font-weight:600;color:var(--ok)}
#aurora .bite.bust .bl b{color:var(--over)}
#aurora .bite.sm .bt{height:6px}
#aurora .bite.sm .bl{margin-top:6px;font-size:12.5px}
#aurora .bite .cents{font-size:1em;opacity:1}

#aurora .pot{margin:10px 16px 0;border-radius:24px;padding:14px 16px 15px}
#aurora .pot .h{display:flex;align-items:center;gap:9px;font-size:15px;font-weight:600;margin-bottom:13px}
#aurora .pot .h .icon{color:var(--c)}
#aurora .pot .h span{margin-left:auto;font-size:12.5px;color:var(--mute);font-weight:500;display:flex;align-items:center;gap:2px}
#aurora .pot .role{font-size:11.5px;font-weight:600;color:var(--mute);letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px}
#aurora .pot.warn{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--over) 55%,transparent),0 0 30px -12px var(--over)}
#aurora .fixit{margin:10px 16px 0;border-radius:20px;padding:11px 12px 11px 16px;display:flex;align-items:center;gap:10px;font-size:14px}
#aurora .fixit .go{margin-left:auto;padding:7px 13px;border-radius:99px;background:var(--glass);box-shadow:inset 0 0 0 1px var(--edge);font-weight:600;font-size:13px;white-space:nowrap}
#aurora .swap{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;margin:-12px auto -22px;position:relative;z-index:3;background:var(--sheet);box-shadow:inset 0 0 0 1px var(--edge);transform:rotate(90deg)}
#aurora .src .bite{margin-top:9px}
#aurora .src>div:first-child{flex:1;min-width:0}
#aurora .give .bite{margin-top:8px;width:150px}
#aurora .entry.tight{padding-top:22px}#aurora .entry.tight .amount{font-size:72px}
#aurora .pad b.save.warn{background:var(--over);color:#1b0704}
`;

/**
 * A bite out of a pot holding `now` cents. `take` leaves it (positive) or joins it (negative).
 * For a gain towards a goal, pass `full` as the goal so the bar shows the distance left.
 */
export function bite(now, take, { full, small = false, label = true } = {}) {
  const after = now - take;
  const bust = after < 0;
  let bar;
  if (take >= 0) {
    const part = bust ? 100 : Math.max(4, (take / now) * 100);
    bar = `<i class="keep" style="width:${100 - part}%"></i><i class="gone" style="width:${part}%"></i>`;
  } else if (now < 0) {
    // Paying off a deficit: the coral shrinks as mint arrives.
    const part = Math.min(100, (-take / -now) * 100);
    bar = `<i class="gain" style="width:${part}%"></i><i class="debt" style="width:${100 - part}%"></i>`;
  } else {
    const whole = full ?? after;
    bar = `<i class="keep" style="width:${(now / whole) * 100}%"></i><i class="gain" style="width:${Math.max(3, (-take / whole) * 100)}%"></i>`;
  }
  const text = label ? `<div class="bl"><span>${money(now)}</span><b>${money(after)} after</b></div>` : '';
  return `<div class="bite ${bust ? 'bust' : ''} ${small ? 'sm' : ''}"><div class="bt">${bar}</div>${text}</div>`;
}

export const pad = (save = icon('check', 28, 2.6), cls = '') => `<div class="pad">
  <b>1</b><b>2</b><b>3</b><b class="fn">${icon('del', 24)}</b>
  <b>4</b><b>5</b><b>6</b><b class="fn">+/−</b>
  <b>7</b><b>8</b><b>9</b><b class="save ${cls}">${save}</b>
  <b>.</b><b>0</b><b>00</b>
</div>`;
