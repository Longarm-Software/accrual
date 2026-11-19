// Differential test: every SQL function in the C extension must return exactly
// what loot-core's JavaScript implementation returns for the same input.
// Run with: npm run sqlfn:test
import fs from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';

// The real implementations, straight from the pinned @actual-app/core.
import { normalise } from '../../../node_modules/@actual-app/core/src/platform/server/sqlite/normalise';
import { regexp } from '../../../node_modules/@actual-app/core/src/platform/server/sqlite/regexp';
import { unicodeLike } from '../../../node_modules/@actual-app/core/src/platform/server/sqlite/unicodeLike';

const build = path.join(__dirname, '..', 'build');
const lib = ['accrualsql.so', 'accrualsql.dylib'].map(f => path.join(build, f)).find(f => fs.existsSync(f));
if (!lib) throw new Error('Run modules/accrual-sqlite-functions/build-host.sh first');

const db = new Database(':memory:');
db.loadExtension(lib, 'sqlite3_accrualsql_init');
const one = (sql: string) => {
  const stmt = db.prepare(sql).pluck();
  return (...args: unknown[]) => stmt.get(...args);
};
const sql = {
  lower: one('SELECT UNICODE_LOWER(?)'),
  upper: one('SELECT UNICODE_UPPER(?)'),
  normalise: one('SELECT NORMALISE(?)'),
  regexp: one('SELECT REGEXP(?, ?)'),
  like: one('SELECT UNICODE_LIKE(?, ?)'),
};
const js = {
  lower: (s: string | null) => s?.toLowerCase() ?? null,
  upper: (s: string | null) => s?.toUpperCase() ?? null,
  normalise,
  regexp,
  like: unicodeLike,
};

// Deterministic PRNG so failures reproduce.
let seed = 0x5eed;
const rand = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = <T>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

const texts: (string | null)[] = [
  null, '', ' ', 'Corner Grocer', 'ZOË’S BAKERY', 'Zoë’s Bakery', 'Émile Café', 'ÉMILE CAFÉ',
  'Straße', 'STRASSE', 'ẞ', 'ŁÓDŹ', 'Łódź', 'Smørrebrød', 'SMØRREBRØD', 'Œuvre', 'cœur',
  'ΟΔΟΣ', 'ΣΑΣ', 'Σ', 'ΑΣ.', 'ΑΣ Β', 'Σίσυφος', 'όσος', 'İstanbul', 'ISTANBUL', 'ıi', 'ǅ ǆ Ǆ', 'ﬁﬂ ﬃ',
  'ŉ', 'ǰ', 'ΐ', 'ᾈ', 'ᾳ', 'ῼ', 'K', 'Å', 'ſ', 'µ', 'Ω', 'ĳ Ĳ', 'Ça va', 'naïve', 'jalapeño', 'Ångström', 'crème brûlée',
  'Việt Nam', 'Tiếng Việt', 'São Paulo', 'Dvořák', 'Škoda', 'Ђорђе', 'МОСКВА', 'привет', 'Ελληνικά',
  '한국어', '각', 'カフェ', 'ガ', 'が', '日本語', '中文', 'עברית', 'العربية', 'مَرْحَبًا', 'हिन्दी',
  'é', 'ẹ́', 'ậ', 'ṩ', 'ṩ', 'ṩ', '̈́', 'ཱི',
  '😀 pizza', '𝒜𝓁𝒾', '𐐀𐐨', '🇨🇦', 'a\nb', 'a\r\nb', 'a b', 'tab\tsep', '#trip', 'refund pending',
  '100% real', 'what?', 'back\\slash', 'a.b*c+d', '(paren) [brack] {brace}', '$5.00 ^up |pipe',
  '^', '`', '¨', '´', '·', 'ʹ', '¸', 'ー', '゙', 'ｧ', 'ﾞ', '1234', '12.50', 'ǅungla', 'Ǉ',
];
const alphabets = [
  'abcdefghijklmnopqrstuvwxyz', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '0123456789 .,-_#&\'"%?\\',
  'àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ', 'ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ', 'ĀāĂăĄąĆćĈĉĊċČčĎďĐđĒēĔĕĖėĘęĚě',
  'łŁøØßœŒſıİĳĲǅǆǄ', 'αβγδεζηθικλμνξοπρσςτυφχψωΑΒΓΔΣΩάέήίόύώ', 'абвгдежзийклмнопрстуфхцчшщъыьэюяАБВГДЁё',
  '़ְً̧̣̀́̂̃̈ͅ', 'Ḁḁẞạảấầẩẫậắằẳẵặẹẻẽếềểễệ', '가각힣각', '😀🎉𝒜𐐀𐐨',
];
for (let i = 0; i < 4000; i++) {
  let s = '';
  const len = 1 + Math.floor(rand() * 12);
  for (let j = 0; j < len; j++) s += pick(Array.from(pick(alphabets)));
  texts.push(s);
}

const regexes: (string | null)[] = [
  null, '', 'a', 'A', '^a', 'a$', '^$', '.', '.*', 'gro', '^Corner', 'Grocer$', 'caf[eé]', '\\d+', '\\D', '\\w+', '\\W',
  '\\s', '\\S+', '\\bpizza\\b', '\\Bz', '[a-z]+', '[^a-z]', '[A-Z][a-z]+ [A-Z]', '(a|b)+', '(?:ab)*c', 'a{2,3}', 'a{2,}',
  'a??', 'a+?b', '(a)\\1', '(?<x>a)\\k<x>', '(?=a)a', '(?!a).', '(?<=#)trip', '(?<!#)trip', '(?<!#)#trip([\\s#]|$)',
  '\\u00e9', '\\xe9', '\\u{1F600}', '\\cJ', '\\n', '\\t', '\\.', '\\$5', '\\^', '\\\\', '[.]', '[\\]]', '[\\d-x]', '\\p{L}',
  'é', 'É', 'ß', 'σ', 'Σ', '😀', '[😀]', '.😀', '^.$', '^..$', 'a|', '|', '(|a)', '^(?:[a-z0-9]+\\s?)+$', '\\/', '/', '-',
  // invalid patterns must match nothing
  '(', ')', '[', 'a{2', '*', '+', '?', 'a**', '(?<', '(?<x>a)(?<x>b)', '\\', '[b-a]', '(?<=a', '\\k<nope>(?<x>a)', '{', '}', ']',
  'x{1}{2}', '(?i)a', '\\u{zz}', '\\8', '\\0', '\\00', '\\1(a)', '[\\b]', '\\ca', '\\c', '\\-', '\\a', '\\e', '(?<n>.)\\k<n>',
];
const likes: (string | null)[] = [
  null, '', '%', '?', '%%', 'gro', 'GRO', '%gro%', 'corner%', '%grocer', 'c?rner', '\\%', '\\?', '\\\\', '100\\%', 'what\\?',
  'a.b', 'a*c', '(paren)', '[brack]', '{brace}', '$5', '^up', '|pipe', 'é', 'É', 'e', 'zoë', 'ZOË', 'strasse', 'straße', 'ß',
  'ss', 'σ', 'ς', 'Σ', 'k', 'K', 'ſ', 's', 'i', 'İ', 'ı', 'ǆ', 'ǅ', 'μ', 'µ', '😀', '?pizza', '😀?pizza', 'a?b', 'a%b', '\n', 'a\\',
  '\\a', 'ж', 'Ж', 'привет', 'МОСКВА', 'å', 'Å', 'ω', 'Ω', 'ö', 'viet nam', 'creme', '각', 'が', '-', '#trip', '\\\\%', 'ǰ', 'ŉ',
];

let failures = 0;
const byLabel: Record<string, number> = {};
let total = 0;
function same(label: string, args: unknown[], actual: unknown, expected: unknown) {
  total++;
  if (actual !== expected && (byLabel[label] = (byLabel[label] ?? 0) + 1) <= 12 && ++failures) {
    console.log(`MISMATCH ${label}(${args.map(a => JSON.stringify(a)).join(', ')}): sqlite=${JSON.stringify(actual)} js=${JSON.stringify(expected)}`);
  }
}

for (const t of texts) {
  same('UNICODE_LOWER', [t], sql.lower(t), js.lower(t));
  same('UNICODE_UPPER', [t], sql.upper(t), js.upper(t));
  same('NORMALISE', [t], sql.normalise(t), js.normalise(t));
}
const sample = texts.slice(0, 700);
for (const r of regexes) for (const t of sample) same('REGEXP', [r, t], sql.regexp(r, t), js.regexp(r as string, t));
for (const p of likes) {
  for (const t of sample) {
    // loot-core always passes NORMALISE(column) as the text; test raw text too.
    same('UNICODE_LIKE', [p, t], sql.like(p, t), js.like(p, t));
    const n = js.normalise(t);
    same('UNICODE_LIKE', [p, n], sql.like(p, n), js.like(p, n));
  }
}

// The same functions inside real queries, including the constant-pattern cache.
db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT)');
const insert = db.prepare('INSERT INTO t (name) VALUES (?)');
for (const t of texts.slice(0, 500)) insert.run(t);
const rows = db.prepare('SELECT name FROM t ORDER BY id').pluck().all() as (string | null)[];
for (const [query, param, predicate] of [
  ["SELECT count(*) FROM t WHERE UNICODE_LIKE('%caf%', NORMALISE(name))", [], (n: string | null) => unicodeLike('%caf%', normalise(n))],
  ['SELECT count(*) FROM t WHERE REGEXP(?, name)', ['^[A-Z]'], (n: string | null) => regexp('^[A-Z]', n)],
  ['SELECT count(*) FROM t WHERE NOT REGEXP(?, name) OR name IS NULL', ['('], (n: string | null) => !regexp('(', n) || n === null],
  ['SELECT count(*) FROM t WHERE UNICODE_LOWER(name) = ?', ['émile café'], (n: string | null) => n?.toLowerCase() === 'émile café'],
] as const) {
  same(query, [...param], db.prepare(query).pluck().get(...param), rows.filter(n => predicate(n)).length);
}

const bad = Object.values(byLabel).reduce((a, b) => a + b, 0);
console.log(`${total - bad} of ${total} comparisons identical`);
if (failures) {
  console.log('MISMATCHES by function:', byLabel);
  process.exit(1);
}
