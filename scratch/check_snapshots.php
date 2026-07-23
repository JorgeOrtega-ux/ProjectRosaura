<?php
require_once dirname(__DIR__) . '/vendor/autoload.php';

use App\Config\Database\DatabaseManager;

$db = (new DatabaseManager())->getConnection('canvases');
$stmt = $db->query("DESCRIBE canvas_snapshots");
$cols = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "=== canvas_snapshots columns ===\n";
print_r($cols);

$stmt2 = $db->query("SELECT canvas_id, LENGTH(snapshot_data) as len, last_updated FROM canvas_snapshots");
$rows = $stmt2->fetchAll(PDO::FETCH_ASSOC);
echo "\n=== canvas_snapshots rows ===\n";
print_r($rows);
