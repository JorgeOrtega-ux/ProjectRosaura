<?php
require_once __DIR__ . '/vendor/autoload.php';
\App\Core\Helpers\EnvLoader::load(__DIR__ . '/.env');

use App\Config\Database\DatabaseManager;
use App\Core\Helpers\Utils;

$db = new DatabaseManager();
$pdo = $db->getConnection('canvases');

$ownerId = 1;
$sizes = ['64', '128', '256', '512'];
$privacies = ['public', 'private'];

echo "Iniciando inserción de 100 lienzos de prueba...\n";

// Buscar el UUID de algún lienzo existente para usar su URL en el visor si hiciera falta. 
// Nota: La URL del thumbnail es construida a nivel de backend: "thumbnails/canvas_" . $uuid . ".png"
// Por lo tanto, en la BD solo guardamos el UUID. Si usamos un UUID de prueba, no habrá thumbnail real 
// en S3 y saldrá el ícono por defecto (fallback image), lo cual está bien para pruebas de UI.
// Sin embargo, si quieres que forzosamente algunos tengan imagen, podemos robarles el UUID a uno de tus 2 lienzos, 
// pero en la BD la columna uuid debe ser UNIQUE, así que no podemos repetirlo en la tabla canvases.
// ¡Lo que haremos será generar UUIDs únicos! El fallback se encargará de mostrar el icono por defecto.

$stmt = $pdo->prepare("
    INSERT INTO canvases (
        uuid, owner_id, name, description, privacy, 
        requires_approval, allow_purchases, allow_chat, 
        size, palette_id, max_participants, favorites_count, members_count
    ) VALUES (
        :uuid, :owner_id, :name, :description, :privacy, 
        :requires_approval, :allow_purchases, :allow_chat, 
        :size, :palette_id, :max_participants, :favorites_count, :members_count
    )
");

$successCount = 0;

for ($i = 1; $i <= 100; $i++) {
    $uuid = Utils::generateUUID();
    
    try {
        $stmt->execute([
            ':uuid' => $uuid,
            ':owner_id' => $ownerId,
            ':name' => "Lienzo de Prueba $i",
            ':description' => "Este es un lienzo generado automáticamente para pruebas. Número $i.",
            ':privacy' => $privacies[array_rand($privacies)],
            ':requires_approval' => 0,
            ':allow_purchases' => 1,
            ':allow_chat' => 0,
            ':size' => $sizes[array_rand($sizes)],
            ':palette_id' => 'default',
            ':max_participants' => rand(10, 100),
            ':favorites_count' => rand(0, 9999),
            ':members_count' => rand(1, 50)
        ]);
        
        $canvasId = $pdo->lastInsertId();
        
        // Agregar al owner como miembro
        $memberStmt = $pdo->prepare("INSERT INTO canvas_members (canvas_id, user_id) VALUES (:cid, :uid)");
        $memberStmt->execute([':cid' => $canvasId, ':uid' => $ownerId]);
        
        $successCount++;
    } catch (\Exception $e) {
        echo "Error en iteración $i: " . $e->getMessage() . "\n";
    }
}

echo "Se insertaron $successCount lienzos correctamente.\n";
