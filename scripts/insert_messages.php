<?php
require_once __DIR__ . '/../includes/core/bootstrap.php';
use App\Config\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;

try {
    $db = new DatabaseManager();
    $pdo = $db->getConnection(DB::CONN_CANVASES);

    $canvasId = 1;
    // We will use user_id = 1 (or any existing user, let's just query one)
    $identityPdo = $db->getConnection(DB::CONN_IDENTITY);
    $user = $identityPdo->query("SELECT id FROM " . DB::TBL_USERS . " LIMIT 1")->fetch();
    $userId = $user ? $user['id'] : 1;

    $pdo->beginTransaction();
    $stmt = $pdo->prepare("INSERT INTO canvas_chat_messages (canvas_id, user_id, message, created_at) VALUES (?, ?, ?, ?)");

    for ($i = 1; $i <= 200; $i++) {
        $msg = "Mensaje de prueba número $i";
        // Create an artificial timestamp going backwards so they are chronologically correct
        // from X minutes ago up to now
        $secondsAgo = (200 - $i) * 60; 
        $createdAt = date('Y-m-d H:i:s', time() - $secondsAgo);
        
        $stmt->execute([$canvasId, $userId, $msg, $createdAt]);
    }
    
    $pdo->commit();
    echo "Inserted 200 messages for canvas $canvasId successfully.\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
