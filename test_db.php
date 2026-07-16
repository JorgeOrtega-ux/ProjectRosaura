<?php
require_once __DIR__ . '/includes/core/bootstrap.php';
$db = new \App\Config\Database\DatabaseManager();
$pdo = $db->getConnection(\App\Core\System\DatabaseConstants::CONN_CANVASES);

$stmtCount = $pdo->query('SELECT COUNT(*) FROM canvas_chat_messages');
$count = $stmtCount->fetchColumn();

$stmtAll = $pdo->query('SELECT id, canvas_id FROM canvas_chat_messages ORDER BY id DESC LIMIT 5');
$all = $stmtAll->fetchAll(PDO::FETCH_ASSOC);

file_put_contents(__DIR__ . '/test.txt', "Count: $count\nRows: " . print_r($all, true));
