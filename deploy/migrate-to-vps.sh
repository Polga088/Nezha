#!/usr/bin/env bash
# Migration Nezha vers un nouveau VPS — à lancer sur le NOUVEAU serveur (Ubuntu/Debian).
# Sans accès à l'ancien VPS → utiliser deploy/fresh-install-vps.sh à la place.
# Usage : bash deploy/migrate-to-vps.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/nezha/Nezha}"
REPO_URL="${REPO_URL:-}" # ex. git@github.com:org/Nezha.git

echo "==> Paquets système"
sudo apt-get update
sudo apt-get install -y curl git nginx postgresql postgresql-contrib certbot python3-certbot-nginx

echo "==> Node.js 20 LTS"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "==> Dossier application"
sudo mkdir -p "$(dirname "$APP_DIR")"
if [[ -n "$REPO_URL" && ! -d "$APP_DIR/.git" ]]; then
  sudo git clone "$REPO_URL" "$APP_DIR"
fi
sudo chown -R "$USER":"$USER" "$APP_DIR" 2>/dev/null || true

if [[ ! -f "$APP_DIR/.env" ]]; then
  echo "Créez $APP_DIR/.env à partir de .env.example (DATABASE_URL, JWT_SECRET, NEXT_PUBLIC_APP_URL)"
  cp "$APP_DIR/.env.example" "$APP_DIR/.env" 2>/dev/null || true
fi

echo "==> PostgreSQL (base + utilisateur — adapter les mots de passe)"
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='nezha_user'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER nezha_user WITH ENCRYPTED PASSWORD 'CHANGEZ_MOI';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='nezha_db'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE nezha_db OWNER nezha_user;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE nezha_db TO nezha_user;"

echo "==> Build application"
cd "$APP_DIR"
npm ci
npx prisma generate
npx prisma db push
npm run build

echo "==> Dossiers uploads"
mkdir -p public/uploads/patients public/uploads/expenses

echo ""
echo "Étapes manuelles restantes :"
echo "  1. Restaurer la base depuis l'ancien VPS : pg_dump | psql"
echo "  2. rsync public/uploads depuis l'ancien VPS"
echo "  3. Copier deploy/nginx-nezha.conf.example → /etc/nginx/sites-available/nezha"
echo "  4. sudo certbot --nginx -d votre-domaine.fr"
echo "  5. Copier deploy/nezha.service.example → /etc/systemd/system/nezha.service"
echo "  6. Pointer le DNS (A) vers l'IP du nouveau VPS"
echo "  7. sudo systemctl enable --now nezha"
