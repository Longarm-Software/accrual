/*
 * accrualsql: a loadable SQLite extension providing the five SQL functions
 * that Actual's engine (loot-core) normally registers from JavaScript:
 *
 *   UNICODE_LOWER(text)           String.prototype.toLowerCase
 *   UNICODE_UPPER(text)           String.prototype.toUpperCase
 *   UNICODE_LIKE(pattern, text)   loot-core's LIKE with % and ? wildcards
 *   REGEXP(pattern, text)         new RegExp(pattern).test(text)
 *   NORMALISE(text)               loot-core's getNormalisedString
 *
 * Behaviour must match loot-core's JavaScript versions exactly
 * (src/platform/server/sqlite/{unicodeLike,regexp,normalise}.ts in
 * @actual-app/core), because the same budget is queried by the web and desktop
 * apps. To get JavaScript semantics in C it uses the ECMAScript regular
 * expression engine and Unicode tables from QuickJS.
 *
 * Strings are handled as UTF-16, as in JavaScript.
 */
#include <pthread.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

#include "vendor/sqlite/sqlite3ext.h"
SQLITE_EXTENSION_INIT1

#include "vendor/quickjs/cutils.h"
#include "vendor/quickjs/libregexp.h"
#include "vendor/quickjs/libunicode.h"

/* ---- Hooks libregexp expects from its host ---- */

int lre_check_stack_overflow(void *opaque, size_t alloca_size) {
  (void)opaque;
  (void)alloca_size;
  return 0;
}

int lre_check_timeout(void *opaque) {
  (void)opaque;
  return 0;
}

void *lre_realloc(void *opaque, void *ptr, size_t size) {
  (void)opaque;
  if (size == 0) {
    free(ptr);
    return NULL;
  }
  return realloc(ptr, size);
}

/* ---- UTF-16 <-> code points ---- */

typedef struct {
  uint32_t *p;
  int len;
  int cap;
} CodePoints;

static int cp_push(CodePoints *b, uint32_t c) {
  if (b->len == b->cap) {
    int cap = b->cap ? b->cap * 2 : 64;
    uint32_t *p = realloc(b->p, sizeof(uint32_t) * (size_t)cap);
    if (!p) return -1;
    b->p = p;
    b->cap = cap;
  }
  b->p[b->len++] = c;
  return 0;
}

/* Unpaired surrogates are kept as they are, as JavaScript does. */
static int cp_from_utf16(CodePoints *b, const uint16_t *s, int n) {
  for (int i = 0; i < n; i++) {
    uint32_t c = s[i];
    if (c >= 0xD800 && c < 0xDC00 && i + 1 < n && s[i + 1] >= 0xDC00 && s[i + 1] < 0xE000) {
      c = 0x10000 + ((c - 0xD800) << 10) + (s[i + 1] - 0xDC00);
      i++;
    }
    if (cp_push(b, c)) return -1;
  }
  return 0;
}

static void result_code_points(sqlite3_context *ctx, const CodePoints *b) {
  uint16_t *out = sqlite3_malloc64(sizeof(uint16_t) * (2 * (sqlite3_uint64)b->len + 1));
  if (!out) {
    sqlite3_result_error_nomem(ctx);
    return;
  }
  int n = 0;
  for (int i = 0; i < b->len; i++) {
    uint32_t c = b->p[i];
    if (c >= 0x10000) {
      c -= 0x10000;
      out[n++] = (uint16_t)(0xD800 + (c >> 10));
      out[n++] = (uint16_t)(0xDC00 + (c & 0x3FF));
    } else {
      out[n++] = (uint16_t)c;
    }
  }
  sqlite3_result_text16(ctx, out, n * 2, sqlite3_free);
}

/* ---- Case conversion ---- */

/* Unicode Final_Sigma: preceded by a cased letter and not followed by one,
   ignoring case-ignorable characters in between. */
static int is_final_sigma(const CodePoints *s, int pos) {
  int k = pos - 1;
  while (k >= 0 && lre_is_case_ignorable(s->p[k])) k--;
  if (k < 0 || !lre_is_cased(s->p[k])) return 0;
  k = pos + 1;
  while (k < s->len && lre_is_case_ignorable(s->p[k])) k++;
  return k >= s->len || !lre_is_cased(s->p[k]);
}

static int convert_case(CodePoints *dst, const CodePoints *src, int to_lower) {
  uint32_t res[LRE_CC_RES_LEN_MAX];
  for (int i = 0; i < src->len; i++) {
    uint32_t c = src->p[i];
    if (to_lower && c == 0x3A3 && is_final_sigma(src, i)) {
      if (cp_push(dst, 0x3C2)) return -1;
      continue;
    }
    int n = lre_case_conv(res, c, to_lower);
    for (int j = 0; j < n; j++) {
      if (cp_push(dst, res[j])) return -1;
    }
  }
  return 0;
}

static void case_func(sqlite3_context *ctx, int argc, sqlite3_value **argv) {
  (void)argc;
  if (sqlite3_value_type(argv[0]) == SQLITE_NULL) return; /* NULL in, NULL out */
  const uint16_t *text = sqlite3_value_text16(argv[0]);
  int len = sqlite3_value_bytes16(argv[0]) / 2;
  CodePoints src = {0}, dst = {0};
  if (cp_from_utf16(&src, text, len) ||
      convert_case(&dst, &src, sqlite3_user_data(ctx) != NULL)) {
    sqlite3_result_error_nomem(ctx);
  } else {
    result_code_points(ctx, &dst);
  }
  free(src.p);
  free(dst.p);
}

/* ---- NORMALISE ---- */

static CharRange diacritics;
static int diacritics_ok;
static pthread_once_t diacritics_once = PTHREAD_ONCE_INIT;

static void init_diacritics(void) {
  cr_init(&diacritics, NULL, lre_realloc);
  diacritics_ok = unicode_prop(&diacritics, "Diacritic") == 0;
}

/* CharRange is a sorted list of [start, end) pairs. */
static int is_diacritic(uint32_t c) {
  int lo = 0, hi = diacritics.len / 2 - 1;
  while (lo <= hi) {
    int mid = (lo + hi) / 2;
    if (c < diacritics.points[mid * 2]) hi = mid - 1;
    else if (c >= diacritics.points[mid * 2 + 1]) lo = mid + 1;
    else return 1;
  }
  return 0;
}

/* value.toLowerCase(), then ł→l ø→o ß→ss œ→oe, then NFD, then drop
   \p{Diacritic}. Empty and NULL input give NULL. */
static void normalise_func(sqlite3_context *ctx, int argc, sqlite3_value **argv) {
  (void)argc;
  if (sqlite3_value_type(argv[0]) == SQLITE_NULL) return;
  const uint16_t *text = sqlite3_value_text16(argv[0]);
  int len = sqlite3_value_bytes16(argv[0]) / 2;
  if (len == 0) return;

  CodePoints src = {0}, lower = {0}, mapped = {0}, out = {0};
  uint32_t *nfd = NULL;
  int failed = cp_from_utf16(&src, text, len) || convert_case(&lower, &src, 1);
  for (int i = 0; !failed && i < lower.len; i++) {
    switch (lower.p[i]) {
      case 0x142: failed = cp_push(&mapped, 'l'); break;
      case 0xF8: failed = cp_push(&mapped, 'o'); break;
      case 0xDF: failed = cp_push(&mapped, 's') || cp_push(&mapped, 's'); break;
      case 0x153: failed = cp_push(&mapped, 'o') || cp_push(&mapped, 'e'); break;
      default: failed = cp_push(&mapped, lower.p[i]);
    }
  }
  if (!failed) {
    int n = unicode_normalize(&nfd, mapped.p, mapped.len, UNICODE_NFD, NULL, lre_realloc);
    failed = n < 0;
    for (int i = 0; !failed && i < n; i++) {
      if (!is_diacritic(nfd[i])) failed = cp_push(&out, nfd[i]);
    }
  }
  if (failed) sqlite3_result_error_nomem(ctx);
  else result_code_points(ctx, &out);
  free(src.p);
  free(lower.p);
  free(mapped.p);
  free(out.p);
  free(nfd);
}

/* ---- Regular expressions ---- */

/* A compiled pattern. bytecode is NULL when the pattern does not compile;
   such a pattern matches nothing, as in loot-core. */
typedef struct {
  uint8_t *bytecode;
} Pattern;

static void pattern_free(void *p) {
  if (p) {
    free(((Pattern *)p)->bytecode);
    free(p);
  }
}

/* Without the `u` flag a JavaScript pattern is a sequence of UTF-16 code
   units. libregexp takes such patterns as CESU-8: each half of a surrogate
   pair encoded separately as three bytes. */
static char *utf8_to_cesu8(const char *src, size_t len, size_t *out_len) {
  char *dst = malloc(len * 3 / 2 + 1);
  if (!dst) return NULL;
  size_t n = 0;
  for (size_t i = 0; i < len;) {
    unsigned char b = (unsigned char)src[i];
    if (b >= 0xF0 && i + 3 < len) {
      uint32_t c = ((uint32_t)(b & 0x07) << 18) | ((uint32_t)(src[i + 1] & 0x3F) << 12) |
                   ((uint32_t)(src[i + 2] & 0x3F) << 6) | (uint32_t)(src[i + 3] & 0x3F);
      c -= 0x10000;
      uint32_t pair[2] = {0xD800 + (c >> 10), 0xDC00 + (c & 0x3FF)};
      for (int k = 0; k < 2; k++) {
        dst[n++] = (char)(0xE0 | (pair[k] >> 12));
        dst[n++] = (char)(0x80 | ((pair[k] >> 6) & 0x3F));
        dst[n++] = (char)(0x80 | (pair[k] & 0x3F));
      }
      i += 4;
    } else {
      dst[n++] = src[i++];
    }
  }
  dst[n] = '\0';
  *out_len = n;
  return dst;
}

static Pattern *pattern_compile(const char *source, size_t len, int flags) {
  Pattern *p = calloc(1, sizeof(Pattern));
  size_t cesu_len = 0;
  char *cesu = utf8_to_cesu8(source, len, &cesu_len);
  if (!p || !cesu) {
    free(p);
    free(cesu);
    return NULL;
  }
  char error[64];
  int bytecode_len;
  p->bytecode = lre_compile(&bytecode_len, error, sizeof(error), cesu, cesu_len, flags, NULL);
  free(cesu);
  return p;
}

/* 1 = match, 0 = no match, -1 = out of memory. Searches the whole text. */
static int pattern_test(const Pattern *p, const uint16_t *text, int len) {
  static const uint16_t empty[1] = {0};
  if (!p->bytecode) return 0;
  int alloc_count = lre_get_alloc_count(p->bytecode);
  uint8_t **capture = NULL;
  if (alloc_count > 0) {
    capture = malloc(sizeof(uint8_t *) * (size_t)alloc_count);
    if (!capture) return -1;
  }
  int ret = lre_exec(capture, p->bytecode, (const uint8_t *)(text ? text : empty), 0, len, 1, NULL);
  free(capture);
  return ret == 1 ? 1 : ret == 0 ? 0 : -1;
}

/* Patterns are usually SQL constants, so the compiled form is cached per
   statement with SQLite's auxiliary-data mechanism. */
static void run_pattern(sqlite3_context *ctx, const char *source, size_t source_len, int flags,
                        sqlite3_value *text_value) {
  Pattern *p = sqlite3_get_auxdata(ctx, 0);
  int cached = p != NULL;
  if (!p) {
    p = pattern_compile(source, source_len, flags);
    if (!p) {
      sqlite3_result_error_nomem(ctx);
      return;
    }
  }
  const uint16_t *text = NULL;
  int len = 0;
  if (sqlite3_value_type(text_value) != SQLITE_NULL) {
    text = sqlite3_value_text16(text_value);
    len = sqlite3_value_bytes16(text_value) / 2;
  }
  int ret = pattern_test(p, text, len);
  if (ret < 0) sqlite3_result_error_nomem(ctx);
  else sqlite3_result_int(ctx, ret);
  /* Hands ownership to SQLite, which may free it at once. Do it last. */
  if (!cached) sqlite3_set_auxdata(ctx, 0, p, pattern_free);
}

/* REGEXP(pattern, text): new RegExp(pattern).test(text || '') */
static void regexp_func(sqlite3_context *ctx, int argc, sqlite3_value **argv) {
  (void)argc;
  const char *source = "null"; /* new RegExp(null) is /null/ */
  size_t len = 4;
  if (sqlite3_value_type(argv[0]) != SQLITE_NULL) {
    source = (const char *)sqlite3_value_text(argv[0]);
    len = (size_t)sqlite3_value_bytes(argv[0]);
    if (!source) {
      sqlite3_result_error_nomem(ctx);
      return;
    }
  }
  run_pattern(ctx, source, len, 0, argv[1]);
}

/* UNICODE_LIKE(pattern, text): '%' is any run of characters, '?' is any one
   character, backslash escapes '%', '?' and itself. Case-insensitive and
   unanchored. NULL or empty pattern gives 0. */
static void like_func(sqlite3_context *ctx, int argc, sqlite3_value **argv) {
  (void)argc;
  if (sqlite3_get_auxdata(ctx, 0)) {
    run_pattern(ctx, NULL, 0, 0, argv[1]);
    return;
  }
  const char *pattern = (const char *)sqlite3_value_text(argv[0]);
  size_t len = pattern ? (size_t)sqlite3_value_bytes(argv[0]) : 0;
  if (len == 0) {
    sqlite3_result_int(ctx, 0);
    return;
  }
  char *regex = malloc(len * 2 + 1);
  if (!regex) {
    sqlite3_result_error_nomem(ctx);
    return;
  }
  static const char special[] = ".*+^${}()|[]\\?";
  size_t n = 0;
  for (size_t i = 0; i < len; i++) {
    char ch = pattern[i];
    if (ch == '\\' && i + 1 < len &&
        (pattern[i + 1] == '%' || pattern[i + 1] == '?' || pattern[i + 1] == '\\')) {
      ch = pattern[++i];
      if (ch != '%') regex[n++] = '\\';
      regex[n++] = ch;
    } else if (ch == '%') {
      regex[n++] = '.';
      regex[n++] = '*';
    } else if (ch == '?') {
      regex[n++] = '.';
    } else {
      if (ch != '\0' && strchr(special, ch)) regex[n++] = '\\';
      regex[n++] = ch;
    }
  }
  run_pattern(ctx, regex, n, LRE_FLAG_IGNORECASE, argv[1]);
  free(regex);
}

/* ---- Registration ---- */

#ifdef _WIN32
__declspec(dllexport)
#else
__attribute__((visibility("default"), used))
#endif
int sqlite3_accrualsql_init(sqlite3 *db, char **pzErrMsg, const sqlite3_api_routines *pApi) {
  SQLITE_EXTENSION_INIT2(pApi);
  pthread_once(&diacritics_once, init_diacritics);
  if (!diacritics_ok) {
    if (pzErrMsg) *pzErrMsg = sqlite3_mprintf("accrualsql: Unicode tables unavailable");
    return SQLITE_ERROR;
  }
  const int flags = SQLITE_UTF8 | SQLITE_DETERMINISTIC;
  int rc = sqlite3_create_function(db, "UNICODE_LOWER", 1, flags, (void *)1, case_func, 0, 0);
  if (rc == SQLITE_OK)
    rc = sqlite3_create_function(db, "UNICODE_UPPER", 1, flags, NULL, case_func, 0, 0);
  if (rc == SQLITE_OK)
    rc = sqlite3_create_function(db, "UNICODE_LIKE", 2, flags, NULL, like_func, 0, 0);
  if (rc == SQLITE_OK)
    rc = sqlite3_create_function(db, "REGEXP", 2, flags, NULL, regexp_func, 0, 0);
  if (rc == SQLITE_OK)
    rc = sqlite3_create_function(db, "NORMALISE", 1, flags, NULL, normalise_func, 0, 0);
  return rc;
}
