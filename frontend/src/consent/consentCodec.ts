/* Pure (DOM-free) encoding and validation of the consent cookie, so it can be tested alone. */

export interface ConsentChoices {
  preferences: boolean;
  analytics: boolean;
}

export interface ConsentRecord extends ConsentChoices {
  /** Consent schema version; a record from another version is ignored and re-asked. */
  v: number;
  /** When the choice was made (ms since epoch). */
  ts: number;
}

export function encodeConsent(record: ConsentRecord): string {
  return encodeURIComponent(JSON.stringify(record));
}

/**
 * Parses a consent cookie value. The cookie is user-controlled input, so anything that isn't
 * exactly the expected shape is rejected (returns null => treated as "no choice made yet").
 */
export function decodeConsent(raw: string | null | undefined, expectedVersion: number): ConsentRecord | null {
  if (!raw) return null;
  try {
    const data: unknown = JSON.parse(decodeURIComponent(raw));
    if (typeof data !== 'object' || data === null) return null;
    const { v, preferences, analytics, ts } = data as Record<string, unknown>;
    if (v !== expectedVersion) return null;
    if (typeof preferences !== 'boolean' || typeof analytics !== 'boolean') return null;
    if (typeof ts !== 'number' || !Number.isFinite(ts)) return null;
    return { v, preferences, analytics, ts };
  } catch {
    return null;
  }
}

export function readCookie(cookieHeader: string, name: string): string | null {
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return null;
}

export function buildCookie(
  name: string,
  record: ConsentRecord,
  options: { secure: boolean; maxAgeSeconds: number },
): string {
  // First-party, sent only on same-site requests, and Secure whenever the site is on HTTPS.
  // It holds no personal data -- just the choice, its version and a timestamp.
  const attributes = ['Path=/', `Max-Age=${options.maxAgeSeconds}`, 'SameSite=Lax'];
  if (options.secure) attributes.push('Secure');
  return `${name}=${encodeConsent(record)}; ${attributes.join('; ')}`;
}
