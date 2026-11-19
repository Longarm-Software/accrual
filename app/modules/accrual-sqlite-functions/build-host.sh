#!/bin/sh
# Builds the extension for the machine you are on (for tests and the Node
# harness). The phone builds are done by CMake (Android) and CocoaPods (iOS).
set -e
cd "$(dirname "$0")/cpp"
mkdir -p ../build
case "$(uname -s)" in
  Darwin) out=../build/accrualsql.dylib; flags="-dynamiclib" ;;
  *) out=../build/accrualsql.so; flags="-shared -fPIC" ;;
esac
${CC:-cc} -O2 $flags -w -o "$out" \
  accrualsql.c vendor/quickjs/libregexp.c vendor/quickjs/libunicode.c vendor/quickjs/cutils.c -lpthread
echo "built $out"
