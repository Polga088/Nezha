#!/usr/bin/env bash
# Mise à jour Nezha sur le VPS (après git pull).
# Usage : cd /var/www/nezha/Nezha && bash deploy/rebuild-vps.sh
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Git"
git pull --ff-only

echo "==> Dépendances (dev inclus — requis pour next build)"
npm ci --include=dev

echo "==> Prisma"
npx prisma generate
npx prisma db push

echo "==> Build"
npm run build

echo "==> Redémarrage"
systemctl restart nezha
systemctl status nezha --no-pager -l | head -20

echo "OK — test : curl -I http://127.0.0.1:3001/login"
