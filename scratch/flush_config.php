<?php
require_once dirname(__DIR__) . '/vendor/autoload.php';

use App\Config\Database\RedisCache;

$redis = (new RedisCache())->getClient();
$redis->del("canvas:2:config");
echo "Deleted canvas:2:config from Redis.\n";
