cmake_minimum_required(VERSION 3.13)

project(accrualsql C)

set(CPP_DIR "${CMAKE_SOURCE_DIR}/../cpp")

# Produces libaccrualsql.so, which expo-sqlite loads by name as an SQLite
# extension. It has no JNI code and links against nothing but libc.
add_library(
  accrualsql
  SHARED
  "${CPP_DIR}/accrualsql.c"
  "${CPP_DIR}/vendor/quickjs/libregexp.c"
  "${CPP_DIR}/vendor/quickjs/libunicode.c"
  "${CPP_DIR}/vendor/quickjs/cutils.c"
)

# Only sqlite3_accrualsql_init is exported (it is marked visible in the source).
target_compile_options(accrualsql PRIVATE -fvisibility=hidden -O2 -w)
