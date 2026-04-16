/**
 * Secrets JWT pour Edge (middleware) et Node — **sans** dépendances lourdes (bcrypt, etc.).
 */

const DEV_PLACEHOLDER_AUTH = 'super-secret-key-pour-le-developpement-local';
const DEV_PLACEHOLDER_LICENSE = 'super-secret-key-pour-le-developpement-local';

/**
 * `next build` s’exécute avec NODE_ENV=production sans charger forcément le .env :
 * on évite de faire échouer le typage / la collecte de données sur l’absence de secret.
 * En exécution réelle (`next start`, etc.), JWT_SECRET reste obligatoire en production.
 */
const isNpmBuildLifecycle = (): boolean =>
  process.env.npm_lifecycle_event === 'build' ||
  process.env.npm_lifecycle_event === 'postbuild';

export const getJwtSecretBytes = (): Uint8Array => {
  const raw = process.env.JWT_SECRET;
  if (raw) {
    return new TextEncoder().encode(raw);
  }
  if (process.env.NODE_ENV === 'production') {
    if (isNpmBuildLifecycle()) {
      return new TextEncoder().encode(DEV_PLACEHOLDER_AUTH);
    }
    throw new Error('JWT_SECRET doit être défini en production');
  }
  return new TextEncoder().encode(DEV_PLACEHOLDER_AUTH);
};

export const getLicenseJwtSecretBytes = (): Uint8Array => {
  const raw = process.env.LICENSE_JWT_SECRET ?? process.env.JWT_SECRET;
  if (raw) {
    return new TextEncoder().encode(raw);
  }
  if (process.env.NODE_ENV === 'production') {
    if (isNpmBuildLifecycle()) {
      return new TextEncoder().encode(DEV_PLACEHOLDER_LICENSE);
    }
    throw new Error(
      'LICENSE_JWT_SECRET ou JWT_SECRET doit être défini en production pour les jetons de licence'
    );
  }
  return new TextEncoder().encode(DEV_PLACEHOLDER_LICENSE);
};
