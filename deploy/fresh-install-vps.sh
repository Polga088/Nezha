#!/usr/bin/env bash
# Installation NEUVE sur VPS (sans ancien serveur — pas de pg_dump ni uploads).
#
# Sur le VPS, après avoir poussé le code sur Git :
#   export REPO_URL="https://github.com/VOTRE_ORG/Nezha.git"
#   export DB_PASSWORD="MotDePasseFort123!"
#   export JWT_SECRET="$(openssl rand -base64 48)"
#   export APP_URL="https://votre-domaine.fr"
#   bash deploy/fresh-install-vps.sh
#
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/nezha/Nezha}"
DB_USER="${DB_USER:-nezha_user}"
DB_NAME="${DB_NAME:-nezha_db}"
DB_PASSWORD="${DB_PASSWORD:-}"
JWT_SECRET="${JWT_SECRET:-}"
APP_URL="${APP_URL:-${NEXT_PUBLIC_APP_URL:-}}"

die() { echo "Erreur: $*" >&2; exit 1; }

[[ -n "$DB_PASSWORD" ]] || die "Définissez DB_PASSWORD (mot de passe PostgreSQL)"
[[ -n "$JWT_SECRET" ]] || die "Définissez JWT_SECRET (ex: openssl rand -base64 48)"

echo "==> Paquets système"
sudo apt-get update -qq
sudo apt-get install -y curl git nginx postgresql postgresql-contrib certbot python3-certbot-nginx

echo "==> Node.js 20 LTS"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
node -v
npm -v

echo "==> Code source"
sudo mkdir -p "$(dirname "$APP_DIR")"
if [[ -n "${REPO_URL:-}" ]]; then
  if [[ -d "$APP_DIR/.git" ]]; then
    cd "$APP_DIR"
    git pull --ff-only
  else
    sudo git clone "$REPO_URL" "$APP_DIR"
    sudo chown -R "$USER":"$USER" "$APP_DIR"
    cd "$APP_DIR"
  fi
else
  [[ -d "$APP_DIR" ]] || die "Pas de REPO_URL et $APP_DIR absent — clonez le dépôt d'abord"
  cd "$APP_DIR"
fi

echo "==> PostgreSQL"
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH ENCRYPTED PASSWORD '${DB_PASSWORD}';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO ${DB_USER};" 2>/dev/null || true

echo "==> Fichier .env"
ENCODED_PASS="$(python3 -c "import urllib.parse; print(urllib.parse.quote('''${DB_PASSWORD}''', safe=''))")"
cat > .env <<EOF
DATABASE_URL="postgresql://${DB_USER}:${ENCODED_PASS}@localhost:5432/${DB_NAME}"
JWT_SECRET="${JWT_SECRET}"
NODE_ENV="production"
PORT="3001"
NEXT_PUBLIC_APP_URL="${APP_URL}"
AUTH_COOKIE_SECURE="false"
EOF
chmod 600 .env

echo "==> Dépendances + base + seed"
# NODE_ENV=production dans .env : inclure devDependencies (tailwind, autoprefixer…) pour le build
npm ci --include=dev
npx prisma generate
npx prisma db push
if ! npx prisma db seed; then
  echo "==> Seed via tsx (repli Prisma 7)"
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
  npx tsx prisma/seed.ts
fi

echo "==> Build production"
npm run build

echo "==> Dossiers uploads (écriture Node)"
mkdir -p public/uploads/patients public/uploads/expenses
chmod -R u+rwX public/uploads

echo ""
echo "=============================================="
echo "  Installation terminée — base VIDE + seed"
echo "=============================================="
echo ""
echo "Comptes de test (seed) — changez les mots de passe en prod :"
echo "  admin@clinique.com   / password123  (ADMIN)"
echo "  doctor@clinique.com  / password123  (DOCTOR)"
echo "  staff@clinique.com   / password123  (ASSISTANT)"
echo ""
echo "Suite manuelle :"
echo "  1. DNS : enregistrement A → IP de ce VPS"
echo "  2. Nginx : sudo cp deploy/nginx-nezha.conf.example /etc/nginx/sites-available/nezha"
echo "             (éditer le domaine) puis sudo ln -s ... && sudo nginx -t && sudo systemctl reload nginx"
echo "  3. SSL   : sudo certbot --nginx -d votre-domaine.fr"
echo "  4. Service : sudo cp deploy/nezha.service.example /etc/systemd/system/nezha.service"
echo "               sudo systemctl daemon-reload && sudo systemctl enable --now nezha"
echo "  5. Test  : curl -I http://127.0.0.1:3001/login"
echo ""
if [[ -z "$APP_URL" ]]; then
  echo "⚠️  APP_URL vide : ajoutez NEXT_PUBLIC_APP_URL dans .env pour les liens emails/QR."
fi
