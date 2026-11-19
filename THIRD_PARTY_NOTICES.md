# Third-party notices

Accrual is MIT licensed (see `LICENSE`). It builds on the work below.

## Actual Budget

- Source: https://github.com/actualbudget/actual (release v26.11.0)
- Used as npm dependencies, unmodified: `@actual-app/core` (the client engine, "loot-core"),
  `@actual-app/crdt`, and for development only `@actual-app/api` and `@actual-app/sync-server`.
  `@actual-app/core` is bundled into the app at build time, so its code ships inside Accrual.
- Copied into this repo: `app/engine/shims/path-join.ts`, from
  `packages/loot-core/src/platform/server/fs/path-join.ts` (itself adapted from
  [path-browserify](https://github.com/browserify/path-browserify), MIT).
- The platform shims in `app/engine/shims/` (`sqlite.ts`, `fs.ts` and others) are new code
  written against loot-core's platform interfaces, with loot-core's Electron implementations as
  the reference.

The Actual repository is MIT licensed. (The npm manifest of `@actual-app/core` says `ISC`; the
repository's licence file, reproduced here, is the MIT text.)

```
Copyright James Long

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

## QuickJS

- Source: https://github.com/bellard/quickjs (commit `e585640`, version 2026-06-04)
- Copied unmodified into `app/modules/accrual-sqlite-functions/cpp/vendor/quickjs/`:
  `libregexp`, `libunicode` and `cutils` (the regular-expression engine and Unicode tables). The
  JavaScript engine itself is not included. They are compiled into the app's SQLite extension.

```
QuickJS Javascript Engine

Copyright (c) 2017-2021 Fabrice Bellard
Copyright (c) 2017-2021 Charlie Gordon

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

## SQLite

- Source: https://sqlite.org (3.54.1)
- `sqlite3ext.h` and `sqlite3.h` are copied into
  `app/modules/accrual-sqlite-functions/cpp/vendor/sqlite/`. SQLite is in the public domain.
