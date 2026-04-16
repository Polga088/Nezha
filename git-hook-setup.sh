#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  Nezha Medical — Git Hook Setup & Récapitulatif
#  Exécuter UNE FOIS manuellement : bash git-hook-setup.sh
#  Cela installera le hook pre-commit ET affichera l'état Git.
# ═══════════════════════════════════════════════════════════════

echo ""
echo "┌─────────────────────────────────────────────────────────┐"
echo "│    🏥 NEZHA MEDICAL — Récapitulatif Git                 │"
echo "└─────────────────────────────────────────────────────────┘"
echo ""

# ── 1. BRANCHE ACTUELLE ────────────────────────────────────────
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "non-initialisé")
echo "🌿 Branche active : $BRANCH"
echo ""

# ── 2. DERNIER MESSAGE DE COMMIT ──────────────────────────────
LAST_COMMIT=$(git log -1 --pretty=format:"%h — %s (%cr)" 2>/dev/null || echo "Aucun commit")
echo "💬 Dernier commit : $LAST_COMMIT"
echo ""

# ── 3. 5 DERNIERS FICHIERS MODIFIÉS ───────────────────────────
echo "📁 5 derniers fichiers modifiés :"
echo "──────────────────────────────────"
git log --pretty=format: --name-only -10 2>/dev/null \
  | grep -v '^$' \
  | sort -u \
  | head -5 \
  | while IFS= read -r file; do
      echo "  · $file"
    done
echo ""

# ── 4. STATUT DES FICHIERS NON COMMITÉS ───────────────────────
UNSTAGED=$(git status --porcelain 2>/dev/null)
if [ -n "$UNSTAGED" ]; then
  echo "⚠️  Fichiers non commités (dirty) :"
  echo "$UNSTAGED" | while IFS= read -r line; do
    echo "  $line"
  done
else
  echo "✅ Working tree propre — rien à commiter."
fi
echo ""

# ── 5. INSTALLATION DU HOOK PRE-COMMIT ────────────────────────
HOOK_PATH=".git/hooks/pre-commit"

cat > "$HOOK_PATH" << 'HOOK_SCRIPT'
#!/bin/sh
# Nezha Medical — Pre-Commit Hook Auto-installé
echo ""
echo "┌─────────────────────────────────────────────────┐"
echo "│   🏥 NEZHA — Vérification Pre-Commit            │"
echo "└─────────────────────────────────────────────────┘"

STAGED=$(git diff --cached --name-only)
if [ -z "$STAGED" ]; then
  echo "⚠️  Aucun fichier stagé."; exit 0
fi

echo "📦 Fichiers dans ce commit :"
git diff --cached --name-status | while IFS= read -r line; do
  STATUS=$(echo "$line" | cut -c1)
  FILE=$(echo "$line" | cut -c3-)
  case "$STATUS" in
    A) echo "  ✅ AJOUTÉ    : $FILE" ;;
    M) echo "  ✏️  MODIFIÉ   : $FILE" ;;
    D) echo "  ❌ SUPPRIMÉ  : $FILE" ;;
    *) echo "  🔹 $STATUS : $FILE" ;;
  esac
done

echo ""

# Alertes fichiers critiques
echo "$STAGED" | grep -q "middleware.ts" && echo "⚠️  middleware.ts modifié → Tester les 3 rôles (Admin/Doctor/Assistant)"
echo "$STAGED" | grep -q "schema.prisma" && echo "⚠️  schema.prisma modifié → Lancer 'npx prisma db push'"
echo "$STAGED" | grep -q "globals.css"   && echo "⚠️  globals.css modifié → Vérifier le rendu sur localhost:3001"
echo "$STAGED" | grep -q "layout.tsx"    && echo "⚠️  layout.tsx modifié → Vérifier l'absence de ThemeProvider"

echo ""
echo "Port dev = 3001 | DB = clinique_medicale | Seed = npx prisma db seed"
exit 0
HOOK_SCRIPT

chmod +x "$HOOK_PATH"
echo "✅ Hook pre-commit installé dans $HOOK_PATH"
echo ""

# ── 6. RAPPEL CONFIG PROJET ────────────────────────────────────
echo "════════════════════════════════════════════════════════════"
echo "📋 Config Nezha Medical :"
echo "  Port dev    : 3001  (npm run dev)"
echo "  DB          : clinique_medicale @ localhost:5432"
echo "  Comptes     : admin@clinique.com / doctor@clinique.com / staff@clinique.com"
echo "  Mot de passe: password123 (tous)"
echo "  Middleware  : Nezha/middleware.ts (racine, JAMAIS src/)"
echo "  ⚠️  PAS de ThemeProvider dans layout.tsx"
echo "════════════════════════════════════════════════════════════"
echo ""
