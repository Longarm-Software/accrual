import { EngineError } from '../../engine/types';
import { STALE, WRITE_FAILED, writeFailure } from './writeFailure';

describe('writeFailure', () => {
  it('stale: the budget changed under the sheet, so it reads the plan again and says so', () => {
    expect(writeFailure(new EngineError('stale', 'x'))).toEqual({ message: STALE, reread: true });
    expect(STALE).toBe('That changed while you were here. Check the numbers and try again.');
  });
  it.each([new EngineError('invalid-move', 'x'), new EngineError('internal', 'x'), new Error('disk full'), 'odd'])(
    'anything else: try again, without a read (%s)',
    e => {
      expect(writeFailure(e)).toEqual({ message: WRITE_FAILED, reread: false });
      expect(WRITE_FAILED).toBe('Could not do that. Try again.');
    },
  );
});
