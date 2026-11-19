export type ServerUrlResult = { ok: true; url: string } | { ok: false; reason: 'empty' | 'invalid' | 'insecure' };

/**
 * Turns what someone typed into the address loot-core wants. HTTPS by default; plain HTTP
 * only when the person has turned on the "I know what I'm doing" switch (architecture.md).
 */
export function normalizeServerUrl(input: string, { allowInsecure = false } = {}): ServerUrlResult {
  const typed = input.trim();
  if (!typed) return { ok: false, reason: 'empty' };
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(typed) ? typed : `https://${typed}`;
  const match = /^(https?):\/\/([^/\s?#]+)([^\s?#]*)$/i.exec(withScheme);
  if (!match) return { ok: false, reason: 'invalid' };
  const [, scheme, host, path] = match;
  if (scheme.toLowerCase() === 'http' && !allowInsecure) return { ok: false, reason: 'insecure' };
  return { ok: true, url: `${scheme.toLowerCase()}://${host.toLowerCase()}${path.replace(/\/+$/, '')}` };
}
