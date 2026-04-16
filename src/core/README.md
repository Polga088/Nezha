# `src/core` — logique métier

Ce dossier regroupe les **cas d’usage** et règles métier indépendants du transport HTTP (routes Next.js, Server Actions).

## Pourquoi

- Tests unitaires sans mock réseau complet
- Obfuscation ou packaging npm interne plus simple (un seul arbre à traiter)
- Migration future vers un worker ou microservice : déplacer `core/` + `lib/` partagés

## Structure recommandée

| Chemin | Rôle |
|--------|------|
| `core/auth/` | Authentification, contrôle d’accès applicatif |
| `core/license/` | (optionnel) Règles licence une fois extraites des routes |
| `core/<domaine>/` | Patients, rendez-vous, facturation — services et agrégats |

## Règles

- **Pas** d’import de `next/server`, `headers()`, ni JSX dans `core/`
- Dépendances autorisées : Prisma via `@/lib/prisma`, utilitaires purs, autres modules `core/`
- Les routes `app/api/*` ne font que : parser la requête, appeler `core`, formater la réponse
