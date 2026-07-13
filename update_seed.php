<?php
require_once __DIR__ . '/vendor/autoload.php';
\App\Core\Helpers\EnvLoader::load(__DIR__ . '/.env');

use App\Config\Database\DatabaseManager;

$db = new DatabaseManager();
$pdo = $db->getConnection('canvases');

// Update the generated test canvases to be public
$stmt = $pdo->prepare("UPDATE canvases SET privacy = 'public' WHERE name LIKE 'Lienzo de Prueba%'");
$stmt->execute();

echo "Actualizados " . $stmt->rowCount() . " lienzos a público.\n";
