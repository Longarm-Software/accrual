import type { OpenStage } from '../../engine/types';

const copy: Record<OpenStage, { verb: string; detail: string }> = {
  // On a first open the engine downloads and opens in one step, so this covers both.
  downloading: { verb: 'Downloading', detail: 'This happens once on this phone. A large budget can take a few seconds.' },
  opening: { verb: 'Opening', detail: 'Reading your budget on this phone.' },
  syncing: { verb: 'Syncing', detail: 'Checking your server for changes.' },
};

/** What the opening screen says. `null` is the moment before the first step is known. */
export function stageCopy(stage: OpenStage | null, budgetName: string): { title: string; detail: string } {
  if (!stage) return { title: `Opening ${budgetName}`, detail: '' };
  return { title: `${copy[stage].verb} ${budgetName}`, detail: copy[stage].detail };
}
