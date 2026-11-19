// Hermes on iOS has Intl.NumberFormat but not formatToParts (Hermes on Android
// does). loot-core calls it whenever a budget is opened, to read the locale's
// group and decimal separators.
//
// This fills the gap from format()'s output. It reports integer, group, decimal,
// fraction and literal parts, which is all loot-core reads. It does not tell
// apart currency, percent or sign parts: those come back as literals.
type Part = { type: string; value: string };

const proto = Intl.NumberFormat.prototype as any;
if (typeof proto.formatToParts !== 'function') {
  proto.formatToParts = function (this: Intl.NumberFormat, value: number): Part[] {
    const runs = this.format(value).match(/\p{Nd}+|\P{Nd}+/gu) ?? [];
    const isDigits = (run: string | undefined) => run !== undefined && /^\p{Nd}/u.test(run);
    const between = (i: number) => isDigits(runs[i - 1]) && isDigits(runs[i + 1]);

    // The decimal separator is the last separator between two digit runs, and
    // only if the integer part alone formats without it.
    let decimalAt = -1;
    for (let i = runs.length - 2; i > 0; i--) {
      if (!isDigits(runs[i]) && between(i)) {
        const whole = this.format(Math.trunc(value));
        if (!whole.includes(runs[i] + runs[i + 1])) decimalAt = i;
        break;
      }
    }

    return runs.map((run, i) => {
      if (isDigits(run)) return { type: decimalAt !== -1 && i > decimalAt ? 'fraction' : 'integer', value: run };
      if (i === decimalAt) return { type: 'decimal', value: run };
      if (between(i) && (decimalAt === -1 || i < decimalAt)) return { type: 'group', value: run };
      return { type: 'literal', value: run };
    });
  };
}
