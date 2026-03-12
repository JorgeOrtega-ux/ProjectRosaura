<?php

require_once __DIR__ . '/../vendor/autoload.php';

// Ajusta el path a tu archivo de configuración de base de datos
require_once __DIR__ . '/../includes/config/database.php'; 

use MeiliSearch\Client;

echo "Iniciando sincronización con Meilisearch...\n";

// Configuración de Meilisearch
$host = 'http://127.0.0.1:7700';
$key = 'TU_MASTER_KEY_AQUI'; // Reemplaza con tu clave real
$client = new Client($host, $key);

// 1. Configurar índices y atributos buscables (opcional pero muy recomendado)
try {
    $client->index('videos')->updateFilterableAttributes(['visibility', 'id_user']);
    $client->index('videos')->updateSearchableAttributes(['title', 'description', 'tags']);
    
    $client->index('channels')->updateSearchableAttributes(['username', 'handle']);
} catch (Exception $e) {
    echo "Aviso: Error configurando índices (si están vacíos, es normal). Continuamos...\n";
}

// 2. Conexión a la base de datos (Usando un PDO genérico, adáptalo a la clase de tu proyecto)
try {
    $db = new PDO('mysql:host=127.0.0.1;dbname=projectrosaura_db', 'root', '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
} catch (PDOException $e) {
    die("Error de conexión a la BD: " . $e->getMessage() . "\n");
}

// 3. Sincronizar Videos Públicos
echo "Extrayendo videos...\n";
$stmt = $db->query("SELECT id_video, id_user, title, description, tags, created_at FROM videos WHERE visibility = 'public'");
$videos = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (!empty($videos)) {
    $client->index('videos')->addDocuments($videos, 'id_video');
    echo "✔️ Sincronizados " . count($videos) . " videos.\n";
} else {
    echo "ℹ️ No se encontraron videos públicos para sincronizar.\n";
}

// 4. Sincronizar Canales Activos
echo "Extrayendo canales...\n";
$stmt = $db->query("SELECT id_user, username, handle, avatar_path FROM users WHERE status = 'active'");
$channels = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (!empty($channels)) {
    $client->index('channels')->addDocuments($channels, 'id_user');
    echo "✔️ Sincronizados " . count($channels) . " canales.\n";
} else {
    echo "ℹ️ No se encontraron canales para sincronizar.\n";
}

echo "🎉 Sincronización completa.\n";