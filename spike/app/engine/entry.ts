// Entry point of the pre-built engine bundle (see build.mjs).
import './shims/globals';

export { init, lib } from '@actual-app/core/server/main';
export { load as loadGlobalStore } from './shims/async-storage';
export { defaultDocumentDir } from './shims/fs';
