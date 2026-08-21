<?php
$host = getenv('DB_HOST') ?: '127.0.0.1';
$port = getenv('DB_PORT') ?: 3306;
$user = getenv('DB_USER') ?: 'root';
$pass = getenv('DB_PASS') ?: '';
$dbIdentity = getenv('DB_IDENTITY_NAME') ?: 'db_identity';

$pdo = new PDO("mysql:host={$host};port={$port};dbname={$dbIdentity};charset=utf8mb4", $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
]);

$userIds = [2, 3]; // User 2 (al20328051890088@gmail.com) and User 3
$tierLevel = 3; // Ultra

foreach ($userIds as $uid) {
    // 1. Update users table
    $stmt = $pdo->prepare("UPDATE users SET subscription_tier = :tier WHERE id = :userId");
    $stmt->execute(['tier' => $tierLevel, 'userId' => $uid]);

    // 2. Insert or update subscriptions table
    $stmtSub = $pdo->prepare("SELECT id FROM subscriptions WHERE user_id = :userId LIMIT 1");
    $stmtSub->execute(['userId' => $uid]);
    $subId = $stmtSub->fetchColumn();

    if ($subId) {
        $pdo->prepare("UPDATE subscriptions SET tier = :tier, status = 'active', billing_period = 'yearly', current_period_start = NOW(), current_period_end = DATE_ADD(NOW(), INTERVAL 100 YEAR), updated_at = NOW() WHERE id = :id")
            ->execute(['tier' => $tierLevel, 'id' => $subId]);
    } else {
        $pdo->prepare("INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, tier, billing_period, status, current_period_start, current_period_end) VALUES (:userId, 'manual_admin', 'sub_ultra_lifetime', :tier, 'yearly', 'active', NOW(), DATE_ADD(NOW(), INTERVAL 100 YEAR))")
            ->execute(['userId' => $uid, 'tier' => $tierLevel]);
    }
}

// 3. Connect to Redis and flush caches
$redisHost = getenv('REDIS_HOST') ?: '127.0.0.1';
$redisPort = getenv('REDIS_PORT') ?: 6379;
$redisPass = getenv('REDIS_PASS') ?: '';

$redis = new Redis();
$redis->connect($redisHost, (int)$redisPort);
if ($redisPass) {
    $redis->auth($redisPass);
}

$keysToDel = [
    "user:profile:2",
    "user:profile:f94a3f7f-6fb1-462e-ae49-80e501a71fae",
    "user:sub:2",
    "user:roles:2",
    "user:perms:2",
    "user:highest_role:2",
    "user:storage:2",
    "user:template_tokens:2",
    "user:profile:3",
    "user:profile:32c57ff0-fa31-4715-93f1-29d3a3997c04",
    "user:sub:3",
    "user:roles:3",
    "user:perms:3",
    "user:highest_role:3",
    "user:storage:3",
    "user:template_tokens:3"
];

foreach ($keysToDel as $k) {
    $redis->del($k);
}

$allCanvasKeys = $redis->keys("user:canvases:*");
if (!empty($allCanvasKeys)) {
    $redis->del($allCanvasKeys);
}

$updatedUser2 = $pdo->query("SELECT u.id, u.uuid, u.username, u.email, u.subscription_tier, s.tier as sub_tier, s.status, s.current_period_end FROM users u LEFT JOIN subscriptions s ON u.id = s.user_id WHERE u.id = 2")->fetch(PDO::FETCH_ASSOC);

echo "=====================================================\n";
echo "SUCCESS! SUSCRIPCIÓN ULTRA ASIGNADA\n";
echo "=====================================================\n";
print_r($updatedUser2);
