<?php
require_once __DIR__ . '/../vendor/autoload.php';
define('ROOT_PATH', dirname(__DIR__));
\App\Core\Helpers\EnvLoader::load(ROOT_PATH . '/.env');

$container = new \App\Core\Container();

// 1. Insert remember token via DB service
$db = $container->get(\App\Config\Database\DatabaseManager::class);
$pdo = $db->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);

$userId = 1;
$selector = 'testselector';
$validator = 'testvalidator';

$tblAuthTokens = \App\Core\System\DatabaseConstants::TBL_AUTH_TOKENS;
$stmt = $pdo->prepare("DELETE FROM {$tblAuthTokens} WHERE user_id = ?");
$stmt->execute([$userId]);
$stmt = $pdo->prepare("INSERT INTO {$tblAuthTokens} (user_id, selector, hashed_validator, expires_at, user_agent, ip_address) VALUES (?, ?, ?, ?, ?, ?)");
$hashedValidator = hash('sha256', $validator);
$expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));
$stmt->execute([$userId, $selector, $hashedValidator, $expiresAt, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', '127.0.0.1']);

// 2. Connect to Redis and set the session
$redisHost = getenv('REDIS_HOST') ?: '127.0.0.1';
$redisPort = (int)(getenv('REDIS_PORT') ?: 6379);
$redisParams = ['scheme' => 'tcp', 'host' => $redisHost, 'port' => $redisPort];
if (getenv('REDIS_PASS')) {
    $redisParams['password'] = getenv('REDIS_PASS');
}
$redis = new \Predis\Client($redisParams);

$sessionId = 'testsession1234567890';
$csrfToken = 'testcsrf1234567890';

$accounts = [
    $userId => [
        'user_id' => $userId,
        'user_uuid' => 'f9d63985-ce52-4c74-b8f2-3f7299b67a98',
        'user_name' => 'ortegaaguilarjo',
        'user_email' => 'al20328051890088@gmail.com',
        'user_roles' => [4],
        'user_role_weight' => 100,
        'user_role_name' => 'SuperAdministrator',
        'user_permissions' => ['access_admin_panel'],
        'csrf_token' => $csrfToken,
        'last_accessed' => time(),
        'session_created_at' => time()
    ]
];

$sessionData = "csrf_token|s:64:\"$csrfToken\";accounts|s:" . strlen(serialize($accounts)) . ":\"" . serialize($accounts) . "\";active_account|i:$userId;user_id|i:$userId;user_uuid|s:36:\"f9d63985-ce52-4c74-b8f2-3f7299b67a98\";user_name|s:15:\"ortegaaguilarjo\";user_email|s:26:\"al20328051890088@gmail.com\";user_roles|a:1:{i:0;i:4;}user_role_weight|i:100;user_role_name|s:18:\"SuperAdministrator\";user_permissions|a:1:{i:0;s:18:\"access_admin_panel\";}user_role|s:18:\"SuperAdministrator\";";

$redis->set("PHPREDIS_SESSION:$sessionId", $sessionData);
$redis->expire("PHPREDIS_SESSION:$sessionId", 3600);

echo "Session created successfully with ID: $sessionId\n";
