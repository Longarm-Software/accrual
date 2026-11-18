const crypto = require('node:crypto');
exports.getRandomBytes = n => new Uint8Array(crypto.randomBytes(n));
exports.getRandomValues = arr => crypto.webcrypto.getRandomValues(arr);
