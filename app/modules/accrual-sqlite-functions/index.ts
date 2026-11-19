import { requireNativeModule } from 'expo';
import type { SQLiteDatabase } from 'expo-sqlite';

const ENTRY_POINT = 'sqlite3_accrualsql_init';

type Native = {
  /**
   * Makes the functions available. Returns the library to load into each
   * connection, or '' when new connections get the functions automatically.
   */
  prepare(): string;
};

let libPath: string | undefined;

/** Call once before opening a database. */
export function prepareSqlFunctions() {
  libPath ??= requireNativeModule<Native>('AccrualSqliteFunctions').prepare();
}

/** Call on every newly opened connection. */
export function installSqlFunctions(db: SQLiteDatabase) {
  prepareSqlFunctions();
  if (libPath) db.loadExtensionSync(libPath, ENTRY_POINT);
}
