<?php
require_once __DIR__ . '/includes/core/bootstrap.php';
$db = new \App\Config\Database\DatabaseManager();
$pdo = $db->getConnection(\App\Core\System\DatabaseConstants::CONN_CANVASES);

$stmt = $pdo->query('DESCRIBE canvas_chat_messages');
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
