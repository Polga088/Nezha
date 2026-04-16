# PRIMER.md

### 1. État du Projet
Le projet est stabilisé sur une architecture **"Clean & Premium"** (Next.js 16, Shadcn UI, Prisma v7) et est opérationnel sur le **port 3001**. La base de données est propre, avec une gestion robuste des relations. Le Dossier Médical Électronique (DME) est désormais fully fully functional et connecté à l'API.

### 2. Architecture & Stack Technique
*   **Framework** : Next.js 16 (Turbopack).
*   **Design System** : Shadcn UI (New York, Slate) sans `ThemeProvider` (supprimé pour éviter les bugs d'hydratation).
*   **Authentification** : JWT avec Middleware RBAC à la racine (`/middleware.ts`).
*   **Base de données** : PostgreSQL avec Prisma 7. Client généré dans `src/generated/prisma`.
*   **Formulaires** : `react-hook-form` + `zod` (validation stricte).
*   **Standard API** : Utilisation systématique de `src/lib/patient-fields.ts` pour parser les entrées complexes (Sexe, Float) et garantir la sécurité des types.

### 3. Fonctionnalités & Corrections Clés
*   **Hydratation & UI** : Suppression du `ThemeProvider` et remplacement des boutons de déconnexion par un composant client unifié (`LogoutLink`).
*   **Middleware RBAC** : Redirection explicite par rôle (`ADMIN`, `DOCTOR`, `ASSISTANT`) avec `Cache-Control: no-store`.
*   **Formulaire Patient V2** : Nouveau composant `AddPatientForm` (4 sections : Identité, Contact, Médical, Historique) avec validation Zod, typage strict et gestion des unités (cm, kg).
*   **Vue Patient (DME)** : Refonte complète (`/dashboard/patients/[id]`) terminée avec `Tabs` Shadcn, `Card`, `Badge`, `Dialog` (Modals) au lieu du pur CSS, calcul dynamique de l'IMC et de l'âge selon la DB.
*   **Fix JSON/HTML** : Correction de l'erreur `Unexpected token '<'` via la route `/api/auth/me` et l'ajout de guards `content-type` dans les `fetch` clients.

### 4. "Cerveau du Projet" (Recall Stack)
Les fichiers suivants assurent la synchronisation :
*   `CLAUDE.md` : Règles d'or (Next.js 16, `params: Promise` obligatoire, `npx prisma generate` après reset, règles de formulaires et parsing API).
*   `PRIMER.md` : État présent, points de vigilance et liste des fichiers modifiés.
*   `HINDSIGHT.md` : Journal des bugs (notamment le conflit de migration Prisma résolu par `db push`).

### 5. Blocages / Bugs connus
*   **Next.js 16 Warning** : `"middleware" file convention is deprecated`. Le middleware fonctionne, mais une migration vers `proxy.ts` est prévue.
*   **Migration Prisma** : En cas de conflit sur base peuplée (ex: renommage de colonnes), privilégier `npx prisma db push` pour débloquer le développement.

### 6. Prochaines Étapes recommandées
1.  **DME Complété !** Le travail UI/UX et intégration de la route `/api/patients/[id]` est réalisé sur `/dashboard/patients/[id]/page.tsx`.
2.  **Développement métier** : Continuer vers la page Agenda (`/dashboard/agenda`) ou finaliser le module de Facturation complète.
3.  **Sécurité** : Finaliser la validation des inputs côté API avec Zod.
4.  **Tests** : Vérifier le flux complet : Login → Agenda → Création de RDV → Déconnexion.

---

## 🏗️ Architecture des Dashboards

```
/login
  → ADMIN    → /dashboard/admin
  → DOCTOR   → /dashboard/doctor
  → ASSISTANT → /dashboard/assistant

Partagé (tous rôles) :
  /dashboard/agenda
  /dashboard/patients
```

---

## ⚠️ Points de Vigilance Actuels

1. **Warning Next.js 16** : `"middleware" file convention is deprecated. Please use "proxy" instead.`
   → Fonctionnel, à renommer `proxy.ts` si Next.js force la transition.

2. **Prisma generate obligatoire** après tout `migrate reset` ou `npm install` :
   ```bash
   npx prisma generate
   ```
   → Désormais automatisé via `postinstall` et `build` dans `package.json`.

3. **Import client Prisma** : Utiliser `@/generated/prisma/client` (et non `@prisma/client`) depuis la session Cursor.

## 🔑 Rappel Technique Critique

> **Toutes les routes dynamiques Next.js 16 utilisent :**
> ```ts
> { params }: { params: Promise<{ id: string }> }
> // puis en début de handler :
> const { id } = await params;
> ```
> Ne jamais utiliser l'ancienne syntaxe `{ params: { id: string } }` (Next.js 14/15).

---

## 📦 Composants Shadcn Installés

`table` · `dropdown-menu` · `dialog` · `sheet` · `button` · `input` · `badge` · `card` · `sonner` · `avatar` · `select` · `label`

Chemin : `src/components/ui/`
Config : `components.json` → alias `@/lib/utils`

## 🛠️ Fichiers Clés Modifiés (Session Cursor)

| Fichier | Changement |
|---|---|
| `prisma/schema.prisma` | `output = "../src/generated/prisma"` |
| `src/lib/prisma.ts` | Import depuis `@/generated/prisma/client` |
| `package.json` | `postinstall` + `build` → `prisma generate` |
| `src/app/login/page.tsx` | Guard `content-type` avant `res.json()` |
| `src/components/auth/LogoutLink.tsx` | Composant unifié (remplace `LogoutButton`) |
| `src/app/dashboard/*/layout.tsx` | `'use client'` + `LogoutLink` |
| `src/app/api/**/[id]/route.ts` | `params: Promise<{ id: string }>` partout |
| `src/app/dashboard/agenda/page.tsx` | Plage visible (`from`/`to`) + `useMemo` |
| `src/app/dashboard/doctor/page.tsx` | Données réelles (plus de mocks) |
| `src/app/dashboard/patients/page.tsx` | Edit + Delete + types stricts |
