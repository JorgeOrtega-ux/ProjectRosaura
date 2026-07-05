<?php
require_once __DIR__ . '/vendor/autoload.php';
\App\Core\Helpers\EnvLoader::load(__DIR__ . '/.env');

use App\Config\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;

try {
    $db = new DatabaseManager();
    $pdo = $db->getConnection(DB::CONN_IDENTITY);
    
    $sql = file_get_contents(__DIR__ . '/docker/mysql/init/db_custom_palettes.sql');
    $pdo->exec($sql);
    
    echo "Table custom_palettes created successfully.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
