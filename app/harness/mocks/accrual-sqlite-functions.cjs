// Node stand-in for the native half of modules/accrual-sqlite-functions: the
// same C extension, built for this machine by `npm run sqlfn:build`.
const fs = require('node:fs');
const path = require('node:path');

const build = path.join(__dirname, '..', '..', 'modules', 'accrual-sqlite-functions', 'build');
const lib = ['accrualsql.so', 'accrualsql.dylib'].map(f => path.join(build, f)).find(f => fs.existsSync(f));
if (!lib) throw new Error('SQL function extension not built. Run: npm run sqlfn:build');

exports.prepareSqlFunctions = () => {};
exports.installSqlFunctions = db => db.loadExtensionSync(lib, 'sqlite3_accrualsql_init');
