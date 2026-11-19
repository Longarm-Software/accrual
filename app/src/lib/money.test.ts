import { formatMoney, formatWholeMoney, splitMoney } from './money';

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

describe('formatWholeMoney', () => {
  it('rounds to the nearest dollar', () => {
    expect(formatWholeMoney(1730)).toBe('$17');
    expect(formatWholeMoney(1790)).toBe('$18');
  });
  it('rounds halves away from zero', () => {
    expect(formatWholeMoney(150)).toBe('$2');
    expect(formatWholeMoney(-150)).toBe('−$2');
  });
  it('uses the real minus sign', () => {
    expect(formatWholeMoney(-2810)).toBe('−$28');
  });
  it('groups thousands', () => {
    expect(formatWholeMoney(1000000)).toBe('$10,000');
    expect(formatWholeMoney(-120455)).toBe('−$1,205');
  });
  it('shows no sign when a negative rounds to zero', () => {
    expect(formatWholeMoney(-30)).toBe('$0');
    expect(formatWholeMoney(0)).toBe('$0');
  });
});
