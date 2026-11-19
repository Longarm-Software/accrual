// Entry point of the pre-built engine bundle (see build.mjs).
import './shims/globals';

import * as asyncStorage from './shims/async-storage';

export { init, lib } from '@actual-app/core/server/main';
// Must come after `server/main`: loot-core's modules import each other in a cycle, and
// evaluating budgetfiles/app first leaves main's `app.combine(...)` with an undefined app.
//
// Reaches into a loot-core internal on purpose. loot-core announces a loaded budget with
// `app.events.emit('load-budget')` on the budget-files app's own emitter, but `lib.on`
// listens on the main app's emitter, which never sees that event. If a new Actual version
// moves or renames this, `npm run engine:verify` fails its first-open stage check.
import { app as budgetFilesApp } from '@actual-app/core/server/budgetfiles/app';

export { load as loadGlobalStore } from './shims/async-storage';
export { defaultDocumentDir } from './shims/fs';

/** The session token loot-core holds after signing in. The app keeps it in the Keychain. */
export const getSessionToken = (): Promise<string | undefined> => asyncStorage.getItem('user-token');

/** Calls `listener` each time the engine finishes loading a budget. Returns an unsubscribe. */
export function onBudgetLoaded(listener: () => void): () => void {
  budgetFilesApp.events.on('load-budget', listener);
  return () => budgetFilesApp.events.off('load-budget', listener);
}
