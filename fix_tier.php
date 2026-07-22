<?php
require "vendor/autoload.php";
use App\Config\Database\DatabaseManager;
use App\Core\System\DatabaseConstants;

$db = new DatabaseManager();
$pdo = $db->getConnection(DatabaseConstants::CONN_IDENTITY);

// Set tier level to 3 (Ultra level) for all users (or just user 1)
$stmt = $pdo->query("UPDATE users SET subscription_tier = 3");
echo "Fixed user tiers to level 3.\n";

// I also need to clear all Redis sessions so the user is forced to login and get the right session!
try {
    $redis = new Redis();
    $redis->connect($_ENV["REDIS_HOST"] ?? "rosaura_redis", 6379);
    $keys = $redis->keys("PHPREDIS_SESSION:*");
    foreach ($keys as $key) {
        $redis->del($key);
    }
    echo "Cleared " . count($keys) . " sessions.\n";
} catch (\Exception $e) {
    echo "Could not clear redis sessions: " . $e->getMessage() . "\n";
}
?>
