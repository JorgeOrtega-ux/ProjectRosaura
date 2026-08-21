<?php
require_once __DIR__ . '/../includes/core/bootstrap.php';

use App\Config\Database\DatabaseManager;
use App\Core\Repositories\CanvasRepository;
use App\Core\Repositories\UserRepository;
use App\Api\Services\Canvas\CanvasCoreService;
use App\Core\System\CacheConstants;

echo "=====================================================\n";
echo "TESTING STORAGE QUOTA DEDUCTION & INTEGRITY VALIDATION\n";
echo "=====================================================\n\n";

global $container;
$canvasRepo = $container->get(CanvasRepository::class);
$userRepo = $container->get(UserRepository::class);
$canvasService = $container->get(CanvasCoreService::class);

$dbManager = new DatabaseManager();
$canvasesDb = $dbManager->getConnection(\App\Core\System\DatabaseConstants::CONN_CANVASES);
$identityDb = $dbManager->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);

$stmt = $identityDb->query("SELECT id, subscription_tier, storage_used_bytes FROM users WHERE subscription_tier = 0 LIMIT 1");
$testUser = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$testUser) {
    $identityDb->exec("INSERT INTO users (uuid, username, email, password, profile_picture, subscription_tier, storage_used_bytes) VALUES ('test-uuid-storage-1', 'test_storage', 'teststorage@rosaura.local', 'dummyhash', '', 0, 0)");
    $userId = (int)$identityDb->lastInsertId();
} else {
    $userId = (int)$testUser['id'];
}
$testPassword = 'TestPassword123!';
$testHash = password_hash($testPassword, PASSWORD_BCRYPT);
$identityDb->exec("UPDATE users SET password = '$testHash', storage_used_bytes = 0 WHERE id = $userId");

try {
    $redis = (new \App\Config\Database\RedisCache())->getClient();
    if ($redis) {
        (new \App\Core\System\CacheInvalidator($redis))->user($userId);
    }
} catch (\Throwable $e) {}

// Step 1: Baseline storage
$initialStorage = $userRepo->getStorageUsed($userId);
echo "--- TEST 1: Initial user storage ---\n";
echo "[INFO] Initial storage for user $userId: {$initialStorage} MB\n";

// Step 2: Create canvas (64x64)
echo "\n--- TEST 2: Create canvas and check storage addition ---\n";
$createRes = $canvasService->createCanvas(
    $userId,
    'Storage Test Canvas 1',
    'private',
    false,
    '64x64',
    10,
    'default'
);
if (!$createRes['success']) {
    die("[FAIL] Canvas creation failed: " . ($createRes['message'] ?? ''));
}
$canvas1Uuid = $createRes['data']['uuid'];
$canvas1Obj = $canvasRepo->getCanvasByUuid($canvas1Uuid);
$canvas1Id = (int)$canvas1Obj['id'];

$storageAfterCreate = $userRepo->getStorageUsed($userId);
$bytesAfterCreate = (float)$identityDb->query("SELECT storage_used_bytes FROM users WHERE id = $userId")->fetchColumn();
echo "[PASS] Canvas #1 created (ID: $canvas1Id, UUID: $canvas1Uuid). Storage used bytes: $bytesAfterCreate (> 0)\n";
if ($bytesAfterCreate <= 0) {
    die("[FAIL] Storage was not incremented upon canvas creation.\n");
}

// Step 3: Save valid offline state (64x64x4 = 16384 bytes)
echo "\n--- TEST 3: Save valid offline state (16384 bytes) ---\n";
$validRaw = str_repeat(chr(255).chr(128).chr(64).chr(255), 64 * 64);
$validBase64 = base64_encode($validRaw);
$saveRes = $canvasService->saveOfflineState($userId, $canvas1Id, $validBase64);
if (!$saveRes['success']) {
    die("[FAIL] Valid saveOfflineState failed: " . ($saveRes['message'] ?? ''));
}
$bytesAfterSave = (float)$identityDb->query("SELECT storage_used_bytes FROM users WHERE id = $userId")->fetchColumn();
echo "[PASS] Valid saveOfflineState accepted. Storage used bytes: $bytesAfterSave (expected 16384)\n";
if ((int)$bytesAfterSave !== 16384) {
    die("[FAIL] Expected exactly 16384 storage bytes, got $bytesAfterSave\n");
}

// Step 4: Dimension validation test - Malicious / corrupted payload
echo "\n--- TEST 4: Attempt saving corrupted / invalid dimensions payload ---\n";
$corruptRaw = "TOO_SHORT";
$corruptBase64 = base64_encode($corruptRaw);
$corruptSaveRes = $canvasService->saveOfflineState($userId, $canvas1Id, $corruptBase64);
if ($corruptSaveRes['success']) {
    die("[FAIL] Server accepted corrupted payload with invalid dimensions!\n");
}
echo "[PASS] Corrupted payload correctly rejected with: '{$corruptSaveRes['message']}'\n";

$bytesAfterCorrupt = (float)$identityDb->query("SELECT storage_used_bytes FROM users WHERE id = $userId")->fetchColumn();
if ((int)$bytesAfterCorrupt !== 16384) {
    die("[FAIL] Storage bytes corrupted after invalid save attempt!\n");
}
echo "[PASS] Storage bytes remained intact at 16384 bytes.\n";

// Step 5: Create a second canvas
echo "\n--- TEST 5: Create Canvas #2 and check cumulative storage ---\n";
$createRes2 = $canvasService->createCanvas(
    $userId,
    'Storage Test Canvas 2',
    'private',
    false,
    '64x64',
    10,
    'default'
);
$canvas2Uuid = $createRes2['data']['uuid'];
$canvas2Obj = $canvasRepo->getCanvasByUuid($canvas2Uuid);
$canvas2Id = (int)$canvas2Obj['id'];

$bytesAfterCanvas2 = (float)$identityDb->query("SELECT storage_used_bytes FROM users WHERE id = $userId")->fetchColumn();
echo "[PASS] Canvas #2 created (ID: $canvas2Id). Storage used bytes: $bytesAfterCanvas2\n";

// Step 6: Delete single canvas #1 and verify storage deduction
echo "\n--- TEST 6: Delete single canvas #1 and verify storage deduction ---\n";
$del1 = $canvasService->deleteCanvas($userId, $canvas1Uuid, $testPassword);
if (!$del1['success']) {
    die("[FAIL] deleteCanvas failed: " . ($del1['message'] ?? ''));
}
$bytesAfterDel1 = (float)$identityDb->query("SELECT storage_used_bytes FROM users WHERE id = $userId")->fetchColumn();
echo "[PASS] Canvas #1 deleted. Storage used bytes after deduction: $bytesAfterDel1 (deducted 16384 bytes)\n";
$canvas2Storage = (float)$canvasesDb->query("SELECT storage_bytes FROM canvases WHERE id = $canvas2Id")->fetchColumn();
if ((int)$bytesAfterDel1 !== (int)$canvas2Storage) {
    die("[FAIL] Expected storage to match Canvas #2 ($canvas2Storage), got $bytesAfterDel1\n");
}

// Step 7: Delete Canvas #2 and verify return to 0
echo "\n--- TEST 7: Delete Canvas #2 and verify return to 0 ---\n";
$del2 = $canvasService->deleteCanvas($userId, $canvas2Uuid, $testPassword);
if (!$del2['success']) {
    die("[FAIL] deleteCanvas #2 failed: " . ($del2['message'] ?? ''));
}
$bytesAfterDel2 = (float)$identityDb->query("SELECT storage_used_bytes FROM users WHERE id = $userId")->fetchColumn();
echo "[PASS] Canvas #2 deleted. Storage used bytes: $bytesAfterDel2 (0 bytes, zero leak)\n";
if ((int)$bytesAfterDel2 !== 0) {
    die("[FAIL] Storage bytes did not return to 0, leak detected: $bytesAfterDel2\n");
}

echo "\n=====================================================\n";
echo "STORAGE DEDUCTION & INTEGRITY TESTS PASSED (100%)!\n";
echo "=====================================================\n";
