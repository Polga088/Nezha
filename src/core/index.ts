/**
 * Couche domaine / cas d’usage — code métier découplé des handlers HTTP Next.js.
 *
 * Objectifs :
 * - regrouper la logique sensible (auth, règles métier, orchestrations) hors de `app/api`
 * - faciliter tests unitaires, obfuscation ciblée, ou extraction vers un package / microservice
 *
 * Convention suggérée :
 * - `core/auth/` — authentification et sessions
 * - `core/license/` — règles licence (si extrait plus tard depuis les routes)
 * - `core/<domaine>/` — agrégats par domaine métier
 */

export {
  authenticateCredentials,
  type AuthenticateCredentialsResult,
  type AuthenticateCredentialsFailure,
  type SessionUserPayload,
} from './auth/authenticate-credentials';
