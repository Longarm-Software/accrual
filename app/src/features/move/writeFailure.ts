// What a sheet says when the engine refuses a move or a cover.
import { EngineError } from '../../engine/types';

/** The budget changed after the sheet read it (another device moved money; a sync landed). */
export const STALE = 'That changed while you were here. Check the numbers and try again.';
export const WRITE_FAILED = 'Could not do that. Try again.';

/**
 * `reread`: the sheet's numbers are out of date, so it reads the plan again and keeps what was
 * chosen where it still makes sense. Any other failure leaves the numbers as they are.
 */
export function writeFailure(e: unknown): { message: string; reread: boolean } {
  if (e instanceof EngineError && e.code === 'stale') return { message: STALE, reread: true };
  return { message: WRITE_FAILED, reread: false };
}
