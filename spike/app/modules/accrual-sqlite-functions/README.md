# accrual-sqlite-functions

A native SQLite extension with the five SQL functions that Actual's engine (loot-core) normally
registers from JavaScript, which expo-sqlite cannot do:

| Function | JavaScript it must match |
|---|---|
| `UNICODE_LOWER(text)` | `text.toLowerCase()` |
| `UNICODE_UPPER(text)` | `text.toUpperCase()` |
| `UNICODE_LIKE(pattern, text)` | loot-core's `unicodeLike`: `%` and `?` wildcards, case-insensitive |
| `REGEXP(pattern, text)` | `new RegExp(pattern).test(text)`; an invalid pattern matches nothing |
| `NORMALISE(text)` | loot-core's `getNormalisedString`: lower case, accents stripped |

Without them, transaction search, "contains" and "matches" rule conditions, and case-insensitive
payee lookup do not work.

## How it works

`cpp/accrualsql.c` is about 400 lines of C. To behave exactly like JavaScript it uses the regular
expression engine and Unicode tables from [QuickJS](https://github.com/bellard/quickjs)
(`cpp/vendor/quickjs`, MIT, unmodified). The JavaScript engine itself is not included. The
compiled extension is about 130 KB.

| Platform | Build | How the functions reach a connection |
|---|---|---|
| Android | CMake builds `libaccrualsql.so` (`android/`) | `db.loadExtensionSync('libaccrualsql.so', …)` on each connection |
| iOS | CocoaPods compiles it into the app (`AccrualSqliteFunctions.podspec`) | Registered once as an SQLite automatic extension with ExpoSQLite's SQLite build |
| Tests | `build-host.sh` builds it for your machine | Loaded with better-sqlite3 |

From JavaScript, call `installSqlFunctions(db)` on every newly opened connection
(`engine/shims/sqlite.ts` does this).

## Status

- **Tested on Linux:** the differential test compares 183,819 inputs against loot-core's own
  JavaScript functions, and the engine harness checks search and payee matching against
  `@actual-app/api`. Both pass.
- **Not yet built for iOS or Android.** The pod, Gradle and CMake files and the Swift and Kotlin
  modules are written and found by Expo autolinking, but have not been compiled. Expect to fix
  small things on the first `npx expo run:ios` / `run:android`.

## Test

```sh
npm run sqlfn:build   # builds build/accrualsql.so (or .dylib on macOS)
npm run sqlfn:test    # differential test against loot-core's JavaScript
```

## Things to know

- Unicode data comes from QuickJS's tables. If a future Unicode version changes a case mapping
  or the Diacritic property, results could differ from a browser's for the affected characters
  until the vendored copy is updated. The differential test catches this.
- A regular expression that backtracks catastrophically blocks the thread, as it does in
  Actual's own apps. There is no timeout.
- On iOS it relies on ExpoSQLite exporting `exsqlite3_auto_extension`, and on both being linked
  statically into the app. If a future expo-sqlite changes that, the app fails to link (a build
  error, not a runtime surprise).
