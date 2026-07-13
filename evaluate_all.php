<?php
require_once __DIR__ . '/includes/core/bootstrap.php';

use App\Core\Container;
use App\Config\Database\DatabaseManager;

try {
    $container = new Container();
    $lockManager = $container->get(\App\Api\Services\Canvas\CanvasLockManager::class);
    
    $db = DatabaseManager::getInstance()->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);
    $stmt = $db->query("SELECT id FROM users");
    $users = $stmt->fetchAll(\PDO::FETCH_ASSOC);
    
    $count = 0;
    foreach ($users as $u) {
        if ($lockManager->evaluateUserCanvases((int)$u['id'])) {
            $count++;
        }
    }
    
    echo "Evaluated canvases for $count users.\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
