/**
 * Flag `Secure` du cookie `auth_token`.
 * En HTTP (ex. http://IP:3001 sans TLS), Secure=true empêche le navigateur d'enregistrer le cookie
 * → login « réussi » mais redirection immédiate vers /login.
 */
export function authCookieSecure(): boolean {
  const explicit = process.env.AUTH_COOKIE_SECURE?.trim().toLowerCase();
  if (explicit === 'true') return true;
  if (explicit === 'false') return false;

  const base = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? '').trim().toLowerCase();
  if (base.startsWith('https://')) return true;

  return false;
}
