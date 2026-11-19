// Globals loot-core expects from Node or a browser that Hermes lacks.
// Must be imported before anything from @actual-app/core.
import { Buffer } from 'buffer';
import { getRandomValues } from 'expo-crypto';

import './intl';

const g = globalThis as any;
g.Buffer ??= Buffer;
g.global ??= g;
g.process ??= {};
g.process.env ??= {};
g.crypto ??= {};
g.crypto.getRandomValues ??= getRandomValues; // uuid
