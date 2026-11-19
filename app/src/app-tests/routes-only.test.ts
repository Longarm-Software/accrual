import { readdirSync } from 'fs';
import { join } from 'path';

// Expo Router turns every file under src/app into a route and bundles it for the phone.
// A test there drags the testing library (and Node's `console`) into the app bundle, and
// Metro refuses to build it. Screen tests live here, in src/app-tests, instead.
it('keeps tests out of the routes directory', () => {
  const files = readdirSync(join(__dirname, '../app'), { recursive: true }).map(String);
  expect(files.filter(f => /\.test\.[tj]sx?$/.test(f))).toEqual([]);
});
