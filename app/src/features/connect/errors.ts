// What to tell a person for each failure code. Never show the code, a URL or a password.
const messages: Record<string, string> = {
  'invalid-password': 'That password is not right.',
  'network-failure': 'Could not reach that server. Check the address and your connection.',
  'token-expired': 'You have been signed out. Sign in again.',
  empty: 'Enter your server’s address.',
  invalid: 'That does not look like a server address.',
  insecure: 'That address is not encrypted (http). Turn on “Allow plain HTTP” if this is a server on your own network.',
  // Refused on the phone: the engine treats an empty password as "no sign-in" and fails later, misleadingly.
  'empty-password': 'Enter your password.',
};

export const connectErrorMessage = (code: string): string => messages[code] ?? 'Something went wrong. Try again.';
