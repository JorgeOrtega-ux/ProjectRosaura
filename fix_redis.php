<?php
require "vendor/autoload.php";
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

try {
    $redis = new Redis();
    $redis->connect($_ENV["REDIS_HOST"] ?? "rosaura_redis", 6379);
    if (!empty($_ENV["REDIS_PASSWORD"])) {
        $redis->auth($_ENV["REDIS_PASSWORD"]);
    }
    $keys = $redis->keys("PHPREDIS_SESSION:*");
    $count = 0;
    foreach ($keys as $key) {
        $redis->del($key);
        $count++;
    }
    echo "Cleared {$count} sessions.\n";
} catch (\Exception $e) {
    echo "Could not clear redis sessions: " . $e->getMessage() . "\n";
}
?>
