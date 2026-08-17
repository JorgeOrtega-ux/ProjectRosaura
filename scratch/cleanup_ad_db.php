<?php

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../includes/core/Helpers/EnvLoader.php';
require_once __DIR__ . '/../config/Database/DatabaseManager.php';
require_once __DIR__ . '/../config/Database/RedisCache.php';
require_once __DIR__ . '/../includes/core/System/CacheConstants.php';
require_once __DIR__ . '/../includes/core/System/CacheInvalidator.php';

\App\Core\Helpers\EnvLoader::load(__DIR__ . '/../.env');
$db = new \App\Config\Database\DatabaseManager();
$pdo = $db->getConnection(\App\Core\System\DatabaseConstants::CONN_ADVERTISEMENTS);

$stmt = $pdo->query("SELECT id, name, format FROM advertisements");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "Current ads in DB:\n";
print_r($rows);

$deleted = $pdo->exec("DELETE FROM advertisements WHERE format NOT IN ('feed', 'module_colors', 'module_templates')");
echo "Deleted rows with invalid formats: $deleted\n";

$redisCache = new \App\Config\Database\RedisCache();
$invalidator = new \App\Core\System\CacheInvalidator($redisCache->getClient());
$invalidator->advertisements();
echo "Cache purged completely.\n";
