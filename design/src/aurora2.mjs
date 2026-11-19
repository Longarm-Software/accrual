// Aurora, round 2: the round 1 styles plus contrast-corrected colours and the components
// the remaining screens need. Shared by both round 2 boards.
import { css as round1 } from './aurora.mjs';

export const fonts = 'family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700';

export const css = `${round1}
/* Colours corrected so every text colour passes WCAG AA (4.5:1) on a tile. See contrast.mjs. */
#aurora .dark{--bg:radial-gradient(120% 60% at 0% 0%,#0F3231 0%,transparent 60%),radial-gradient(90% 50% at 100% 18%,#14254A 0%,transparent 62%),radial-gradient(100% 50% at 50% 100%,#0D2625 0%,transparent 70%),#07090C;--mute:#A9B3BF;--ok2:#5CCBF4;--over:#FF9A8D;--zero:#A2ACB8}
#aurora .light{--mute:#5A6675;--ok:#067A5B;--ok2:#0B6BA8;--need:#8F5B00;--over:#C0341F;--zero:#677381}
#aurora .tile .note{font-size:12px}
#aurora .src .d .cents,#aurora .gh2 .cents,#aurora .sub .cents{font-size:1em;opacity:1}
#aurora .tile .h span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

#aurora .hd{display:flex;align-items:center;justify-content:space-between;padding:10px 16px 0 24px}
#aurora .hd .disp{font-size:32px}
#aurora .sub{font-size:13px;color:var(--mute);font-weight:500}
#aurora .gh2{padding:18px 26px 8px;font-size:13px;font-weight:600;color:var(--mute);display:flex;justify-content:space-between}
#aurora .chip{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 9px;border-radius:99px;font-size:12px;font-weight:600;background:color-mix(in srgb,var(--c) 16%,transparent);color:var(--c)}
#aurora .chip i{width:6px;height:6px;border-radius:50%;background:var(--c)}
#aurora .li .a.in{color:var(--ok)}
#aurora .big{margin:14px 16px 0;border-radius:30px;padding:20px 22px;position:relative;overflow:hidden}
#aurora .big:before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,var(--ok),var(--ok2));opacity:.16}
#aurora .big>*{position:relative}
#aurora .big .amount{font-size:50px;line-height:1;margin:6px 0 10px}

/* Setup */
#aurora .setup{padding:34px 24px 0}
#aurora .setup .word{font-size:20px;display:flex;align-items:center;gap:9px}
#aurora .setup .word i{width:30px;height:30px;border-radius:10px;background:linear-gradient(135deg,var(--ok),var(--ok2))}
#aurora .setup h1{font-size:36px;line-height:1.05;margin:34px 0 12px}
#aurora .setup p{font-size:15.5px;line-height:1.45;color:var(--mute)}
#aurora .fld{margin:10px 16px 0;border-radius:20px;padding:12px 16px 13px;position:relative}
#aurora .fld label{display:block;font-size:12px;color:var(--mute);font-weight:500}
#aurora .fld div{font-size:16.5px;font-weight:600;margin-top:4px}
#aurora .fld .chip{position:absolute;right:14px;top:18px}
#aurora .opt{display:flex;align-items:center;gap:12px;padding:13px 0}
#aurora .opt+.opt{box-shadow:inset 0 1px 0 var(--track)}
#aurora .opt .n{font-size:15.5px;font-weight:600}#aurora .opt .d{font-size:12.5px;color:var(--mute);margin-top:2px}
#aurora .radio{margin-left:auto;width:24px;height:24px;border-radius:50%;box-shadow:inset 0 0 0 2px var(--track);display:grid;place-items:center;flex:none}
#aurora .radio.on{box-shadow:none;background:linear-gradient(135deg,var(--ok),var(--ok2));color:var(--onok)}
#aurora .bottom{position:absolute;left:16px;right:16px;bottom:34px}
#aurora .bottom .btn{flex:none;width:100%;height:56px;font-size:16px}
#aurora .bottom .fine{display:flex;align-items:center;justify-content:center;gap:7px;font-size:12.5px;color:var(--mute);margin-top:14px}

/* Register */
#aurora .strip{margin:10px 16px 0;border-radius:20px;padding:11px 12px 11px 16px;display:flex;align-items:center;gap:10px;font-size:14px;--c:var(--need);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 45%,transparent);background:color-mix(in srgb,var(--c) 12%,transparent)}
#aurora .strip b{font-weight:600}
#aurora .strip .go{margin-left:auto;padding:7px 13px;border-radius:99px;background:var(--c);color:#221400;font-weight:700;font-size:13px}
#aurora .light .strip .go{color:#fff}
#aurora .split{display:flex;gap:18px;font-size:12.5px;color:var(--mute)}
#aurora .split b{color:var(--ink);font-weight:600}
#aurora .plusfab{position:absolute;right:20px;bottom:34px;width:58px;height:58px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,var(--ok),var(--ok2));color:var(--onok);box-shadow:0 16px 30px -10px rgba(0,0,0,.6);z-index:10}

/* Sheets */
#aurora .dim{position:absolute;inset:0;padding-top:54px;display:flex;flex-direction:column;opacity:.3;filter:blur(3px)}
#aurora .dim>*{flex-shrink:0}
#aurora .sheet{position:absolute;left:0;right:0;bottom:0;border-radius:34px 34px 0 0;padding:8px 16px 34px;background:var(--sheet);box-shadow:inset 0 1px 0 var(--edge),0 -30px 60px -20px rgba(0,0,0,.7);z-index:15}
#aurora .dark{--sheet:#12171C}#aurora .light{--sheet:#FAFCFD}
#aurora .sheet h2{font-size:27px;margin:16px 8px 6px}
#aurora .sheet p{font-size:14.5px;color:var(--mute);margin:0 8px 14px;line-height:1.4}
#aurora .sheet p b{color:var(--over);font-weight:600}
#aurora .src{border-radius:20px;padding:12px 14px;margin-top:8px;display:flex;align-items:center;gap:12px}
#aurora .src.on{box-shadow:inset 0 0 0 1.5px var(--ok),0 0 24px -10px var(--ok)}
#aurora .src .n{font-size:15px;font-weight:600;display:flex;align-items:center;gap:8px}
#aurora .src .d{font-size:12.5px;color:var(--mute);margin-top:3px;font-variant-numeric:tabular-nums}
#aurora .src .d b{color:var(--ink);font-weight:600}
#aurora .src.off{opacity:.45}
#aurora .sheet .btn{flex:none;width:100%;height:56px;font-size:16px;margin-top:16px}

/* Assign */
#aurora .give{display:flex;align-items:center;gap:12px;padding:12px 0}
#aurora .give+.give{box-shadow:inset 0 1px 0 var(--track)}
#aurora .give .icon{color:var(--c)}
#aurora .give .n{font-size:15px;font-weight:600}#aurora .give .d{font-size:12.5px;color:var(--mute);margin-top:2px}
#aurora .step{margin-left:auto;height:38px;border-radius:99px;display:flex;align-items:center;gap:10px;padding:0 6px;background:var(--track);font-size:15px;font-weight:600;font-variant-numeric:tabular-nums}
#aurora .step i{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:var(--glass);box-shadow:inset 0 0 0 1px var(--edge);font-style:normal;color:var(--mute)}
#aurora .step.set{background:color-mix(in srgb,var(--ok) 18%,transparent);color:var(--ok)}
#aurora .done{display:flex;justify-content:space-between;font-size:13.5px;color:var(--mute);margin:0 8px 12px}
#aurora .done b{color:var(--ok);font-weight:600}

/* Robustness variants */
#aurora .solid .glass{backdrop-filter:none;background:var(--solid)}
#aurora .dark{--solid:#151B20}#aurora .light{--solid:#FFFFFF}
#aurora .solid .dock{backdrop-filter:none;background:var(--sheet)}
#aurora .wrap .tile .h{align-items:flex-start}
#aurora .wrap .tile .h span{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.25}
#aurora .wrap .tile .h .icon{margin-top:1px}
#aurora .wrap .tile{display:flex;flex-direction:column}
#aurora .wrap .tile .amt{margin-top:auto;padding-top:7px}
#aurora .tile .amt.long{font-size:22px}
#aurora .hero.bad:before{background:var(--over);opacity:.2}
#aurora .hero.bad .amount{color:var(--over)}
#aurora .hero.bad .assign{background:var(--over);color:#1b0704}
#aurora .stale{display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:600;padding:0 13px;height:40px;border-radius:99px;color:var(--need)}
#aurora .xl .grid{grid-template-columns:1fr}
#aurora .xl .tile{display:grid;grid-template-columns:1fr auto;column-gap:12px;padding:16px 18px}
#aurora .xl .tile .h{font-size:18px;grid-column:1}
#aurora .xl .tile .amt{font-size:32px;margin:0;grid-column:2;grid-row:1 / span 2;align-self:center}
#aurora .xl .tile .note{font-size:15.5px;margin-top:5px;grid-column:1;white-space:normal}
#aurora .xl .tile .track{grid-column:1 / -1;margin-top:13px;height:6px}
#aurora .xl .gh{font-size:17px}
#aurora .xl .month{font-size:21px}
#aurora .xl .hero .lab{font-size:17px}#aurora .xl .hero .amount{font-size:64px}
#aurora .xl .flowkey{display:none}
#aurora .xl .assign{position:static!important;display:inline-block;margin-top:16px;font-size:17px;padding:12px 22px}
#aurora .xl .alert{font-size:17px;flex-wrap:wrap}#aurora .xl .alert .go{font-size:16px;margin-left:0}
#aurora .xl .dock .t{font-size:17px}
`;
