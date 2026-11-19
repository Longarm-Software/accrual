import { normalizeServerUrl } from './serverUrl';

it('adds https when no scheme is given', () => {
  expect(normalizeServerUrl('budget.example.com')).toEqual({ ok: true, url: 'https://budget.example.com' });
});
it('trims spaces and trailing slashes', () => {
  expect(normalizeServerUrl('  https://budget.example.com/  ')).toEqual({ ok: true, url: 'https://budget.example.com' });
});
it('keeps a port and a path', () => {
  expect(normalizeServerUrl('https://example.com:8443/actual/')).toEqual({ ok: true, url: 'https://example.com:8443/actual' });
});
it('refuses plain http unless allowed', () => {
  expect(normalizeServerUrl('http://192.168.1.20:5006')).toEqual({ ok: false, reason: 'insecure' });
  expect(normalizeServerUrl('http://192.168.1.20:5006', { allowInsecure: true })).toEqual({ ok: true, url: 'http://192.168.1.20:5006' });
});
it('refuses empty and malformed input', () => {
  expect(normalizeServerUrl('   ')).toEqual({ ok: false, reason: 'empty' });
  expect(normalizeServerUrl('ftp://example.com')).toEqual({ ok: false, reason: 'invalid' });
  expect(normalizeServerUrl('https://')).toEqual({ ok: false, reason: 'invalid' });
});
