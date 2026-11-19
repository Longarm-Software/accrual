// loot-core `#platform/server/sqlite` for React Native, on expo-sqlite's
// synchronous API. Mirrors loot-core's index.electron.ts (better-sqlite3).
import { Buffer } from 'buffer';
import { installSqlFunctions, prepareSqlFunctions } from 'accrual-sqlite-functions';
import * as SQLite from 'expo-sqlite';

type Db = SQLite.SQLiteDatabase;
type Stmt = SQLite.SQLiteStatement;
export type SqlParam = string | number | null;

function verifyParamTypes(sql: unknown, arr: unknown[]) {
  for (const val of arr) {
    if (typeof val !== 'string' && typeof val !== 'number' && val !== null) {
      throw new Error('Invalid field type ' + val + ' for sql ' + sql);
    }
  }
}

export async function init() {}
export function setWasmBinary(_binary: ArrayBuffer | Uint8Array) {}

export function prepare(db: Db, sql: string): Stmt {
  return db.prepareSync(sql);
}

export function runQuery(db: Db, sql: string | Stmt, params: SqlParam[] = [], fetchAll = false): any {
  if (params) verifyParamTypes(sql, params);

  if (typeof sql === 'string') {
    if (fetchAll) return db.getAllSync(sql, params);
    const info = db.runSync(sql, params);
    return { changes: info.changes, insertId: info.lastInsertRowId };
  }

  const result = sql.executeSync(params);
  try {
    if (fetchAll) return result.getAllSync();
    return { changes: result.changes, insertId: result.lastInsertRowId };
  } finally {
    result.resetSync();
  }
}

export function execQuery(db: Db, sql: string) {
  db.execSync(sql);
}

export type TransactionOptions = { immediate?: boolean };

// better-sqlite3's db.transaction() nests via savepoints; do the same.
const depth = new WeakMap<Db, number>();
export function transaction(db: Db, fn: () => void, { immediate = false }: TransactionOptions = {}) {
  const level = depth.get(db) ?? 0;
  const [begin, commit, rollback] =
    level === 0 && !db.isInTransactionSync()
      ? [immediate ? 'BEGIN IMMEDIATE' : 'BEGIN', 'COMMIT', 'ROLLBACK']
      : [`SAVEPOINT sp_${level}`, `RELEASE sp_${level}`, `ROLLBACK TO sp_${level}; RELEASE sp_${level}`];
  db.execSync(begin);
  depth.set(db, level + 1);
  try {
    fn();
    db.execSync(commit);
  } catch (e) {
    if (db.isInTransactionSync()) db.execSync(rollback);
    throw e;
  } finally {
    depth.set(db, level);
  }
}

// Same (deliberately loose) semantics as loot-core's electron backend.
let transactionDepth = 0;
export async function asyncTransaction(db: Db, fn: () => Promise<void>) {
  if (transactionDepth === 0) db.execSync('BEGIN TRANSACTION');
  transactionDepth++;
  try {
    await fn();
  } finally {
    transactionDepth--;
    if (transactionDepth === 0) db.execSync('COMMIT');
  }
}

// loot-core registers five JavaScript SQL functions on every connection
// (UNICODE_LOWER, UNICODE_UPPER, UNICODE_LIKE, REGEXP, NORMALISE). expo-sqlite
// cannot register JavaScript functions, so a native SQLite extension provides
// them instead (modules/accrual-sqlite-functions).
function open(pathOrBuffer: string | Uint8Array): Db {
  if (typeof pathOrBuffer !== 'string') {
    return SQLite.deserializeDatabaseSync(new Uint8Array(pathOrBuffer));
  }
  const slash = pathOrBuffer.lastIndexOf('/');
  if (slash === -1) return SQLite.openDatabaseSync(pathOrBuffer, { useNewConnection: true });
  return SQLite.openDatabaseSync(
    pathOrBuffer.slice(slash + 1),
    { useNewConnection: true },
    pathOrBuffer.slice(0, slash),
  );
}

export function openDatabase(pathOrBuffer: string | Uint8Array): Db {
  prepareSqlFunctions();
  const db = open(pathOrBuffer);
  installSqlFunctions(db);
  return db;
}

export function closeDatabase(db: Db) {
  db.closeSync();
}

export async function exportDatabase(db: Db) {
  return Buffer.from(db.serializeSync());
}
