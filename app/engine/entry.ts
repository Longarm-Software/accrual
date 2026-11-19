// Entry point of the pre-built engine bundle (see build.mjs).
import './shims/globals';

import * as asyncStorage from './shims/async-storage';

export { init, lib } from '@actual-app/core/server/main';
export { load as loadGlobalStore } from './shims/async-storage';
export { defaultDocumentDir } from './shims/fs';

/** The session token loot-core holds after signing in. The app keeps it in the Keychain. */
export const getSessionToken = (): Promise<string | undefined> => asyncStorage.getItem('user-token');
