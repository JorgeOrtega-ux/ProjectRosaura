<?php

require_once __DIR__ . '/../vendor/autoload.php';

use MeiliSearch\Client;
use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable(dirname(__DIR__));
$dotenv->load();

echo "Iniciando sincronización con Meilisearch...\n";

$host = $_ENV['MEILISEARCH_HOST'] ?? 'http://127.0.0.1:7700';
$key = $_ENV['MEILISEARCH_MASTER_KEY'] ?? ''; 
$client = new Client($host, $key);

try {
    $client->index('videos')->updateFilterableAttributes(['visibility', 'status', 'user_id']);
    $client->index('videos')->updateSearchableAttributes(['title', 'description']);
    $client->index('channels')->updateSearchableAttributes(['username', 'handle', 'description']);
} catch (Exception $e) {
    echo "Aviso: Error configurando índices (si están vacíos, es normal). Continuamos...\n";
}

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

echo "Extrayendo videos...\n";

// CORRECCIÓN: Agregamos JOIN con users para obtener username y avatar, 
// y trajimos hls_path y thumbnail_dominant_color para que el JS las tenga.
$stmt = $db->query("
    SELECT 
        v.id, 
        v.uuid AS id_video, 
        v.user_id, 
        v.title, 
        v.description, 
        v.thumbnail_path, 
        v.thumbnail_dominant_color,
        v.hls_path,
        v.duration,       
        v.views,          
        v.created_at,
        u.username,
        u.profile_picture AS avatar_path
    FROM videos v
    JOIN users u ON v.user_id = u.id
    WHERE v.visibility = 'public' AND v.status = 'published'
");
$videos = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (!empty($videos)) {
    // Si la base de datos es grande, borrar y recrear asegura limpiar basura
    $client->index('videos')->deleteAllDocuments();
    $client->index('videos')->addDocuments($videos, 'id');
    echo "✔️ Sincronizados " . count($videos) . " videos (con datos de canal).\n";
} else {
    echo "ℹ️ No se encontraron videos públicos para sincronizar.\n";
}

echo "Extrayendo canales...\n";
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
    $client->index('channels')->deleteAllDocuments();
    $client->index('channels')->addDocuments($channels, 'id');
    echo "✔️ Sincronizados " . count($channels) . " canales.\n";
} else {
    echo "ℹ️ No se encontraron canales activos para sincronizar.\n";
}

echo "🎉 Sincronización completa.\n";