// Round 3, board 3: logo explorations. Five marks, each shown large, as an app icon in two
// treatments, at small sizes, and locked up with the wordmark.
import { fonts } from './aurora3.mjs';

export const meta = {
  id: 'logo',
  title: 'Logo explorations',
  blurb:
    'Five marks for Accrual in Aurora’s mint-to-blue. Each is shown large, as an app icon on dark and on the gradient, at 32, 20 and 16 pixels, and beside the wordmark. None may look like Actual’s own logo, an angular capital A.',
  fonts,
  height: 1130,
};

let uid = 0;
/** Wraps mark artwork in an SVG. `paint` is 'grad' (mint to blue), or any CSS colour. */
function svg(size, paint, draw) {
  const id = `g${uid++}`;
  const p = paint === 'grad' ? `url(#${id})` : paint;
  return `<svg width="${size}" height="${size}" viewBox="0 0 96 96" fill="none">
  <defs><linearGradient id="${id}" x1="10" y1="10" x2="86" y2="86" gradientUnits="userSpaceOnUse"><stop stop-color="#62EFC2"/><stop offset="1" stop-color="#5CCBF4"/></linearGradient></defs>
  ${draw(p, id)}</svg>`;
}

const marks = [
  {
    name: 'Ring',
    why: 'A lowercase “a” whose bowl is the Available gauge from the category screen. It is the product’s own shape, it is still legible at 16 pixels, and it looks nothing like Actual’s capital A.',
    risk: 'At a glance some will see a “d” or a power symbol before an “a”.',
    draw: p => {
      const r = 22, c = 2 * Math.PI * r;
      return `<circle cx="40" cy="54" r="${r}" stroke="${p}" stroke-width="13" opacity=".3"/>
  <circle cx="40" cy="54" r="${r}" stroke="${p}" stroke-width="13" stroke-linecap="round" stroke-dasharray="${(c * 0.68).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-62 40 54)"/>
  <rect x="62" y="24" width="13" height="58" rx="6.5" fill="${p}"/>`;
    },
  },
  {
    name: 'Stack',
    why: 'Money accruing in layers, which is what the name means. Simple, bold and very strong as an icon.',
    risk: 'It looks like a pile of balanced stones, which is what wellness apps use. Its triangular outline also echoes a capital A, the letter of Actual’s logo.',
    draw: p => `<rect x="37" y="20" width="22" height="15" rx="7.5" fill="${p}" opacity=".5"/>
  <rect x="25" y="41" width="46" height="15" rx="7.5" fill="${p}" opacity=".78"/>
  <rect x="13" y="62" width="70" height="15" rx="7.5" fill="${p}"/>`,
  },
  {
    name: 'Bite',
    why: 'A category tile with the bite taken out of it: the signature interaction as a logo. Nobody else in budgeting has this shape.',
    risk: 'A bitten shape makes people think of Apple. It also needs the product to explain it.',
    draw: (p, id) => `<mask id="m${id}"><rect width="96" height="96" fill="#fff"/><circle cx="76" cy="22" r="19" fill="#000"/></mask>
  <rect x="14" y="16" width="66" height="66" rx="20" fill="${p}" mask="url(#m${id})"/>
  <circle cx="78" cy="19" r="7" fill="${p}" opacity=".55"/>`,
  },
  {
    name: 'Envelope',
    why: 'Envelope budgeting, said plainly. Anyone who knows the method gets it at once.',
    risk: 'Everyone else reads it as an email app. The weakest on a crowded home screen.',
    draw: p => `<rect x="14" y="23" width="68" height="52" rx="14" stroke="${p}" stroke-width="9"/>
  <path d="M19 32 48 54l29-22" stroke="${p}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  {
    name: 'Dawn',
    why: 'First light over a horizon: the aurora of the design’s name, and a balance on the rise. The friendliest of the five.',
    risk: 'Sunrises belong to weather and sleep apps. It says nothing about money.',
    draw: p => `<path d="M12 62a36 36 0 0 1 72 0" stroke="${p}" stroke-width="8" stroke-linecap="round" opacity=".35"/>
  <path d="M26 62a22 22 0 0 1 44 0z" fill="${p}"/>
  <rect x="12" y="70" width="72" height="11" rx="5.5" fill="${p}"/>`,
  },
];

export const css = `
#logo .lg{width:390px;border-radius:30px;overflow:hidden;background:#fff;box-shadow:0 30px 60px -30px rgba(0,0,0,.3)}
#logo .stage{height:270px;display:grid;place-items:center;background:radial-gradient(120% 90% at 0% 0%,#0F3231 0%,transparent 60%),radial-gradient(90% 80% at 100% 30%,#14254A 0%,transparent 62%),#07090C}
#logo .icons{display:flex;align-items:center;gap:16px;padding:22px 24px 6px}
#logo .ic{width:84px;height:84px;border-radius:21px;display:grid;place-items:center;flex:none}
#logo .ic.d{background:radial-gradient(120% 120% at 0% 0%,#123B3A 0%,#07090C 70%)}
#logo .ic.g{background:linear-gradient(135deg,#62EFC2,#5CCBF4)}
#logo .small{margin-left:auto;display:flex;align-items:flex-end;gap:12px;padding:12px 14px;border-radius:16px;background:#0B1014}
#logo .lock{display:flex;align-items:center;gap:10px;margin:14px 24px 0;padding:16px 18px;border-radius:18px;font:600 30px/1 'Bricolage Grotesque',sans-serif;letter-spacing:-.04em}
#logo .lock.d{background:#0B1014;color:#F3F6F8}
#logo .lock.l{background:#F1F4F6;color:#0D1418}
#logo .txt{padding:18px 24px 24px;font-size:14px;line-height:1.5;color:#3d4650}
#logo .txt b{display:block;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8a939d;font-weight:600;margin:12px 0 3px}
#logo .txt b:first-child{margin-top:0}
#logo .shot figcaption{font-size:16px;font-weight:600;opacity:.85}
`;

export const shots = marks.map(
  (m, i) => `<figure class="shot"><div class="lg">
  <div class="stage">${svg(150, 'grad', m.draw)}</div>
  <div class="icons">
    <div class="ic d">${svg(54, 'grad', m.draw)}</div>
    <div class="ic g">${svg(54, '#062019', m.draw)}</div>
    <div class="small">${[32, 20, 16].map(s => svg(s, '#F3F6F8', m.draw)).join('')}</div>
  </div>
  <div class="lock d">${svg(36, 'grad', m.draw)}Accrual</div>
  <div class="lock l">${svg(36, '#067A5B', m.draw)}Accrual</div>
  <div class="txt"><b>For it</b>${m.why}<b>Against it</b>${m.risk}</div>
</div><figcaption>${i + 1} · ${m.name}</figcaption></figure>`,
);
