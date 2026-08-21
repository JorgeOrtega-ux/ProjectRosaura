<?php
require_once __DIR__ . '/../includes/core/bootstrap.php';

use App\Config\Database\DatabaseManager;
use App\Core\Repositories\CanvasRepository;
use App\Api\Services\Canvas\CanvasCoreService;
use App\Core\Container;

echo "=====================================================\n";
echo "TESTING OFFLINE PIXEL PERSISTENCE & RELOAD LIFECYCLE\n";
echo "=====================================================\n\n";

global $container;
$canvasRepo = $container->get(CanvasRepository::class);
$canvasService = $container->get(CanvasCoreService::class);
$dbManager = $container->get(DatabaseManager::class);

$identityDb = $dbManager->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);
$canvasesDb = $dbManager->getConnection(\App\Core\System\DatabaseConstants::CONN_CANVASES);

$identityDb->exec("INSERT IGNORE INTO users (id, uuid, username, email, password, profile_picture, subscription_tier, storage_used_bytes) VALUES (301, 'uuid-artist-1', 'artist1', 'artist1@rosaura.local', 'hash', '', 0, 0)");
$userId = 301;

$canvasesDb->exec("DELETE FROM canvases WHERE owner_id = 301");

// 1. Create 64x64 Offline Studio Canvas
$createRes = $canvasService->createCanvas($userId, "Persistence Studio Test", "private", false, "64x64", 10, "default", 5, 10, 0, []);
$canvasUuid = $createRes['data']['uuid'];
$canvas = $canvasRepo->getCanvasByUuid($canvasUuid);
$canvasId = (int)$canvas['id'];

echo "[SETUP] Created Studio Canvas ID: $canvasId (64x64)\n\n";

// 2. Simulate drawing: create 64x64 RGBA binary state with a 4x4 red square at (10, 10)
$totalBytes = 64 * 64 * 4;
$rawPixels = str_repeat(chr(0).chr(0).chr(0).chr(0), 64 * 64);

// Paint a red pixel (RGBA: 255, 0, 0, 255) at (10, 10)
for ($y = 10; $y < 14; $y++) {
    for ($x = 10; $x < 14; $x++) {
        $offset = ($y * 64 + $x) * 4;
        $rawPixels[$offset]     = chr(255); // R
        $rawPixels[$offset + 1] = chr(0);   // G
        $rawPixels[$offset + 2] = chr(0);   // B
        $rawPixels[$offset + 3] = chr(255); // A
    }
}

$stateBase64 = base64_encode($rawPixels);

// TEST 1: Save offline state
echo "--- TEST 1: Client saves offline state ---\n";
$saveRes = $canvasService->saveOfflineState($userId, $canvasId, $stateBase64);
if (!$saveRes['success']) {
    echo "[FAIL] saveOfflineState failed: " . ($saveRes['message'] ?? '') . "\n";
    exit(1);
}
echo "[PASS] saveOfflineState succeeded: {$saveRes['message']}\n";

// TEST 2: Verify binary snapshot in repository
echo "\n--- TEST 2: Verify snapshot persistence in DB/S3 ---\n";
$savedSnapshot = $canvasRepo->getSnapshot($canvasId);
if (!$savedSnapshot || strlen($savedSnapshot) !== $totalBytes) {
    echo "[FAIL] Snapshot was not persisted correctly! Expected {$totalBytes} bytes, got " . strlen((string)$savedSnapshot) . " bytes\n";
    exit(1);
}

// Verify red pixel at (10, 10)
$checkOffset = (10 * 64 + 10) * 4;
$r = ord($savedSnapshot[$checkOffset]);
$g = ord($savedSnapshot[$checkOffset + 1]);
$b = ord($savedSnapshot[$checkOffset + 2]);
$a = ord($savedSnapshot[$checkOffset + 3]);

if ($r !== 255 || $g !== 0 || $b !== 0 || $a !== 255) {
    echo "[FAIL] Pixel color mismatch! Got RGBA($r, $g, $b, $a), expected RGBA(255, 0, 0, 255)\n";
    exit(1);
}
echo "[PASS] Snapshot verified: exact RGBA(255, 0, 0, 255) found at (10, 10).\n";

// TEST 3: Simulate Page Reload via getCanvas
echo "\n--- TEST 3: Simulate page reload via getCanvas ---\n";
$canvasData = $canvasService->getCanvas($userId, $canvasId);
if (!$canvasData['success'] || empty($canvasData['data']['state_base64'])) {
    echo "[FAIL] getCanvas failed to return state_base64!\n";
    exit(1);
}

$reloadedGzip = base64_decode($canvasData['data']['state_base64']);
$reloadedRaw = @gzdecode($reloadedGzip);

if (!$reloadedRaw || strlen($reloadedRaw) !== $totalBytes) {
    echo "[FAIL] Reloaded state is corrupted or wrong length! Got " . strlen((string)$reloadedRaw) . " bytes\n";
    exit(1);
}

$r2 = ord($reloadedRaw[$checkOffset]);
$g2 = ord($reloadedRaw[$checkOffset + 1]);
$b2 = ord($reloadedRaw[$checkOffset + 2]);
$a2 = ord($reloadedRaw[$checkOffset + 3]);

if ($r2 !== 255 || $g2 !== 0 || $b2 !== 0 || $a2 !== 255) {
    echo "[FAIL] Reloaded pixel mismatch! Got RGBA($r2, $g2, $b2, $a2)\n";
    exit(1);
}
echo "[PASS] Page reload correctly received and unpacked snapshot state with intact pixels!\n";

// TEST 4: Verify Redis RAM is 0 for offline canvas
echo "\n--- TEST 4: Verify Redis hot RAM is 0 ---\n";
$redisCache = $container->get(\App\Config\Database\RedisCache::class);
$redis = $redisCache->getClient();
$hasRedisKey = $redis->exists("canvas:{$canvasId}:state");

if ($hasRedisKey) {
    echo "[FAIL] Redis state key was unexpectedly created for offline canvas!\n";
    exit(1);
}
echo "[PASS] Verified: Zero Redis RAM allocated for offline canvas.\n";

// Clean up
$canvasesDb->exec("DELETE FROM canvases WHERE owner_id = 301");
$identityDb->exec("DELETE FROM users WHERE id = 301");

echo "\n=====================================================\n";
echo "OFFLINE PIXEL PERSISTENCE TESTS PASSED (100%)\n";
echo "=====================================================\n";
