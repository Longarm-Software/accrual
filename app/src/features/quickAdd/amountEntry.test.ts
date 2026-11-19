import { emptyEntry, entryCents, entryText, press, type Entry, type Key } from './amountEntry';

const e = (digits: string, decimals: string | null = null): Entry => ({ digits, decimals });
const typed = (keys: Key[]): Entry => keys.reduce(press, emptyEntry);
const digitKeys: Key[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '00'];

describe('press', () => {
  it('empty, 1 gives 1', () => expect(press(emptyEntry, '1')).toEqual(e('1')));
  it('1, 8 gives 18', () => expect(press(e('1'), '8')).toEqual(e('18')));
  it('18, . gives 18.', () => expect(press(e('18'), '.')).toEqual(e('18', '')));
  it('18., 4 gives 18.4', () => expect(press(e('18', ''), '4')).toEqual(e('18', '4')));
  it('18.4, 0 gives 18.40', () => expect(press(e('18', '4'), '0')).toEqual(e('18', '40')));
  it('18.40, any digit or 00 is unchanged (two decimals at most)', () => {
    for (const key of digitKeys) expect(press(e('18', '40'), key)).toEqual(e('18', '40'));
  });
  it('18., 00 gives 18.00', () => expect(press(e('18', ''), '00')).toEqual(e('18', '00')));
  it('18.4, 00 gives 18.40 (one place left: one zero)', () => expect(press(e('18', '4'), '00')).toEqual(e('18', '40')));
  it('18., . is unchanged', () => expect(press(e('18', ''), '.')).toEqual(e('18', '')));
  it('empty, 0 or 00 is unchanged (no leading zeros)', () => {
    expect(press(emptyEntry, '0')).toEqual(emptyEntry);
    expect(press(emptyEntry, '00')).toEqual(emptyEntry);
  });
  it('empty, . gives 0.', () => expect(press(emptyEntry, '.')).toEqual(e('0', '')));
  it('0., 5 gives 0.5', () => expect(press(e('0', ''), '5')).toEqual(e('0', '5')));
  it('18.40, back gives 18.4', () => expect(press(e('18', '40'), 'back')).toEqual(e('18', '4')));
  it('18., back gives 18', () => expect(press(e('18', ''), 'back')).toEqual(e('18')));
  it('1, back gives empty', () => expect(press(e('1'), 'back')).toEqual(emptyEntry));
  it('empty, back gives empty', () => expect(press(emptyEntry, 'back')).toEqual(emptyEntry));
  it('seven whole digits, a digit is unchanged (the most is $9,999,999.99)', () => {
    expect(press(e('9999999'), '9')).toEqual(e('9999999'));
    expect(press(e('1234567'), '0')).toEqual(e('1234567'));
  });
  it('six whole digits, 00 is unchanged (never half-apply)', () => {
    expect(press(e('123456'), '00')).toEqual(e('123456'));
  });

  // Choices the table leaves open, pinned here.
  it('0., back gives empty, not a lone 0 the person never typed', () => {
    expect(press(e('0', ''), 'back')).toEqual(emptyEntry);
  });
  it('0., 0 gives 0.0: zeros after the point are not leading zeros', () => {
    expect(press(e('0', ''), '0')).toEqual(e('0', '0'));
  });
  it('the whole-digit limit does not stop the decimals', () => {
    expect(typed(['9', '9', '9', '9', '9', '9', '9', '.', '9', '9'])).toEqual(e('9999999', '99'));
  });
  it('five whole digits, 00 gives seven', () => expect(press(e('12345'), '00')).toEqual(e('1234500')));
  it('does not change the entry it is given', () => {
    const before = e('18', '4');
    press(before, '0');
    expect(before).toEqual(e('18', '4'));
  });
});

describe('entryCents', () => {
  it('18.4 is 1840', () => expect(entryCents(e('18', '4'))).toBe(1840));
  it('18 is 1800', () => expect(entryCents(e('18'))).toBe(1800));
  it('0.5 is 50', () => expect(entryCents(e('0', '5'))).toBe(50));
  it('empty is 0', () => expect(entryCents(emptyEntry)).toBe(0));
  it('18. is 1800 and 0.05 is 5', () => {
    expect(entryCents(e('18', ''))).toBe(1800);
    expect(entryCents(e('0', '05'))).toBe(5);
  });
  it('the most is 999999999 cents, exactly', () => expect(entryCents(e('9999999', '99'))).toBe(999999999));
  it('typing .3 gives exactly 30 cents', () => expect(entryCents(typed(['.', '3']))).toBe(30));
});

describe('entryText: the amount as typed, sign first', () => {
  // [entry, income, whole, fraction, dimmed, spoken]
  it.each<[Entry, boolean, string, string, boolean, string]>([
    [emptyEntry, false, '$0', '.00', true, '$0.00'],
    [emptyEntry, true, '$0', '.00', true, '$0.00'],
    [e('18'), false, '−$18', '', false, '−$18.00'],
    [e('18', ''), false, '−$18', '.', false, '−$18.00'],
    [e('18', '4'), false, '−$18', '.4', false, '−$18.40'],
    [e('18', '40'), false, '−$18', '.40', false, '−$18.40'],
    [e('18', '4'), true, '+$18', '.4', false, '+$18.40'],
    [e('1250'), false, '−$1,250', '', false, '−$1,250.00'],
    [e('1234', '5'), false, '−$1,234', '.5', false, '−$1,234.50'],
    [e('9999999', '99'), false, '−$9,999,999', '.99', false, '−$9,999,999.99'],
    [e('0', ''), false, '−$0', '.', false, '$0.00'],
    [e('0', '5'), false, '−$0', '.5', false, '−$0.50'],
  ])('%j (income %s) draws %s%s', (entry, income, whole, fraction, dimmed, label) => {
    expect(entryText(entry, income)).toEqual({ whole, fraction, dimmed, label });
  });
  it('deleting a trailing decimal changes what is drawn', () => {
    expect(entryText(press(e('18', '40'), 'back'), false)).not.toEqual(entryText(e('18', '40'), false));
    expect(entryText(press(e('18'), '.'), false)).not.toEqual(entryText(e('18'), false));
  });
});
