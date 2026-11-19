# Vendored sources

- `quickjs/`: the regular-expression and Unicode libraries from
  [QuickJS](https://github.com/bellard/quickjs) (commit `e585640`, version 2026-06-04),
  unmodified. MIT, see `quickjs/LICENSE`. Only `libregexp`, `libunicode` and `cutils` are used;
  the JavaScript engine itself is not included.
- `sqlite/`: `sqlite3ext.h` and `sqlite3.h` from the SQLite amalgamation (public domain). Headers
  only; the extension uses whichever SQLite library loads it.
