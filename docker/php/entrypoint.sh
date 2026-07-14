#!/bin/sh
set -e
echo "[*] Running startup script (Entrypoint)..."


mkdir -p /var/www/html/storage/private/logs/app
mkdir -p /var/www/html/storage/private/backups
mkdir -p /var/www/html/storage/private/canvases/timelapses
mkdir -p /var/www/html/storage/private/system
mkdir -p /var/www/html/storage/private/geoip

echo "[*] Configuring public Symlink..."

rm -rf /var/www/html/public/storage

ln -sf /var/www/html/storage/public /var/www/html/public/storage

echo "[*] Configuring ownership (chown) to www-data..."
chown -R www-data:www-data /var/www/html/storage

chown -h www-data:www-data /var/www/html/public/storage

echo "[*] Applying 755 permissions to storage..."
chmod -R 755 /var/www/html/storage

echo "[+] All set. Starting Apache..."

exec "$@"