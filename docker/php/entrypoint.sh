#!/bin/bash
set -e

echo "[*] Ejecutando script de arranque (Entrypoint)..."

# 1. Crear la estructura base de carpetas por si no existen
mkdir -p /var/www/html/storage/public/profilePictures/default
mkdir -p /var/www/html/storage/public/profilePictures/uploaded
mkdir -p /var/www/html/storage/public/templates
mkdir -p /var/www/html/storage/public/snapshots
mkdir -p /var/www/html/storage/public/snapshots_archive
mkdir -p /var/www/html/storage/private/logs/app
mkdir -p /var/www/html/storage/private/backups
mkdir -p /var/www/html/storage/private/canvases/timelapses
mkdir -p /var/www/html/storage/private/system
mkdir -p /var/www/html/storage/private/geoip

# =================================================================
# NUEVO: CREAR EL ENLACE SIMBÓLICO EN TIEMPO DE EJECUCIÓN (RUNTIME)
# =================================================================
echo "[*] Configurando el Symlink público..."
# Borramos la carpeta/enlace si existe para evitar conflictos
rm -rf /var/www/html/public/storage
# Creamos el enlace que conecta /public/storage -> /storage/public
ln -sf /var/www/html/storage/public /var/www/html/public/storage

# 2. Transferir la propiedad absoluta a Apache/PHP (www-data)
echo "[*] Configurando propiedad (chown) a www-data..."
chown -R www-data:www-data /var/www/html/storage
# Le damos propiedad también al symlink
chown -h www-data:www-data /var/www/html/public/storage

# 3. Aplicar permisos seguros (755)
echo "[*] Aplicando permisos 755 a storage..."
chmod -R 755 /var/www/html/storage

echo "[+] Todo listo. Iniciando Apache..."

# 4. Ceder el control al comando principal del contenedor
exec "$@"