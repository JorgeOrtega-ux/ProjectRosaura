<?php
// scripts/sync_meilisearch.php

require_once __DIR__ . '/../vendor/autoload.php';

use MeiliSearch\Client;
use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable(dirname(__DIR__));
$dotenv->load();

echo "🔧 Iniciando Script de Reconciliación Enterprise Meilisearch...\n";

$host = $_ENV['MEILISEARCH_HOST'] ?? 'http://127.0.0.1:7700';
$key = $_ENV['MEILISEARCH_MASTER_KEY'] ?? ''; 
$client = new Client($host, $key);

try {
    echo "⚙️ Configurando índices y atributos avanzados...\n";
    // Atributos de Búsqueda
    $client->index('videos')->updateSearchableAttributes(['title', 'description', 'channel_name', 'tags', 'category', 'models']);
    
    // Atributos Filtrables (Faceting)
    $client->index('videos')->updateFilterableAttributes(['category', 'tags', 'models', 'visibility', 'status', 'user_id']);
    
    // Atributos Ordenables
    $client->index('videos')->updateSortableAttributes(['created_at', 'views']);

    // Configurar el índice de canales
    $client->index('channels')->updateSearchableAttributes(['username', 'handle', 'description']);
    // Hacer que los suscriptores sean ordenables a futuro
    $client->index('channels')->updateSortableAttributes(['subscribers_count']);
    
} catch (Exception $e) {
    echo "⚠️ Aviso configurando índices: " . $e->getMessage() . "\n";
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
    die("❌ Error de conexión a la BD: " . $e->getMessage() . "\n");
}

echo "📦 Extrayendo e hidratando todos los videos...\n";

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
        UNIX_TIMESTAMP(v.created_at) as created_at,
        v.status,
        v.visibility,
        u.username AS channel_name,
        u.channel_identifier AS channel_handle,
        u.profile_picture AS avatar_path
    FROM videos v
    JOIN users u ON v.user_id = u.id
    WHERE v.visibility = 'public' AND v.status = 'published'
");
$videosRaw = $stmt->fetchAll(PDO::FETCH_ASSOC);

$videosParaIndexar = [];

foreach ($videosRaw as $v) {
    $stmtTags = $db->prepare("
        SELECT COALESCE(t.name, vt.custom_tag_name) as name, COALESCE(t.type, vt.custom_tag_type) as type
        FROM video_tags vt
        LEFT JOIN tags t ON vt.tag_id = t.id
        WHERE vt.video_id = ?
    ");
    $stmtTags->execute([$v['id']]);
    $tagsRaw = $stmtTags->fetchAll(PDO::FETCH_ASSOC);

    $v['category'] = [];
    $v['models'] = [];
    $v['tags'] = [];

    foreach ($tagsRaw as $t) {
        if ($t['type'] === 'category') $v['category'][] = $t['name'];
        elseif ($t['type'] === 'modelo') $v['models'][] = $t['name'];
        elseif ($t['type'] === 'custom') $v['tags'][] = $t['name'];
    }
    
    $v['created_at'] = (int) $v['created_at'];
    $v['views'] = (int) $v['views'];
    
    $videosParaIndexar[] = $v;
}

if (!empty($videosParaIndexar)) {
    $client->index('videos')->deleteAllDocuments();
    $client->index('videos')->addDocuments($videosParaIndexar, 'id');
    echo "✔️ Volcado completo: " . count($videosParaIndexar) . " videos sincronizados con facetas completas.\n";
} else {
    echo "ℹ️ No se encontraron videos públicos para sincronizar.\n";
}

echo "📦 Extrayendo canales...\n";
$stmt = $db->query("
    SELECT 
        id, 
        username, 
        channel_identifier AS handle, 
        profile_picture AS avatar_path, 
        banner_path,
        channel_description AS description,
        (SELECT COUNT(*) FROM subscriptions WHERE channel_id = users.id) AS subscribers_count
    FROM users 
    WHERE user_status = 'active'
");
$channels = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Forzar tipado numérico para subscribers_count
foreach ($channels as &$c) {
    $c['subscribers_count'] = (int) $c['subscribers_count'];
}

if (!empty($channels)) {
    $client->index('channels')->deleteAllDocuments();
    $client->index('channels')->addDocuments($channels, 'id');
    echo "✔️ Volcado completo: " . count($channels) . " canales activos sincronizados.\n";
} else {
    echo "ℹ️ No se encontraron canales activos para sincronizar.\n";
}

echo "🎉 Sincronización de Reconciliación completa.\n";
?>