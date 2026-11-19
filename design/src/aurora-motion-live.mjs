// Round 3: the motion storyboards, moving. Open the built board in a browser; it is not
// exported to a PNG. Each phone steps through its four states and the CSS transitions in
// aurora-motion.mjs do the rest.
import { css as shared, interactions, meta as still } from './aurora-motion.mjs';
import { phone } from './lib.mjs';

export const meta = {
  ...still,
  title: 'Aurora · motion, live',
  blurb:
    'The two storyboards, playing in a loop at real speed. Numbers switch instead of rolling, and there are no haptics, so treat this as a sketch of the timing and not the finished feel.',
  height: 1230,
  // Hold the first and last states a little longer than the ones in between.
  script: `
    const holds = [1500, 1600, 900, 2200];
    for (const el of document.querySelectorAll('.mo')) {
      let f = 0;
      const step = () => { el.dataset.f = f; const wait = holds[f]; f = (f + 1) % 4; setTimeout(step, wait); };
      step();
    }`,
};
export const css = shared;
export const shots = interactions.map(i => phone('dark', i.title, i.make(0)));
