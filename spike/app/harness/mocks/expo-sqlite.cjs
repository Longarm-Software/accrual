// Node stand-in for expo-sqlite's synchronous API (backed by better-sqlite3),
// limited to the surface engine/shims/sqlite.ts uses. Like expo-sqlite, it
// registers NO custom SQL functions.
const path = require('node:path');
const Database = require('better-sqlite3');

class SQLiteStatement {
  constructor(stmt) { this.stmt = stmt; }
  executeSync(params = []) {
    const stmt = this.stmt;
    if (stmt.reader) {
      const rows = stmt.all(...params);
      return { changes: 0, lastInsertRowId: 0, getAllSync: () => rows, resetSync() {} };
    }
    const info = stmt.run(...params);
    return {
      changes: info.changes, lastInsertRowId: Number(info.lastInsertRowid),
      getAllSync: () => [], resetSync() {},
    };
  }
  finalizeSync() {}
}

class SQLiteDatabase {
  constructor(db) { this.db = db; }
  getAllSync(sql, params = []) { return this.db.prepare(sql).all(...params); }
  runSync(sql, params = []) {
    const info = this.db.prepare(sql).run(...params);
    return { changes: info.changes, lastInsertRowId: Number(info.lastInsertRowid) };
  }
  execSync(sql) { this.db.exec(sql); }
  prepareSync(sql) { return new SQLiteStatement(this.db.prepare(sql)); }
  isInTransactionSync() { return this.db.inTransaction; }
  serializeSync() { return new Uint8Array(this.db.serialize()); }
  closeSync() { this.db.close(); }
}

exports.openDatabaseSync = (name, _options, directory) =>
  new SQLiteDatabase(new Database(directory ? path.join(directory, name) : name));
exports.deserializeDatabaseSync = bytes => new SQLiteDatabase(new Database(Buffer.from(bytes)));
