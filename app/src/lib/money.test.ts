import { formatMoney, splitMoney } from './money';

describe('splitMoney', () => {
  it('splits dollars and cents', () => {
    expect(splitMoney(20762)).toEqual({ sign: '', dollars: '$207', cents: '62' });
  });
  it('groups thousands', () => {
    expect(splitMoney(4825000)).toEqual({ sign: '', dollars: '$48,250', cents: '00' });
  });
  it('uses a real minus sign for negative amounts', () => {
    expect(splitMoney(-120455)).toEqual({ sign: '−', dollars: '$1,204', cents: '55' });
  });
  it('pads cents', () => {
    expect(splitMoney(5)).toEqual({ sign: '', dollars: '$0', cents: '05' });
  });
  it('treats negative zero as zero', () => {
    expect(splitMoney(-0).sign).toBe('');
  });
});

describe('formatMoney', () => {
  it('joins the parts', () => {
    expect(formatMoney(-120455)).toBe('−$1,204.55');
    expect(formatMoney(31200)).toBe('$312.00');
  });
});
