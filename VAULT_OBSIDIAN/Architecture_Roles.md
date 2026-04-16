# Architecture des Rôles — Nezha Medical

## Rôles Disponibles (Enum Prisma)

```prisma
enum Role {
  ADMIN
  DOCTOR
  ASSISTANT
}
```

---

## Matrice des Permissions

| Route | ADMIN | DOCTOR | ASSISTANT |
|---|---|---|---|
| `/dashboard/admin` | ✅ Autorisé | ❌ Bloqué → son dashboard | ❌ Bloqué → son dashboard |
| `/dashboard/doctor` | ❌ Bloqué → son dashboard | ✅ Autorisé | ❌ Bloqué → son dashboard |
| `/dashboard/assistant` | ❌ Bloqué → son dashboard | ❌ Bloqué → son dashboard | ✅ Autorisé |
| `/dashboard/agenda` | ✅ Partagé | ✅ Partagé | ✅ Partagé |
| `/dashboard/patients` | ✅ Partagé | ✅ Partagé | ✅ Partagé |
| `/login` | Redirigé si connecté | Redirigé si connecté | Redirigé si connecté |

---

## Flux de Connexion

```
POST /api/auth/login
  → bcrypt.compare(password, user.password_hash)
  → signJwt({ id, email, role, nom })
  → Cookie httpOnly "auth_token" (1 jour)
  → Redirect:
      ADMIN    → /dashboard/admin
      DOCTOR   → /dashboard/doctor
      ASSISTANT → /dashboard/assistant
```

---

## Middleware RBAC (`Nezha/middleware.ts`)

```
Requête arrivante
    │
    ├── pathname === '/login'
    │       └── Token valide? → Redirect vers son dashboard
    │           Sinon → next()
    │
    └── pathname.startsWith('/dashboard')
            ├── Pas de token → /login
            ├── Token invalide → /login
            ├── pathname === '/dashboard' → son dashboard
            ├── Route partagée (agenda/patients) → next()
            └── RBAC strict:
                    /dashboard/admin    + role ≠ ADMIN    → son dashboard
                    /dashboard/doctor   + role ≠ DOCTOR   → son dashboard
                    /dashboard/assistant + role ≠ ASSISTANT → son dashboard
                    Sinon → next() ✅
```

### Règle Anti-Boucle Absolue
> Un utilisateur est TOUJOURS redirigé vers **SON propre dashboard**, jamais vers un autre rôle. Cela empêche toute boucle infinie.

---

## Contenu des Dashboards par Rôle

### ADMIN `/dashboard/admin`
- **Stat Cards** : Revenus mensuels, Total patients, Uptime système
- **Navigation** : Vue d'ensemble, Paramètres, Utilisateurs
- **Accès complet** : Agenda + Dossiers patients

### DOCTOR `/dashboard/doctor`
- **Stat Cards** : RDV du jour, Nouveaux patients, Consultations terminées
- **Section Prochain Patient** : Nom, statut, boutons action
- **Aperçu Agenda** : Prochains créneaux de la journée
- **Navigation** : Ma Journée, Mon Agenda, Mes Dossiers

### ASSISTANT `/dashboard/assistant`
- **Action principale** : Bouton géant "Nouveau RDV Médical"
- **Liste patients récents** : 3 derniers dossiers créés avec avatars
- **Navigation** : Accueil Rapide, Agenda Général, Base Patients

---

## Structure du JWT

```json
{
  "id": "uuid-de-l-utilisateur",
  "email": "doctor@clinique.com",
  "role": "DOCTOR",
  "nom": "Dr. Dupont",
  "iat": 1234567890,
  "exp": 1234654290
}
```

**Expiration** : 1 jour (`maxAge: 60 * 60 * 24`)
**Algorithm** : HS256 via `jose`
**Secret** : `process.env.JWT_SECRET` (fallback dev en dur)

---

## Route `/api/auth/me`

Retourne l'utilisateur courant depuis le JWT sans requête DB :

```json
GET /api/auth/me
→ { "id": "...", "email": "...", "role": "DOCTOR", "nom": "..." }
```

Utilisé par l'Agenda pour obtenir le vrai `doctor_id` sans hardcoding.
