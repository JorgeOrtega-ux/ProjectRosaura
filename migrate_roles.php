<?php
require_once __DIR__ . '/vendor/autoload.php';

use App\Config\Database\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

$db = new DatabaseManager();

try {
    $pdoIdentity = $db->getConnection(DB::CONN_IDENTITY);
    echo "Migrating db_identity.roles...\n";
    $pdoIdentity->exec("ALTER TABLE roles ADD COLUMN uuid CHAR(36) UNIQUE DEFAULT NULL;");
    $pdoIdentity->exec("UPDATE roles SET uuid = UUID() WHERE uuid IS NULL;");
    echo "db_identity.roles migrated successfully.\n";
} catch (\Throwable $e) {
    echo "Error migrating db_identity.roles: " . $e->getMessage() . "\n";
}

try {
    $pdoCanvases = $db->getConnection(DB::CONN_CANVASES);
    echo "Migrating db_canvases.canvas_roles...\n";
    $pdoCanvases->exec("ALTER TABLE canvas_roles ADD COLUMN uuid CHAR(36) UNIQUE DEFAULT NULL;");
    $pdoCanvases->exec("UPDATE canvas_roles SET uuid = UUID() WHERE uuid IS NULL;");
    echo "db_canvases.canvas_roles migrated successfully.\n";
} catch (\Throwable $e) {
    echo "Error migrating db_canvases.canvas_roles: " . $e->getMessage() . "\n";
}

echo "Migration finished.\n";
