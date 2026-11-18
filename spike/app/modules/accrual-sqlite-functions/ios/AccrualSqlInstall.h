#ifndef ACCRUAL_SQL_INSTALL_H
#define ACCRUAL_SQL_INSTALL_H

/// Registers the accrualsql functions with ExpoSQLite's SQLite so that every
/// connection opened afterwards has them. Safe to call more than once.
/// Returns an SQLite result code (0 is success).
int AccrualSqlInstall(void);

#endif
