<?php
require_once __DIR__ . '/includes/core/bootstrap.php';
$db = new \App\Config\Database\DatabaseManager();
$pdo = $db->getConnection(\App\Core\System\DatabaseConstants::CONN_CANVASES);
$stmt = $pdo->query('SELECT COUNT(*) FROM canvas_chat_messages');
echo 'Total: ' . $stmt->fetchColumn() . "\n";

$stmt2 = $pdo->query('SELECT id FROM canvas_chat_messages ORDER BY id DESC LIMIT 5');
print_r($stmt2->fetchAll(PDO::FETCH_ASSOC));
