#import "AccrualSqlInstall.h"

#import <Foundation/Foundation.h>

// On iOS the extension is linked statically into the app next to ExpoSQLite,
// whose SQLite build exports its API with an `exsqlite3_` prefix. Registering
// as an automatic extension avoids dlopen/dlsym, which do not survive symbol
// stripping in release builds.
extern int exsqlite3_auto_extension(void (*xEntryPoint)(void));
extern int sqlite3_accrualsql_init(void *db, char **pzErrMsg, const void *pApi);

int AccrualSqlInstall(void) {
  static int result;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    result = exsqlite3_auto_extension((void (*)(void))sqlite3_accrualsql_init);
  });
  return result;
}
