<?php
$dsn = "mysql:host=db;dbname=db_canvases;charset=utf8mb4";
$user = "system_web_executor";
$pass = "e4b3c2d1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3";

try {
    $pdo = new PDO($dsn, $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // First, get the oldest 10 canvases for user 1
    $stmt = $pdo->query("SELECT id FROM canvases WHERE owner_id = 1 ORDER BY created_at ASC LIMIT 10");
    $allowedIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (empty($allowedIds)) {
        echo "No canvases found for user 1.\n";
        exit;
    }
    
    $inPlaceholders = implode(',', array_fill(0, count($allowedIds), '?'));
    
    // Lock all other canvases for user 1
    $updateSql = "UPDATE canvases SET is_locked = 1, locked_reasons = '[\"max_canvases\"]' WHERE owner_id = 1 AND id NOT IN ($inPlaceholders)";
    $stmt2 = $pdo->prepare($updateSql);
    $stmt2->execute($allowedIds);
    
    $rowCount = $stmt2->rowCount();
    echo "Locked $rowCount extra canvases for user 1 successfully.\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
