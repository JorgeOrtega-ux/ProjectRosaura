#!/bin/sh
set -e
echo "[*] Running startup script (Entrypoint)..."


mkdir -p /var/www/html/storage/private/logs/app
mkdir -p /var/www/html/storage/private/backups
mkdir -p /var/www/html/storage/private/system
mkdir -p /var/www/html/storage/private/geolocation

echo "[*] Configuring public Symlink..."

rm -rf /var/www/html/public/storage

ln -sf /var/www/html/storage/public /var/www/html/public/storage

echo "[*] Configuring ownership (chown) to www-data..."
chown -R www-data:www-data /var/www/html/storage

chown -h www-data:www-data /var/www/html/public/storage

echo "[*] Applying 755 permissions to storage..."
chmod -R 755 /var/www/html/storage

echo "[*] Checking and generating default avatars..."
php /var/www/html/scripts/check_and_generate_avatars.php

echo "[+] All set. Starting Apache..."

exec "$@"