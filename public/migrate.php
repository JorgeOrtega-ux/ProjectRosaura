<?php
require_once __DIR__ . '/../includes/core/bootstrap.php';
use App\Config\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;

try {
    $db = new DatabaseManager();
    $pdo = $db->getConnection(DB::CONN_CANVASES);

    $stmt = $pdo->prepare("
        INSERT IGNORE INTO canvas_members (canvas_id, user_id)
        SELECT DISTINCT canvas_id, user_id
        FROM canvas_user_roles
    ");
    $stmt->execute();
    
    echo "Synced canvas_members successfully. Rows affected: " . $stmt->rowCount() . "\n";
} catch (Exception $e) {
    echo "Error syncing canvas_members: " . $e->getMessage() . "\n";
}
