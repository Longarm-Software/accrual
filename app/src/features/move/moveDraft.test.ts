import { READY, type PlanMonth } from '../../engine/types';
import { checkMonthAndAmount, checkMove } from '../../engine/writeRules';
import { fakePlanMonth } from '../../session/fakeEngine';
import { emptyEntry, entryCents, type Entry, type Key } from '../quickAdd/amountEntry';
import { bite } from '../quickAdd/bite';
import { fitDraft, fromChoices, moveFromLink, moveView, newMove, swap, toChoices, toMove, withFrom, withKey, withTo, type MoveDraft } from './moveDraft';
import { gain } from './pots';

const plan = fakePlanMonth; // Ready to budget $312.00; Rent $0; Electricity $120; Dining out −$28.10
const e = (digits: string, decimals: string | null = null): Entry => ({ digits, decimals });
const draft = (from: string | null, to: string | null, cents: number): MoveDraft => ({
  ...newMove({ amount: cents }),
  from,
  to,
});

describe('newMove', () => {
  it('from X: to null, empty entry', () => {
    expect(newMove({ from: 'cat-groceries' })).toEqual({ from: 'cat-groceries', to: null, entry: emptyEntry, prefilled: false });
  });
  it('to READY with an amount: from null, the entry shows the amount', () => {
    const d = newMove({ to: READY, amount: 1594 });
    expect(d).toEqual({ from: null, to: READY, entry: e('15', '94'), prefilled: true });
    expect(entryCents(d.entry)).toBe(1594);
  });
  // Pinned: a pre-filled amount always shows both decimals, so it reads like any amount on the
  // screen ($15.00, not $15).
  it('whole dollars show two decimals: 1500 is 15.00', () => {
    expect(newMove({ amount: 1500 }).entry).toEqual(e('15', '00'));
  });
  it('under a dollar: 50 is 0.50, as if typed ". 5 0"', () => {
    expect(newMove({ amount: 50 }).entry).toEqual(e('0', '50'));
    expect(newMove({ amount: 5 }).entry).toEqual(e('0', '05'));
  });
  it('a large amount groups nothing and keeps every digit', () => {
    expect(newMove({ amount: 123456789 }).entry).toEqual(e('1234567', '89'));
  });
  it('no amount, zero, negative or fractional: an empty entry, not a pre-fill', () => {
    for (const amount of [undefined, 0, -100, 12.5, NaN]) {
      expect(newMove({ amount })).toMatchObject({ entry: emptyEntry, prefilled: false });
    }
  });
});

describe('withKey', () => {
  const typed = (cents: number, ...keys: Key[]) => keys.reduce(withKey, newMove({ to: READY, amount: cents }));
  it('the first digit replaces a pre-filled amount, as if the entry were empty', () => {
    expect(typed(1500, '7')).toEqual({ from: null, to: READY, entry: e('7'), prefilled: false });
  });
  it('"." replaces a pre-filled amount with "0."', () => {
    expect(typed(1500, '.').entry).toEqual(e('0', ''));
  });
  it('delete clears a pre-filled amount entirely', () => {
    expect(typed(1594, 'back')).toEqual({ from: null, to: READY, entry: emptyEntry, prefilled: false });
  });
  it('after the first key it behaves as typed', () => {
    expect(typed(1500, '7', '2').entry).toEqual(e('72'));
    expect(typed(1500, '7', '2', 'back').entry).toEqual(e('7'));
    expect(typed(1500, 'back', '4', '.', '5').entry).toEqual(e('4', '5'));
  });
  it('a key the empty entry refuses ("0", "00") leaves the pre-fill as it is', () => {
    const d = newMove({ to: READY, amount: 1500 });
    expect(withKey(d, '0')).toEqual(d);
    expect(withKey(d, '00')).toEqual(d);
  });
  it('a pre-fill longer than the keypad allows (eight whole digits) is still replaced and cleared', () => {
    const d = newMove({ to: READY, amount: 1234567899 });
    expect(d.entry).toEqual(e('12345678', '99'));
    expect(withKey(d, '5').entry).toEqual(e('5'));
    expect(withKey(d, 'back').entry).toEqual(emptyEntry);
    expect(entryCents(withKey(withKey(d, 'back'), '3').entry)).toBe(300);
  });
  it('a refused key is recognised by value, not by the empty entry\'s identity', () => {
    jest.isolateModules(() => {
      jest.doMock('../quickAdd/amountEntry', () => {
        const real = jest.requireActual('../quickAdd/amountEntry');
        return { ...real, press: (en: Entry, k: Key) => ({ ...real.press(en, k) }) }; // always a fresh object
      });
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fresh = require('./moveDraft') as typeof import('./moveDraft');
      const d = fresh.newMove({ to: READY, amount: 1500 });
      expect(fresh.withKey(d, '0')).toEqual(d);
      expect(fresh.newMove({ amount: 0 }).prefilled).toBe(false);
    });
  });
  it('a typed entry is never treated as a pre-fill', () => {
    const d = newMove({ from: READY });
    expect(withKey(withKey(d, '1'), '2').entry).toEqual(e('12'));
    expect(withKey(d, 'back')).toEqual(d);
  });
});

describe('withFrom, withTo, swap', () => {
  it('withFrom sets from', () => expect(withFrom(draft(null, READY, 0), 'cat-rent').from).toBe('cat-rent'));
  it('withFrom the current to: from becomes it, to becomes null', () => {
    expect(withFrom(draft('cat-rent', READY, 100), READY)).toMatchObject({ from: READY, to: null });
  });
  it('withTo sets to', () => expect(withTo(draft(READY, null, 0), 'cat-rent').to).toBe('cat-rent'));
  it('withTo the current from: to becomes it, from becomes null', () => {
    expect(withTo(draft(READY, 'cat-rent', 100), READY)).toMatchObject({ from: null, to: READY });
  });
  it('swap: from and to change places, the entry is kept', () => {
    const d = draft('cat-groceries', READY, 1840);
    expect(swap(d)).toEqual({ from: READY, to: 'cat-groceries', entry: d.entry, prefilled: d.prefilled });
  });
  it('swap with one side empty', () => {
    expect(swap(draft('cat-groceries', null, 0))).toMatchObject({ from: null, to: 'cat-groceries' });
  });
});

describe('moveView', () => {
  it('title: Assign when from is READY', () => {
    expect(moveView(draft(READY, 'cat-rent', 0), plan).title).toBe('Assign');
  });
  it('title: Fix overbudgeting when to is READY and the month is overbudgeted', () => {
    const over: PlanMonth = { ...plan, toBudget: -1594 };
    expect(moveView(draft('cat-groceries', READY, 1594), over).title).toBe('Fix overbudgeting');
  });
  it('title: Move money otherwise, including to READY when it is not below zero', () => {
    expect(moveView(draft('cat-groceries', 'cat-dining', 0), plan).title).toBe('Move money');
    expect(moveView(draft('cat-groceries', READY, 0), plan).title).toBe('Move money');
    expect(moveView(draft(null, null, 0), plan).title).toBe('Move money');
  });
  it('from: the name and the bite on the from pot', () => {
    const v = moveView(draft('cat-groceries', 'cat-dining', 1840), plan);
    expect(v.from).toEqual({ name: 'Groceries', bite: bite({ name: 'Groceries', balance: 20762 }, 1840) });
  });
  it('from: null name and bite when from is not set', () => {
    expect(moveView(draft(null, 'cat-dining', 1840), plan).from).toEqual({ name: null, bite: null });
  });
  it('to: the name and the gain on the to pot', () => {
    const v = moveView(draft('cat-groceries', 'cat-dining', 1840), plan);
    expect(v.to).toEqual({ name: 'Dining out', gain: gain({ id: 'cat-dining', name: 'Dining out', has: -2810 }, 1840) });
  });
  it('to: null name and gain when to is not set', () => {
    expect(moveView(draft('cat-groceries', null, 1840), plan).to).toEqual({ name: null, gain: null });
  });
  it('over: more than the from pot has', () => {
    expect(moveView(draft('cat-electricity', 'cat-dining', 12001), plan).over).toBe(true);
    expect(moveView(draft('cat-electricity', 'cat-dining', 12000), plan).over).toBe(false);
  });
  it('over: any amount from a pot at or below zero', () => {
    expect(moveView(draft('cat-rent', 'cat-dining', 1), plan).over).toBe(true);
    expect(moveView(draft('cat-dining', 'cat-rent', 1), plan).over).toBe(true);
  });
  it('over: never with no amount, and never with from not set', () => {
    expect(moveView(draft('cat-rent', 'cat-dining', 0), plan).over).toBe(false);
    expect(moveView(draft(null, 'cat-dining', 999999), plan).over).toBe(false);
  });
  it('from READY, more than Ready to budget has: over, cannot save', () => {
    const v = moveView(draft(READY, 'cat-rent', 31201), plan);
    expect(v.over).toBe(true);
    expect(v.canSave).toBe(false);
    expect(v.from.bite?.warning).toBe('That is $0.01 more than Ready to budget has');
  });
  it('canSave: from and to set and different, an amount, not over', () => {
    expect(moveView(draft(READY, 'cat-rent', 31200), plan).canSave).toBe(true);
    expect(moveView(draft('cat-groceries', READY, 1), plan).canSave).toBe(true);
  });
  it('canSave: not without from, to or an amount, nor between a pot and itself', () => {
    expect(moveView(draft(null, 'cat-rent', 100), plan).canSave).toBe(false);
    expect(moveView(draft(READY, null, 100), plan).canSave).toBe(false);
    expect(moveView(draft(READY, 'cat-rent', 0), plan).canSave).toBe(false);
    expect(moveView(draft('cat-groceries', 'cat-groceries', 100), plan).canSave).toBe(false);
  });
  it('canSave: not with a pot the plan does not have', () => {
    expect(moveView(draft('cat-nope', READY, 100), plan).canSave).toBe(false);
    expect(moveView(draft(READY, 'cat-nope', 100), plan).canSave).toBe(false);
  });
  it('whenever canSave is true, the adapter\'s own rules accept the move', () => {
    const ids = [READY, 'cat-rent', 'cat-electricity', 'cat-groceries', 'cat-dining', 'cat-emergency'];
    for (const from of ids) {
      for (const to of ids) {
        for (const cents of [1, 12000, 12001, 31200, 31201, 640000]) {
          const d = draft(from, to, cents);
          if (!moveView(d, plan).canSave) continue;
          const move = toMove(d, plan);
          expect(() => checkMonthAndAmount(move.month, move.amount, { start: '2026-01', end: '2027-12' })).not.toThrow();
          expect(() => checkMove(plan, move)).not.toThrow();
        }
      }
    }
  });
  it('button: Assign when from is READY, otherwise Move', () => {
    expect(moveView(draft(READY, 'cat-rent', 100), plan).button).toBe('Assign');
    expect(moveView(draft('cat-groceries', READY, 100), plan).button).toBe('Move');
    expect(moveView(draft(null, null, 0), plan).button).toBe('Move');
  });
});

describe('fromChoices', () => {
  it('every pot except the current to, with its amount; disabled at or below zero', () => {
    expect(fromChoices(draft(null, 'cat-groceries', 0), plan)).toEqual([
      { id: READY, name: 'Ready to budget', detail: { text: '$312.00', tone: 'mute' } },
      { id: 'cat-rent', name: 'Rent', detail: { text: '$0.00', tone: 'mute' }, disabled: true },
      { id: 'cat-electricity', name: 'Electricity', detail: { text: '$120.00', tone: 'mute' } },
      { id: 'cat-insurance', name: 'Insurance', detail: { text: '$100.00', tone: 'mute' } },
      { id: 'cat-dining', name: 'Dining out', detail: { text: '−$28.10', tone: 'over' }, disabled: true },
      { id: 'cat-emergency', name: 'Emergency fund', detail: { text: '$6,400.00', tone: 'mute' } },
    ]);
  });
  it('Ready to budget below zero is coral and disabled', () => {
    const rows = fromChoices(draft(null, null, 0), { ...plan, toBudget: -500 });
    expect(rows[0]).toEqual({ id: READY, name: 'Ready to budget', detail: { text: '−$5.00', tone: 'over' }, disabled: true });
  });
  it('a negative balance that rolls over is quiet, not coral, and still disabled', () => {
    const rolling: PlanMonth = {
      ...plan,
      groups: [{ id: 'g', name: 'G', categories: [{ ...plan.groups[1].categories[1], carryover: true }] }],
    };
    expect(fromChoices(draft(null, null, 0), rolling)[1]).toEqual({
      id: 'cat-dining', name: 'Dining out', detail: { text: '−$28.10', tone: 'mute' }, disabled: true,
    });
  });
});

describe('toChoices', () => {
  it('every pot except the current from, same detail, none disabled', () => {
    const rows = toChoices(draft(READY, null, 0), plan);
    expect(rows.map(r => r.id)).toEqual([
      'cat-rent', 'cat-electricity', 'cat-insurance', 'cat-groceries', 'cat-dining', 'cat-emergency',
    ]);
    expect(rows.every(r => r.disabled === undefined)).toBe(true);
    expect(rows[4]).toEqual({ id: 'cat-dining', name: 'Dining out', detail: { text: '−$28.10', tone: 'over' } });
  });
  it('READY is offered when from is a category', () => {
    expect(toChoices(draft('cat-groceries', null, 0), plan)[0]).toEqual({
      id: READY, name: 'Ready to budget', detail: { text: '$312.00', tone: 'mute' },
    });
  });
});

describe('toMove', () => {
  it('the request moveMoney takes, with what the sheet showed each pot having', () => {
    expect(toMove(draft(READY, 'cat-rent', 1594), plan)).toEqual({
      month: '2026-11', from: READY, to: 'cat-rent', amount: 1594, seen: { from: 31200, to: 0 },
    });
    expect(toMove(draft('cat-groceries', 'cat-dining', 100), plan).seen).toEqual({ from: 20762, to: -2810 });
  });
  it('throws when the draft cannot be saved', () => {
    expect(() => toMove(draft(null, 'cat-rent', 100), plan)).toThrow();
    expect(() => toMove(draft(READY, null, 100), plan)).toThrow();
    expect(() => toMove(draft(READY, 'cat-rent', 0), plan)).toThrow();
    expect(() => toMove(draft(READY, READY, 100), plan)).toThrow();
    expect(() => toMove(draft(READY, 'cat-rent', 100), { ...plan, month: '2026-13' })).toThrow();
    expect(() => toMove(draft('cat-nope', 'cat-rent', 100), plan)).toThrow();
  });
  it('throws for more than the from pot has: it has the plan, so it refuses an over-move itself', () => {
    expect(() => toMove(draft('cat-electricity', 'cat-rent', 12001), plan)).toThrow();
    expect(() => toMove(draft(READY, 'cat-rent', 31201), plan)).toThrow();
  });
});

describe('moveFromLink: a link, checked against the plan', () => {
  it('keeps pots the plan has, and the amount', () => {
    expect(moveFromLink({ from: READY, to: 'cat-rent', amount: 500 }, plan)).toEqual(newMove({ from: READY, to: 'cat-rent', amount: 500 }));
  });
  it('ignores a pot the plan does not have', () => {
    expect(moveFromLink({ from: 'cat-gone', to: 'cat-rent' }, plan)).toEqual(newMove({ to: 'cat-rent' }));
  });
  it('the same pot twice is kept as from only', () => {
    expect(moveFromLink({ from: 'cat-rent', to: 'cat-rent' }, plan)).toEqual(newMove({ from: 'cat-rent' }));
  });
});

describe('fitDraft: the draft against a plan read again', () => {
  it('keeps everything when both pots are still there', () => {
    const d = withKey(draft('cat-groceries', 'cat-rent', 0), '5');
    expect(fitDraft(d, plan)).toBe(d);
  });
  it('drops a pot that has gone, and keeps the rest', () => {
    const d = withKey(draft('cat-gone', 'cat-rent', 0), '5');
    expect(fitDraft(d, plan)).toEqual({ ...d, from: null });
  });
});
