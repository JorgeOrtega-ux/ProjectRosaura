<?php
require_once __DIR__ . '/api/bootstrap.php';

use App\Core\System\DatabaseManager;
use App\Core\System\DatabaseConstants;

$db = new DatabaseManager();
$pdoIdentity = $db->getConnection(DatabaseConstants::CONN_IDENTITY);
$pdoCanvases = $db->getConnection(DatabaseConstants::CONN_CANVASES);

$sql = file_get_contents(__DIR__ . '/update_uuids.sql');
$queries = explode(';', $sql);

foreach ($queries as $query) {
    $query = trim($query);
    if (empty($query)) continue;
    
    try {
        if (strpos($query, 'USE db_canvases') !== false) {
            continue;
        }
        if (strpos($query, 'canvas_roles') !== false) {
            $pdoCanvases->exec($query);
            echo "Executed on db_canvases: " . substr($query, 0, 50) . "...\n";
        } else if (strpos($query, 'roles') !== false) {
            $pdoIdentity->exec($query);
            echo "Executed on db_identity: " . substr($query, 0, 50) . "...\n";
        }
    } catch (Exception $e) {
        echo "Error: " . $e->getMessage() . "\n";
    }
}
echo "Done.\n";
