<?php

require_once __DIR__ . '/../vendor/autoload.php';

use MeiliSearch\Client;
use Dotenv\Dotenv;

// Cargar variables de entorno usando Composer para no depender de valores quemados
$dotenv = Dotenv::createImmutable(dirname(__DIR__));
$dotenv->load();

echo "Iniciando sincronización con Meilisearch...\n";

// Configuración de Meilisearch extraída del .env
$host = $_ENV['MEILISEARCH_HOST'] ?? 'http://127.0.0.1:7700';
$key = $_ENV['MEILISEARCH_MASTER_KEY'] ?? ''; 
$client = new Client($host, $key);

// 1. Configurar índices y atributos buscables
try {
    $client->index('videos')->updateFilterableAttributes(['visibility', 'status', 'user_id']);
    $client->index('videos')->updateSearchableAttributes(['title', 'description']);
    
    $client->index('channels')->updateSearchableAttributes(['username', 'handle', 'description']);
} catch (Exception $e) {
    echo "Aviso: Error configurando índices (si están vacíos, es normal). Continuamos...\n";
}

// 2. Conexión a la base de datos extrayendo credenciales del .env
$dbHost = $_ENV['DB_HOST'] ?? '127.0.0.1';
$dbName = $_ENV['DB_NAME'] ?? 'projectrosaura';
$dbUser = $_ENV['DB_USER'] ?? 'root';
$dbPass = $_ENV['DB_PASS'] ?? '';

try {
    $db = new PDO("mysql:host={$dbHost};dbname={$dbName}", $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
} catch (PDOException $e) {
    die("Error de conexión a la BD: " . $e->getMessage() . "\n");
}

// 3. Sincronizar Videos Públicos
echo "Extrayendo videos...\n";
// Adaptamos los nombres de las columnas para que coincidan con bd.sql y el JS
$stmt = $db->query("
    SELECT 
        id, 
        uuid AS id_video, 
        user_id, 
        title, 
        description, 
        thumbnail_path, /* ¡Línea añadida para obtener la imagen! */
        duration,       /* Opcional: útil para la interfaz */
        views,          /* Opcional: útil para la interfaz */
        created_at 
    FROM videos 
    WHERE visibility = 'public' AND status = 'published'
");
$videos = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (!empty($videos)) {
    // Usamos 'id' como primary key interna de Meilisearch
    $client->index('videos')->addDocuments($videos, 'id');
    echo "✔️ Sincronizados " . count($videos) . " videos.\n";
} else {
    echo "ℹ️ No se encontraron videos públicos para sincronizar.\n";
}

// 4. Sincronizar Canales Activos
echo "Extrayendo canales...\n";
// Adaptamos las columnas (profile_picture -> avatar_path, channel_identifier -> handle)
$stmt = $db->query("
    SELECT 
        id, 
        username, 
        channel_identifier AS handle, 
        profile_picture AS avatar_path, 
        channel_description AS description 
    FROM users 
    WHERE user_status = 'active'
");
$channels = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (!empty($channels)) {
    $client->index('channels')->addDocuments($channels, 'id');
    echo "✔️ Sincronizados " . count($channels) . " canales.\n";
} else {
    echo "ℹ️ No se encontraron canales activos para sincronizar.\n";
}

echo "🎉 Sincronización completa.\n";