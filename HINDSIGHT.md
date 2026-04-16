# HINDSIGHT.md — Retours d'Expérience
> Les leçons apprises à la dure. Lire AVANT de déboguer.

---

## 🔴 Bugs Critiques Rencontrés (et leurs solutions)

### 1. `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`
**Symptôme :** Le `fetch()` côté client reçoit du HTML au lieu de JSON.
**Causes possibles (par ordre de fréquence) :**
1. **`npx prisma generate` oublié après un reset** → `PrismaClient` non initialisé → crash Node.js → Next.js retourne une page d'erreur HTML 500
2. **ID fictif en base** : `doctor_id: 'mock-doc'` → FK violation → Next.js retourne sa page d'erreur HTML
3. Cookie expiré/absent → middleware redirige vers `/login` en HTML → le fetch reçoit une 302 en HTML
4. Route API inexistante → 404 HTML
5. Erreur serveur non catchée dans une route API

**Solution systématique après tout `migrate reset` :**
```bash
npx prisma generate  # ← NE JAMAIS OUBLIER
npx prisma db push
npx prisma db seed
```
**Guard défensif dans le login (bonne pratique) :**
```ts
const ct = res.headers.get('content-type') ?? '';
if (!ct.includes('application/json')) {
  throw new Error('Réponse invalide — exécutez `npx prisma generate`');
}
```

---

### 2. Boutons complètement inertes (aucun clic détecté)
**Symptôme :** Les `onClick` React ne réagissent pas du tout.
**Cause :** Bug d'hydratation — `ThemeProvider` de `next-themes` injecte `className="dark"` côté client alors que le serveur ne l'a pas. React détecte le mismatch et abandonne l'hydratation → aucun event handler n'est attaché.
**Solution :** Supprimer `ThemeProvider` du `layout.tsx`. Utiliser `suppressHydrationWarning` sur `<html>`.

---

### 3. Redirection "Fantôme" (Admin redirigé vers Doctor)
**Symptôme :** En tapant `/dashboard/admin`, l'URL change vers `/dashboard/doctor`.
**Cause :** Le middleware `src/middleware.ts` n'est PAS lu par Next.js 16. Seul `middleware.ts` à la racine est exécuté. Sans middleware actif, une ancienne session de `doctor` dans le cookie réoriente.
**Solution :** Copier le middleware à la racine du projet (`Nezha/middleware.ts`).

---

### 4. `Module not found: Can't resolve '@/src/lib/utils'`
**Symptôme :** Erreur de compilation au démarrage.
**Cause :** Shadcn init génère `@/src/lib/utils` dans `components.json` alors que le `tsconfig.json` mappe `@/*` → `./src/*` (donc le bon chemin est `@/lib/utils`).
**Solution :** Corriger `components.json` + patcher tous les fichiers `src/components/ui/*.tsx` avec un script node.

---

### 5. `PrismaClientInitializationError` dans le seed
**Symptôme :** `npx prisma db seed` échoue avec "PrismaClient needs to be constructed with valid options".
**Cause :** Prisma v7 requiert un `adapter` obligatoire. Faire `new PrismaClient()` sans adapter est invalide.
**Solution :** Importer l'instance configurée depuis `src/lib/prisma.ts` au lieu de créer une nouvelle instance dans `seed.ts`.

---

### 6. Cache Brave Browser / Port 3000
**Symptôme :** L'interface ne reflète pas les derniers changements CSS/JS même après rechargement.
**Cause :** Brave Browser est particulièrement agressif sur la mise en cache HTTP et Service Workers.
**Solutions :**
- Migrer le dev server sur le **port 3001** (`next dev -p 3001`) — URL propre sans historique de cache
- Utiliser `Cmd+Shift+R` (hard reload) ou ouvrir en navigation privée
- Supprimer `.next/` pour forcer la recompilation complète

---

### 7. Imports par défaut cassés sur date-fns v4
**Symptôme :** `Module has no default export` sur `format`, `parse`, etc.
**Cause :** date-fns v4 a migré vers des named exports ESM purs.
**Solution :**
```ts
// ❌
import format from 'date-fns/format'
// ✅
import { format } from 'date-fns'
import { fr } from 'date-fns/locale/fr'
```

---

## 🟡 Avertissements Non-Bloquants

| Warning | Impact | Action |
|---|---|---|
| `"middleware" file convention deprecated` | Aucun en dev | Renommer en `proxy.ts` lors de la mise en prod |
| Hydration mismatch sur extensions navigateur | Aucun | `suppressHydrationWarning` sur `<html>` |
| `date-fns` locale import lint warning | Aucun | Toléré en attendant mise à jour des types |

---

## 💡 Best Practices Validées

- **Toujours utiliser des chemins relatifs** pour les `fetch` : `/api/...` (jamais `http://localhost:3000/api/...`)
- **`window.location.href`** pour la déconnexion — bypasse React entièrement, fonctionne même si l'hydratation est cassée
- **Purger `.next/` + `node_modules/`** en cas de comportement inexplicable persistant
- **Tester systématiquement** les 3 accès après chaque modification du middleware
