// Shared helpers for the mockup boards: money formatting, icons, the phone frame and the page.
export const dollars = cents => {
  const n = Math.abs(cents);
  return `${cents < 0 ? '−' : ''}$${Math.floor(n / 100).toLocaleString('en-US')}`;
};
export const centsPart = cents => String(Math.abs(cents) % 100).padStart(2, '0');
/** "$207" with a smaller ".62", which is how every direction sets amounts. */
export const money = (cents, cls = '') =>
  `<span class="money ${cls}">${dollars(cents)}<span class="cents">.${centsPart(cents)}</span></span>`;

const paths = {
  home: '<path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z"/>',
  bolt: '<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/>',
  wifi: '<path d="M3.5 9.5a12.5 12.5 0 0 1 17 0M6.5 13a8 8 0 0 1 11 0M9.5 16.3a3.6 3.6 0 0 1 5 0"/><circle cx="12" cy="19.2" r=".6"/>',
  shield: '<path d="M12 3.5 5 6v5.5c0 4.2 2.8 7.4 7 9 4.2-1.6 7-4.8 7-9V6z"/>',
  basket: '<path d="M4 9.5h16l-1.5 9.5a1 1 0 0 1-1 .8h-11a1 1 0 0 1-1-.8zM8.5 9.5 11 4.5M15.5 9.5 13 4.5"/>',
  fork: '<path d="M7 3.5V10a2.5 2.5 0 0 0 5 0V3.500M9.5 3.5v17M17 20.5v-17c-2 1.200-3 3.500-3 6.500v2.500h3"/>',
  train: '<rect x="6" y="3.5" width="12" height="13" rx="3"/><path d="M6 11h12M9 20.5l1.500-4M15 20.5l-1.500-4"/>',
  cup: '<path d="M5 8.5h12V14a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5zM17 10h1.5a2.5 2.5 0 0 1 0 5H17M8.5 3.5v2M12 3.5v2"/>',
  umbrella: '<path d="M3.5 12.5a8.5 8.5 0 0 1 17 0zM12 12.5V18a2 2 0 0 0 4 0M12 4V2.800"/>',
  plane: '<path d="m3 13 18-8-5 15-3.500-6z"/><path d="M12.5 14 21 5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chevR: '<path d="m9.5 6 6 6-6 6"/>',
  chevL: '<path d="m14.5 6-6 6 6 6"/>',
  chevD: '<path d="m6 9.5 6 6 6-6"/>',
  swap: '<path d="M4 8.5h14L14.5 5M20 15.5H6L9.500 19"/>',
  wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3M4 7.500V17a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H6.500A2.500 2.500 0 0 1 4 7.500z"/><circle cx="16.2" cy="13.5" r=".7"/>',
  plan: '<rect x="4" y="4.5" width="16" height="4.5" rx="1.5"/><rect x="4" y="11" width="16" height="4.5" rx="1.5"/><path d="M4 19.5h10"/>',
  check: '<path d="m5 12.5 4.500 4.500L19 7.500"/>',
  del: '<path d="M9 6h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5.500-6zM12 9.500l5 5M17 9.500l-5 5"/>',
  cal: '<rect x="4" y="5.5" width="16" height="14" rx="2.5"/><path d="M4 10h16M8.500 3.500V7M15.500 3.500V7"/>',
  dots: '<circle cx="6" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  card: '<rect x="3.5" y="6" width="17" height="12.5" rx="2.5"/><path d="M3.5 10.5h17M7 15h3"/>',
  coins: '<ellipse cx="12" cy="7.5" rx="7" ry="3"/><path d="M5 7.5v4.5c0 1.7 3.100 3 7 3s7-1.300 7-3V7.500M5 12v4.500c0 1.700 3.100 3 7 3s7-1.300 7-3V12"/>',
  house: '<path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M9.500 20v-5.500h5V20"/>',
  chart: '<path d="M4 19.500h16M7 16v-4M12 16V7.500M17 16v-6"/>',
  cloudoff: '<path d="M7 18.500a4 4 0 0 1-.6-7.950A5.500 5.500 0 0 1 16.900 9.500 4.500 4.500 0 0 1 19 17.800M4 4l16 16"/>',
  user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 19.500c.8-3.300 3.600-5 7-5s6.200 1.700 7 5"/>',
};
export const icon = (name, size = 20, stroke = 1.7) =>
  `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;

const statusBar = `<div class="statusbar"><span>9:41</span><span class="sb-right">
  <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx=".7"/><rect x="5" y="5.5" width="3" height="6.5" rx=".7"/><rect x="10" y="3" width="3" height="9" rx=".7"/><rect x="15" y="0" width="3" height="12" rx=".7"/></svg>
  <svg width="26" height="12" viewBox="0 0 26 12" fill="none"><rect x=".5" y=".5" width="22" height="11" rx="3.2" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="19" height="8" rx="2" fill="currentColor"/><rect x="24" y="4" width="1.5" height="4" rx=".7" fill="currentColor" opacity=".4"/></svg>
</span></div>`;

/** A 390 × 844 phone. `theme` is a class the direction's CSS keys off (light | dark). */
export const phone = (theme, caption, body) => `
<figure class="shot">
  <div class="phone ${theme}">${statusBar}<div class="screen">${body}</div><div class="homebar"></div></div>
  <figcaption>${caption}</figcaption>
</figure>`;

export const page = ({ id, title, blurb, fonts, css, shots, round = 1 }) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Accrual · ${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&${fonts}&display=block" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#E9E7E2;font-family:'Geist',system-ui,sans-serif;padding:56px 64px 64px;width:max-content;color:#1b1b1a}
.board-head{margin-bottom:40px;max-width:1000px}
.board-head .kicker{font-size:13px;letter-spacing:.14em;text-transform:uppercase;opacity:.55;font-weight:500}
.board-head h1{font-size:44px;font-weight:600;letter-spacing:-.03em;margin:6px 0 10px}
.board-head p{font-size:17px;line-height:1.5;opacity:.72}
.row{display:flex;gap:48px;align-items:flex-start}
.shot figcaption{margin-top:18px;font-size:14px;font-weight:500;opacity:.6;text-align:center}
.phone{width:390px;height:844px;border-radius:54px;position:relative;overflow:hidden;box-shadow:0 0 0 10px #101010,0 0 0 11.5px #3a3a3a,0 40px 80px -20px rgba(0,0,0,.35)}
.statusbar{position:absolute;top:0;left:0;right:0;height:54px;padding:19px 34px 0 40px;display:flex;justify-content:space-between;font:600 16px/1 'Geist',system-ui;z-index:20}
.sb-right{display:flex;gap:7px;align-items:center}
.homebar{position:absolute;bottom:8px;left:50%;width:138px;height:5px;margin-left:-69px;border-radius:3px;background:currentColor;opacity:.85;z-index:30}
.screen{position:absolute;inset:0;padding-top:54px;display:flex;flex-direction:column}
.screen>*{flex-shrink:0}
.money{font-variant-numeric:tabular-nums;white-space:nowrap}
.icon{flex:none;display:block}
/* A generic Android phone: squarer corners, a punch-hole camera, a thinner gesture bar. */
.phone.android{border-radius:40px}
.phone.android .statusbar{padding:17px 26px 0 28px;font-weight:500;font-size:15px}
.phone.android:before{content:'';position:absolute;top:15px;left:50%;width:14px;height:14px;margin-left:-7px;border-radius:50%;background:#000;z-index:25}
.phone.android .homebar{width:108px;height:4px;margin-left:-54px;bottom:9px;opacity:.6}
${css}
</style></head><body id="${id}">
<header class="board-head"><div class="kicker">Accrual · design round ${round}</div><h1>${title}</h1><p>${blurb}</p></header>
<div class="row">${shots.join('')}</div>
</body></html>`;
