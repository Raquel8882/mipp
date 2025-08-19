// Centralized cookie builder for session cookies
// Env vars:
// - COOKIE_DOMAIN: optional, e.g. .example.com
// - COOKIE_SAMESITE: Lax | None | Strict (default: Lax)
// - COOKIE_SECURE: 'true' | 'false' (default: true in production, false otherwise)

export function getCookieSettings() {
  const sameSite = (process.env.COOKIE_SAMESITE || 'Lax').trim();
  const domain = (process.env.COOKIE_DOMAIN || '').trim();
  const isProd = process.env.NODE_ENV === 'production';
  const secureEnv = (process.env.COOKIE_SECURE || '').toLowerCase();
  let secure = isProd;
  if (secureEnv === 'true') secure = true;
  if (secureEnv === 'false') secure = false;

  // If SameSite=None, Secure must be true for modern browsers
  const effectiveSecure = sameSite === 'None' ? true : secure;

  return { sameSite, domain, secure: effectiveSecure };
}

export function buildSessionCookie(token, maxAgeSeconds) {
  const { sameSite, domain, secure } = getCookieSettings();
  const parts = [
    `session_token=${token || ''}`,
    'Path=/',
    'HttpOnly',
    `SameSite=${sameSite}`,
    `Max-Age=${maxAgeSeconds || 0}`,
  ];
  if (secure) parts.push('Secure');
  if (domain) parts.push(`Domain=${domain}`);
  return parts.join('; ');
}

export function buildSessionClearCookie() {
  // Expire immediately
  return buildSessionCookie('', 0);
}
