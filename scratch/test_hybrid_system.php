<?php
require_once __DIR__ . '/../includes/core/bootstrap.php';

// Reset exception handler for CLI testing
set_exception_handler(null);
ini_set('display_errors', 1);

use App\Config\Database\DatabaseManager;
use App\Config\Database\RedisCache;
use App\Core\Repositories\CanvasRepository;
use App\Core\Repositories\UserRepository;
use App\Api\Services\Canvas\CanvasCoreService;
use App\Api\Services\Canvas\CanvasLockManager;
use App\Core\System\SubscriptionPlanConstants;
use App\Core\Container;

echo "=====================================================\n";
echo "TESTING HYBRID CANVAS SYSTEM (OFFLINE + ONLINE SLOTS)\n";
echo "=====================================================\n\n";

global $container;
$dbManager = $container->get(DatabaseManager::class);
$redisCache = $container->get(RedisCache::class);
$redis = $redisCache->getClient();
$canvasRepo = $container->get(CanvasRepository::class);
$userRepo = $container->get(UserRepository::class);
$canvasService = $container->get(CanvasCoreService::class);

// 1. Get or create a test user (Free tier: max_canvases / max_online_canvases = 1)
$identityDb = $dbManager->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);
$stmt = $identityDb->query("SELECT id, subscription_tier, storage_used_bytes FROM users WHERE subscription_tier = 0 LIMIT 1");
$testUser = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$testUser) {
    $identityDb->exec("INSERT INTO users (uuid, username, email, password, profile_picture, subscription_tier, storage_used_bytes) VALUES ('test-uuid-free-1', 'testuser_free', 'testfree@rosaura.local', 'dummyhash', '', 0, 0)");
    $userId = (int)$identityDb->lastInsertId();
    echo "[SETUP] Created test user with ID: $userId (Tier 0 Free)\n";
} else {
    $userId = (int)$testUser['id'];
    echo "[SETUP] Using test user ID: $userId (Tier 0 Free)\n";
}

$canvasesDb = $dbManager->getConnection(\App\Core\System\DatabaseConstants::CONN_CANVASES);
$canvasesDb->exec("UPDATE canvases SET mode = 'offline', is_online_active = 0 WHERE owner_id = $userId");

$planLimits = SubscriptionPlanConstants::getTierLimits(0);
echo "[INFO] Free Tier limits: max_online_canvases = {$planLimits['max_online_canvases']}, max_storage_mb = {$planLimits['max_storage_mb']}MB\n\n";

// TEST 1: Create multiple canvases (offline by default) - should allow more than 1 despite max_online_canvases = 1
echo "--- TEST 1: Creating multiple offline canvases (unlimited within storage quota) ---\n";
$createdCanvasIds = [];
for ($i = 1; $i <= 3; $i++) {
    $res = $canvasService->createCanvas(
        $userId,
        "Lienzo Offline Test $i",
        "private",
        false,
        "64x64",
        10,
        "default",
        5,
        10,
        0,
        ['art']
    );

    if (!$res['success']) {
        echo "[FAIL] Failed to create canvas $i: " . ($res['message'] ?? 'Unknown error') . "\n";
        exit(1);
    }

    $uuid = $res['data']['uuid'];
    $cData = $canvasRepo->getCanvasByUuid($uuid);
    $cId = (int)$cData['id'];
    $createdCanvasIds[] = $cId;
    echo "[PASS] Created Canvas #$i (ID: $cId, UUID: $uuid) -> Mode: {$cData['mode']}, IsOnline: {$cData['is_online_active']}\n";
}

// TEST 2: Verify Redis RAM is NOT consumed by offline canvases
echo "\n--- TEST 2: Verify Redis has NO hot state for offline canvases ---\n";
foreach ($createdCanvasIds as $cId) {
    $exists = $redis->exists("canvas:{$cId}:state");
    if ($exists) {
        echo "[FAIL] Redis unexpectedly contains state for offline canvas ID $cId!\n";
        exit(1);
    }
}
echo "[PASS] Confirmed: Zero Redis RAM allocated for offline canvases.\n";

// TEST 3: Save offline state drawing (simulate user drawing pixels offline)
echo "\n--- TEST 3: Save offline canvas state ---\n";
$targetCanvasId = $createdCanvasIds[0];
$rawPixels = str_repeat(pack('C4', 255, 0, 128, 255), 64 * 64); // Painted 64x64 RGBA
$base64State = base64_encode(gzencode($rawPixels, 6));

$saveRes = $canvasService->saveOfflineState($userId, $targetCanvasId, $base64State);
if (!$saveRes['success']) {
    echo "[FAIL] saveOfflineState failed: " . ($saveRes['message'] ?? '') . "\n";
    exit(1);
}
echo "[PASS] saveOfflineState succeeded: " . $saveRes['message'] . "\n";

// Verify snapshot saved in DB/S3
$savedSnapshot = $canvasRepo->getSnapshot($targetCanvasId);
if (strlen($savedSnapshot) !== 64 * 64 * 4) {
    echo "[FAIL] Saved snapshot size mismatch: got " . strlen($savedSnapshot) . " bytes, expected " . (64 * 64 * 4) . " bytes\n";
    exit(1);
}
echo "[PASS] Snapshot verified: exactly " . strlen($savedSnapshot) . " bytes persisted.\n";

// TEST 4: Activate Online mode for canvas 1 (1st slot used)
echo "\n--- TEST 4: Activate Canvas Online Mode (Slot 1) ---\n";
$actRes1 = $canvasService->activateOnline($userId, $createdCanvasIds[0]);
if (!$actRes1['success']) {
    echo "[FAIL] Failed to activate canvas {$createdCanvasIds[0]} online: " . ($actRes1['message'] ?? '') . "\n";
    exit(1);
}
echo "[PASS] Canvas {$createdCanvasIds[0]} successfully activated online!\n";

// Verify Redis now has the hot state hydrated and flags updated
$redisState = $redis->get("canvas:{$createdCanvasIds[0]}:state");
$c1Fresh = $canvasRepo->getById($createdCanvasIds[0]);
if (!$redisState || strlen($redisState) !== 64 * 64 * 4 || $c1Fresh['mode'] !== 'online' || $c1Fresh['is_online_active'] != 1) {
    echo "[FAIL] Online activation did not hydrate Redis properly or update DB flags!\n";
    exit(1);
}
echo "[PASS] Redis hot state and DB flags verified: state loaded in Redis, mode='online', is_online_active=1.\n";

// TEST 5: Attempting to activate Canvas 2 Online (should be BLOCKED because Free tier allows max 1 online canvas)
echo "\n--- TEST 5: Attempting to activate 2nd canvas online exceeding Free tier slot limit ---\n";
$actRes2 = $canvasService->activateOnline($userId, $createdCanvasIds[1]);
if ($actRes2['success']) {
    echo "[FAIL] Second canvas activation should have been blocked by subscription online limit!\n";
    exit(1);
}
echo "[PASS] Correctly blocked 2nd online activation with message: '{$actRes2['message']}' (Error Code: {$actRes2['error_code']})\n";

// TEST 6: Deactivate Canvas 1 from Online mode (returns to Offline Studio)
echo "\n--- TEST 6: Deactivate Canvas 1 from Online to Offline Studio ---\n";
$deactRes = $canvasService->deactivateOnline($userId, $createdCanvasIds[0]);
if (!$deactRes['success']) {
    echo "[FAIL] Failed to deactivate online mode: " . ($deactRes['message'] ?? '') . "\n";
    exit(1);
}
echo "[PASS] Canvas 1 deactivated to offline successfully.\n";

// Verify evicted from Redis
$redisStateAfter = $redis->get("canvas:{$createdCanvasIds[0]}:state");
$c1After = $canvasRepo->getById($createdCanvasIds[0]);
if ($redisStateAfter !== false && $redisStateAfter !== null) {
    echo "[FAIL] Canvas 1 state was not evicted from Redis upon deactivation!\n";
    exit(1);
}
if ($c1After['mode'] !== 'offline' || $c1After['is_online_active'] != 0) {
    echo "[FAIL] DB flags not reset to offline!\n";
    exit(1);
}
echo "[PASS] Verified: Redis RAM evicted, mode='offline', is_online_active=0.\n";

// TEST 7: Activate Canvas 2 Online (now that slot is free)
echo "\n--- TEST 7: Activate Canvas 2 now that slot is freed ---\n";
$actRes2Retry = $canvasService->activateOnline($userId, $createdCanvasIds[1]);
if (!$actRes2Retry['success']) {
    echo "[FAIL] Failed to activate canvas 2 after freeing slot: " . ($actRes2Retry['message'] ?? '') . "\n";
    exit(1);
}
echo "[PASS] Canvas 2 activated online successfully using the freed slot.\n";

// Clean up canvas 2 online mode
$canvasService->deactivateOnline($userId, $createdCanvasIds[1]);

// TEST 8: Check getMine return structure
echo "\n--- TEST 8: Check getMine response and stats structure ---\n";
$mineRes = $canvasService->getMine($userId);
if (!$mineRes['success'] || !isset($mineRes['stats'])) {
    echo "[FAIL] getMine failed or stats missing!\n";
    exit(1);
}
echo "[PASS] getMine returned stats: " . json_encode($mineRes['stats']) . "\n";

echo "\n=====================================================\n";
echo "ALL TESTS PASSED WITH 100% SUCCESS!\n";
echo "=====================================================\n";
