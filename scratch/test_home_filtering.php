<?php
require_once __DIR__ . '/../includes/core/bootstrap.php';

use App\Config\Database\DatabaseManager;
use App\Core\Repositories\CanvasRepository;
use App\Api\Services\Canvas\CanvasCoreService;
use App\Core\Container;

echo "=====================================================\n";
echo "TESTING HOME DASHBOARD & EXPLORE PRIVACY ISOLATION\n";
echo "=====================================================\n\n";

global $container;
$canvasRepo = $container->get(CanvasRepository::class);
$canvasService = $container->get(CanvasCoreService::class);
$dbManager = $container->get(DatabaseManager::class);

$identityDb = $dbManager->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);
$canvasesDb = $dbManager->getConnection(\App\Core\System\DatabaseConstants::CONN_CANVASES);

// Clean up
$canvasesDb->exec("DELETE FROM canvases WHERE owner_id IN (201, 202)");
$identityDb->exec("DELETE FROM users WHERE id IN (201, 202)");

// Create User 201 (Alice)
$identityDb->exec("INSERT INTO users (id, uuid, username, email, password, profile_picture, subscription_tier, storage_used_bytes) VALUES (201, 'uuid-alice', 'alice', 'alice@rosaura.local', 'hash', '', 0, 0)");
// Create User 202 (Bob)
$identityDb->exec("INSERT INTO users (id, uuid, username, email, password, profile_picture, subscription_tier, storage_used_bytes) VALUES (202, 'uuid-bob', 'bob', 'bob@rosaura.local', 'hash', '', 0, 0)");

// 1. Alice creates Canvas A1 (Offline Studio)
$resA1 = $canvasService->createCanvas(201, "Alice Offline Studio", "public", false, "64x64", 10, "default", 5, 10, 0, []);
$cA1 = $canvasRepo->getCanvasByUuid($resA1['data']['uuid']);

// 2. Alice creates Canvas A2 and activates Online
$resA2 = $canvasService->createCanvas(201, "Alice Online Room", "public", false, "64x64", 10, "default", 5, 10, 0, []);
$cA2 = $canvasRepo->getCanvasByUuid($resA2['data']['uuid']);
$canvasService->activateOnline(201, (int)$cA2['id']);

// 3. Bob creates Canvas B1 (Offline Studio)
$resB1 = $canvasService->createCanvas(202, "Bob Offline Studio", "public", false, "64x64", 10, "default", 5, 10, 0, []);
$cB1 = $canvasRepo->getCanvasByUuid($resB1['data']['uuid']);

echo "[SETUP] Alice created Canvas {$cA1['id']} (Offline) and {$cA2['id']} (Online)\n";
echo "[SETUP] Bob created Canvas {$cB1['id']} (Offline)\n\n";

// Invalidate caches
$redisCache = $container->get(\App\Config\Database\RedisCache::class);
$invalidator = new \App\Core\System\CacheInvalidator($redisCache->getClient());
$invalidator->canvas((int)$cA1['id']);
$invalidator->canvas((int)$cA2['id']);
$invalidator->canvas((int)$cB1['id']);
$invalidator->userCanvasList(201);
$invalidator->userCanvasList(202);

// TEST 1: Alice's Home Dashboard
echo "--- TEST 1: Alice's Home Dashboard (getMine) ---\n";
$aliceHome = $canvasService->getMine(201, 50, 'all', 0);
$aliceIds = array_column($aliceHome['data'], 'id');
echo "Alice sees canvas IDs: " . implode(', ', $aliceIds) . "\n";

if (!in_array($cA1['id'], $aliceIds) || !in_array($cA2['id'], $aliceIds)) {
    echo "[FAIL] Alice should see her own canvases ({$cA1['id']} and {$cA2['id']}) on her Home!\n";
    exit(1);
}
if (in_array($cB1['id'], $aliceIds)) {
    echo "[FAIL] Alice should NOT see Bob's offline canvas ({$cB1['id']}) on her Home!\n";
    exit(1);
}
echo "[PASS] Alice sees only her own canvases (Offline & Online) on her Home dashboard.\n";

// TEST 2: Bob's Home Dashboard
echo "\n--- TEST 2: Bob's Home Dashboard (getMine) ---\n";
$bobHome = $canvasService->getMine(202, 50, 'all', 0);
$bobIds = array_column($bobHome['data'], 'id');
echo "Bob sees canvas IDs: " . implode(', ', $bobIds) . "\n";

if (!in_array($cB1['id'], $bobIds)) {
    echo "[FAIL] Bob should see his own offline canvas on his Home!\n";
    exit(1);
}
if (in_array($cA1['id'], $bobIds)) {
    echo "[FAIL] Bob should NOT see Alice's offline canvas on his Home!\n";
    exit(1);
}
echo "[PASS] Bob sees only his own offline canvas.\n";

// TEST 3: Explore Murales (getHomeFeed)
echo "\n--- TEST 3: Explore Murales (getHomeFeed) ---\n";
$exploreFeed = $canvasRepo->getHomeFeed(null, 'all', 50, 0);
$exploreIds = array_column($exploreFeed, 'id');
echo "Explore Feed contains canvas IDs: " . implode(', ', $exploreIds) . "\n";

if (in_array($cA1['id'], $exploreIds) || in_array($cB1['id'], $exploreIds)) {
    echo "[FAIL] Offline canvases leaked into Explore Murales!\n";
    exit(1);
}
if (!in_array($cA2['id'], $exploreIds)) {
    echo "[FAIL] Online canvas {$cA2['id']} should be in Explore Murales!\n";
    exit(1);
}
echo "[PASS] Explore Murales only displays Online rooms (Alice's {$cA2['id']}).\n";

// Clean up
$canvasesDb->exec("DELETE FROM canvases WHERE owner_id IN (201, 202)");
$identityDb->exec("DELETE FROM users WHERE id IN (201, 202)");

echo "\n=====================================================\n";
echo "ALL DASHBOARD & EXPLORE ISOLATION TESTS PASSED (100%)\n";
echo "=====================================================\n";
