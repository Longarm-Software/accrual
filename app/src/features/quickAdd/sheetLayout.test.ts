import { moreBelow, sheetDensity } from './sheetLayout';

describe('sheetDensity', () => {
  it('is compact on a 640 dp tall phone', () => expect(sheetDensity(640, 1)).toBe('compact'));
  it('is compact on a 732 dp tall phone', () => expect(sheetDensity(732, 1)).toBe('compact'));
  it('is regular on an 800 dp tall phone, where the regular sheet was seen to fit', () => expect(sheetDensity(800, 1)).toBe('regular'));
  it('is regular on a 914 dp tall phone', () => expect(sheetDensity(914, 1)).toBe('regular'));
  it('is regular on a 914 dp tall phone at text size 1.3, where the regular sheet was seen to fit', () =>
    expect(sheetDensity(914, 1.3)).toBe('regular'));
  it('larger text needs a taller screen: 800 dp at 1.3 is compact', () => expect(sheetDensity(800, 1.3)).toBe('compact'));
  it('smaller text never makes a short screen regular', () => expect(sheetDensity(640, 0.85)).toBe('compact'));
});

describe('moreBelow', () => {
  it('is false when everything fits', () => expect(moreBelow({ offset: 0, viewport: 300, content: 300 })).toBe(false));
  it('is true when the form runs past the bottom', () => expect(moreBelow({ offset: 0, viewport: 300, content: 360 })).toBe(true));
  it('is false once scrolled to the end', () => expect(moreBelow({ offset: 60, viewport: 300, content: 360 })).toBe(false));
  it('ignores a point or less left below (rounding)', () => expect(moreBelow({ offset: 59.5, viewport: 300, content: 360 })).toBe(false));
});
