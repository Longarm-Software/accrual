// Lets Node load the React Native engine bundle: the four native Expo modules
// resolve to the stand-ins in ./mocks, and the Node globals that Hermes does
// not have are removed so the bundle has to bring its own (shims/globals.ts).
const Module = require('node:module');
const path = require('node:path');

const mocks = {
  'expo-sqlite': 'expo-sqlite.cjs',
  'expo-file-system': 'expo-file-system.cjs',
  'expo-crypto': 'expo-crypto.cjs',
  'expo/fetch': 'expo-fetch.cjs',
};
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request.endsWith('loot-core.rn.js')) stripNodeGlobals();
  if (mocks[request]) return path.join(__dirname, 'mocks', mocks[request]);
  return resolve.call(this, request, ...rest);
};

require('./mocks/expo-sqlite.cjs'); // load natives before stripping globals
require('./mocks/expo-crypto.cjs');
const NodeBuffer = Buffer;
function stripNodeGlobals() {
  delete globalThis.Buffer;
  delete globalThis.crypto;
  delete globalThis.setImmediate;
}
exports.usesBundledGlobals = () => typeof globalThis.Buffer === 'function' && globalThis.Buffer !== NodeBuffer;
