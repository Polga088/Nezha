# CLAUDE.md — Règles d'Or du Projet Nezha Medical
> Lire AVANT toute modification. Ces règles sont NON-NÉGOCIABLES.

---

## 🏗️ Stack Technique

| Couche | Technologie | Version |
|---|---|---|
| Framework | **Next.js** (App Router) | `16.2.2` |
| Langage | **TypeScript** | `^5` |
| Styles | **Tailwind CSS** + **Shadcn UI** | Tailwind `^3.4`, Shadcn style `New York` |
| Base de données | **PostgreSQL** via **Prisma 7** | `^7.6.0` |
| Adapter Prisma | `@prisma/adapter-pg` | requis par Prisma v7 |
| Auth | **JWT** via `jose` (Edge-compatible) | `^6` |
| Icônes | **lucide-react** | `^1.7` |
| Notifications | **Sonner** | `^2` |
| Agenda | **react-big-calendar** + dragAndDrop | `^1.19` |

---

## ⚡ Règles CRITIQUES (Ne jamais violer)

### 1. PAS de ThemeProvider
```tsx
// ❌ INTERDIT — cause un bug d'hydratation React className="dark"
<ThemeProvider attribute="class" defaultTheme="system">

// ✅ CORRECT — layout.tsx propre
<html lang="fr" suppressHydrationWarning>
  <body>{children}</body>
</html>
```
**Raison :** `next-themes` injecte `className="dark"` côté client seulement → mismatch SSR/client → React ne s'attache JAMAIS aux événements DOM → tous les boutons meurent.

### 2. Déconnexion via window.location (JAMAIS router.push)
```tsx
// ❌ INTERDIT — bloqué si hydratation cassée
router.push('/login')

// ✅ CORRECT — bypass React complet
<a href="/login" onClick={() => { document.cookie = 'auth_token=; Max-Age=0; path=/;'; }}>
  Déconnexion
</a>
```

### 3. Jamais d'ID fictifs en base
```tsx
// ❌ FATAL — PostgreSQL rejette la Foreign Key, renvoie HTML d'erreur
doctor_id: 'mock-doc'

// ✅ CORRECT — récupérer le vrai ID depuis /api/auth/me
const { id } = await fetch('/api/auth/me').then(r => r.json());
```

### 4. Routes dynamiques — `params` est une Promise (Next.js 16)
```tsx
// ❌ ANCIENNE syntaxe (Next.js 14/15) — CASSÉE en Next.js 16
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params; // ← erreur silencieuse
}

// ✅ CORRECT Next.js 16 — params est une Promise
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // ← await obligatoire
}
```
**Règle :** Toute nouvelle route dynamique `[id]` doit utiliser `params: Promise<{ id: string }>` conformément au standard Next.js 16.

### 5. Imports date-fns — named imports uniquement
```tsx
// ❌ CASSÉ sur date-fns v4
import format from 'date-fns/format'

// ✅ CORRECT
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
```

### 6. Prisma generate après tout reset
```bash
# ❌ Oublier prisma generate → import cassé → crash HTML au lieu de JSON
npx prisma migrate reset --force && npx prisma db seed

# ✅ CORRECT
npx prisma migrate reset --force && npx prisma generate && npx prisma db push && npx prisma db seed
```
**Désormais automatisé** via `postinstall` et `build` dans `package.json`.

### 7. Import Prisma Client — depuis le dossier généré
```ts
// ❌ Ancienne façon (avant output custom)
import { PrismaClient } from '@prisma/client';

// ✅ Depuis la session Cursor (output = "../src/generated/prisma")
import { PrismaClient } from '@/generated/prisma/client';
```

### 8. Middleware à la racine (pas dans src/)
```
Nezha/
  middleware.ts  ← ✅ ICI (Next.js 16 le cherche à la racine)
  src/
    middleware.ts  ← ❌ ignoré par Next.js 16
```

### 9. Formulaires — react-hook-form + Zod (Standard absolu)
```tsx
// ❌ INTERDIT — formulaire natif non validé
<form onSubmit={handleSubmit}>
  <input required value={formData.nom} />
</form>

// ✅ STANDARD — toujours react-hook-form + zod
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({ nom: z.string().min(2) });
const form = useForm({ resolver: zodResolver(schema) });
```
**Règle :** Tout formulaire de saisie (Patient, RDV, Utilisateur) doit utiliser
`react-hook-form` + `zod` pour la validation client. Cela garantit :
- Messages d'erreur en français dès la saisie
- Pas de soumission en cas de données invalides
- Typage TypeScript complet via `z.infer<typeof schema>`

### 10. Champs numériques — toujours afficher l'unité
```tsx
// ❌ Ambiguë — l'utilisateur ne sait pas si c'est cm ou mm
<Input type="number" placeholder="175" />

// ✅ CORRECT — suffix visuel avec l'unité
<div className="relative">
  <Input type="number" placeholder="175" className="pr-10" />
  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">cm</span>
</div>
```
**Règle :** Les champs numériques (Taille, Poids, Doses, etc.) doivent TOUJOURS
afficher leur unité (cm, kg, mg, mmHg…) pour éviter les erreurs de saisie médicale.

### 11. Parsing des Données Complexes (API)
```ts
// ❌ Parsing manuel risqué (peut crasher sur des chaînes vides)
const taille = Number(req.body.taille); 
const sexe = req.body.sexe as 'MASCULIN' | 'FEMININ';

// ✅ STANDARD — Helper de parsing sécurisé
import { parseOptionalFloat, parseSexe } from '@/lib/patient-fields';

const taille = parseOptionalFloat(req.body.taille);
const sexe = parseSexe(req.body.sexe);
```
**Règle :** Utiliser systématiquement `src/lib/patient-fields.ts` pour parser les entrées utilisateur complexes (Sexe, Float) dans les routes API. Le modèle Patient utilise désormais des Enums explicites pour le sexe (`MASCULIN`, `FEMININ`).

---

## 📁 Structure des Fichiers Clés

```
Nezha/
├── middleware.ts              ← RBAC (racine, pas src/)
├── proxy.ts                   ← copie de middleware.ts (Next.js 16 deprecated warning)
├── prisma.config.ts           ← Config Prisma v7 avec adapter-pg
├── prisma/schema.prisma       ← Schéma DB
├── prisma/seed.ts             ← 3 comptes (admin, doctor, staff)
└── src/
    ├── app/
    │   ├── layout.tsx         ← PAS de ThemeProvider
    │   ├── page.tsx           ← Landing page
    │   ├── login/page.tsx     ← Login Shadcn
    │   ├── api/
    │   │   ├── auth/login/    ← POST: vérifie bcrypt, signe JWT
    │   │   ├── auth/logout/   ← GET: expire cookie + redirect /login
    │   │   ├── auth/me/       ← GET: payload JWT → utilisateur courant
    │   │   ├── patients/      ← GET/POST
    │   │   └── appointments/  ← GET/POST + [id]/PUT
    │   └── dashboard/
    │       ├── admin/         ← layout.tsx + page.tsx
    │       ├── doctor/        ← layout.tsx + page.tsx
    │       ├── assistant/     ← layout.tsx + page.tsx
    │       ├── agenda/        ← page.tsx + calendar-override.css
    │       └── patients/      ← page.tsx
    ├── components/ui/         ← Composants Shadcn
    └── lib/
        ├── auth.ts            ← signJwt / verifyJwt (jose)
        ├── prisma.ts          ← PrismaClient avec adapter-pg
        └── utils.ts           ← cn() helper
```

---

## 🎨 Design System "Clinical White"

```css
--background: 210 40% 98%;   /* #f8fafc — fond SaaS slate-50 */
--card: 0 0% 100%;           /* Blanc pur pour les cartes */
--foreground: 215 28% 17%;   /* Slate 800 — texte principal */
--primary: 221.2 83.2% 53.3%; /* Bleu Azur Médical #2563EB */
--border: 214.3 31.8% 91.4%; /* Gris très clair */
```
- **Boutons primaires** : `bg-gradient-to-b from-blue-500 to-blue-600`
- **Ombres cartes** : `.shadow-premium { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05) }`
- **Police** : `Inter` (via Next.js font)

---

## 🚪 RBAC — Permissions par Rôle

| Rôle | Dashboard | Routes partagées |
|---|---|---|
| `ADMIN` | `/dashboard/admin/*` | `/dashboard/agenda`, `/dashboard/patients` |
| `DOCTOR` | `/dashboard/doctor/*` | `/dashboard/agenda`, `/dashboard/patients` |
| `ASSISTANT` | `/dashboard/assistant/*` | `/dashboard/agenda`, `/dashboard/patients` |

---

## 🌱 Seed — Comptes de Test

```
admin@clinique.com   / password123  → ADMIN
doctor@clinique.com  / password123  → DOCTOR
staff@clinique.com   / password123  → ASSISTANT
```
Commande : `npx prisma db seed`

---

## 🔧 Commandes Fréquentes

```bash
npm run dev          # Port 3001
npx prisma migrate reset --force && npx prisma db push && npx prisma db seed
rm -rf .next         # Purger le cache Turbopack
lsof -ti:3001 | xargs kill -9  # Forcer l'arrêt du serveur
```
