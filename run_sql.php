<?php
require_once __DIR__ . '/vendor/autoload.php';
\App\Core\Helpers\EnvLoader::load(__DIR__ . '/.env');

use App\Config\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;

try {
    $db = new DatabaseManager();
    $pdo = $db->getConnection(DB::CONN_CANVASES);
    
    $sql = file_get_contents(__DIR__ . '/scripts/create_canvas_invites.sql');
    $pdo->exec($sql);
    
    echo "Table canvas_invites created successfully.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
