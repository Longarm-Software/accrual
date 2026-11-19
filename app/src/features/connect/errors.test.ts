import { connectErrorMessage } from './errors';

it.each([
  ['invalid-password', 'That password is not right.'],
  ['network-failure', 'Could not reach that server. Check the address and your connection.'],
  ['token-expired', 'You have been signed out. Sign in again.'],
  ['empty', 'Enter your server’s address.'],
  ['invalid', 'That does not look like a server address.'],
  ['insecure', 'That address is not encrypted (http). Turn on “Allow plain HTTP” if this is a server on your own network.'],
  ['empty-password', 'Enter your password.'],
])('%s', (code, message) => {
  expect(connectErrorMessage(code)).toBe(message);
});

it('has a plain fallback that does not leak the code', () => {
  expect(connectErrorMessage('some-internal-slug')).toBe('Something went wrong. Try again.');
});
