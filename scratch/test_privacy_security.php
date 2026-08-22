<?php
require_once __DIR__ . '/../includes/core/bootstrap.php';

set_exception_handler(null);
ini_set('display_errors', 1);

use App\Config\Database\DatabaseManager;
use App\Core\Repositories\CanvasRepository;
use App\Core\Repositories\UserRepository;
use App\Api\Services\Canvas\CanvasCoreService;
use App\Api\Services\Canvas\CanvasAccessService;
use App\Api\Services\Search\SearchService;
use App\Core\Container;

echo "=====================================================\n";
echo "TESTING OFFLINE CANVAS PRIVACY & BACKEND PROTECTION\n";
echo "=====================================================\n\n";

global $container;
$canvasRepo = $container->get(CanvasRepository::class);
$userRepo = $container->get(UserRepository::class);
$canvasService = $container->get(CanvasCoreService::class);
$accessService = $container->get(CanvasAccessService::class);
$searchService = $container->get(SearchService::class);
$dbManager = $container->get(DatabaseManager::class);

$identityDb = $dbManager->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);

// Create Owner User (User A)
$identityDb->exec("INSERT IGNORE INTO users (id, uuid, username, email, password, profile_picture, subscription_tier, storage_used_bytes) VALUES (101, 'uuid-user-a', 'creator_a', 'creator_a@rosaura.local', 'hash', '', 0, 0)");
$ownerId = 101;

// Create Stranger User (User B)
$identityDb->exec("INSERT IGNORE INTO users (id, uuid, username, email, password, profile_picture, subscription_tier, storage_used_bytes) VALUES (102, 'uuid-user-b', 'stranger_b', 'stranger_b@rosaura.local', 'hash', '', 0, 0)");
$strangerId = 102;

// Clean existing test canvases
$canvasesDb = $dbManager->getConnection(\App\Core\System\DatabaseConstants::CONN_CANVASES);
$canvasesDb->exec("DELETE FROM canvases WHERE owner_id IN (101, 102)");

// 1. Create offline canvas for Owner A
$createRes = $canvasService->createCanvas(
    $ownerId,
    "Secret Offline Canvas",
    "public", // even if set to public, mode=offline MUST hide it completely
    false,
    "64x64",
    10,
    "default",
    5,
    10,
    0,
    ['art']
);

if (!$createRes['success']) {
    echo "[FAIL] Failed to create offline canvas: " . ($createRes['message'] ?? '') . "\n";
    exit(1);
}

$canvasUuid = $createRes['data']['uuid'];
$canvasData = $canvasRepo->getCanvasByUuid($canvasUuid);
$canvasId = (int)$canvasData['id'];
echo "[SETUP] Created Offline Canvas ID: $canvasId (UUID: $canvasUuid) for Owner ID: $ownerId\n\n";

// TEST 1: Public Canvases Feed - Offline canvas MUST NOT appear
echo "--- TEST 1: Check getPublicCanvases feed ---\n";
$publicFeed = $canvasRepo->getPublicCanvases(50, null, 'newest', 0);
$foundInPublic = false;
foreach ($publicFeed as $c) {
    if ((int)$c['id'] === $canvasId) {
        $foundInPublic = true;
        break;
    }
}
if ($foundInPublic) {
    echo "[FAIL] Offline canvas leaked into getPublicCanvases feed!\n";
    exit(1);
}
echo "[PASS] Offline canvas is NOT present in getPublicCanvases feed.\n";

// TEST 2: Home Feed - Offline canvas MUST NOT appear
echo "\n--- TEST 2: Check getHomeFeed ---\n";
$homeFeed = $canvasRepo->getHomeFeed($strangerId, 'all', 50, 0);
$foundInHome = false;
foreach ($homeFeed as $c) {
    if ((int)$c['id'] === $canvasId) {
        $foundInHome = true;
        break;
    }
}
if ($foundInHome) {
    echo "[FAIL] Offline canvas leaked into getHomeFeed!\n";
    exit(1);
}
echo "[PASS] Offline canvas is NOT present in getHomeFeed.\n";

// TEST 3: Search Canvases - Stranger searching MUST NOT find offline canvas
echo "\n--- TEST 3: Check searchCanvases for non-owner ---\n";
$searchResults = $searchService->searchCanvases("Secret Offline", $strangerId, 1, 20);
$foundInSearch = false;
foreach ($searchResults['canvases'] as $c) {
    if ((int)$c['id'] === $canvasId) {
        $foundInSearch = true;
        break;
    }
}
if ($foundInSearch) {
    echo "[FAIL] Offline canvas leaked in search results for stranger!\n";
    exit(1);
}
echo "[PASS] Stranger search does NOT return the offline canvas.\n";

// TEST 4: Direct Backend Access (validateCanvasAccess) for stranger / guest
echo "\n--- TEST 4: Check validateCanvasAccess for non-owner and guest ---\n";
$accessGuest = $canvasService->validateCanvasAccess(null, $canvasId);
$accessStranger = $canvasService->validateCanvasAccess($strangerId, $canvasId);

if ($accessGuest['success'] || $accessStranger['success']) {
    echo "[FAIL] validateCanvasAccess granted access to offline canvas for non-owner!\n";
    exit(1);
}
echo "[PASS] validateCanvasAccess correctly denied stranger and guest (404 Not Found).\n";

// TEST 5: getCanvas for stranger / guest
echo "\n--- TEST 5: Check getCanvas for non-owner ---\n";
$getStranger = $canvasService->getCanvas($strangerId, $canvasId);
if ($getStranger['success'] ?? false) {
    echo "[FAIL] getCanvas returned offline canvas data to stranger!\n";
    exit(1);
}
echo "[PASS] getCanvas correctly blocked stranger.\n";

// TEST 6: Attempting to join or request access to offline canvas
echo "\n--- TEST 6: Check requestAccess to offline canvas ---\n";
$reqJoin = $accessService->requestAccess($strangerId, $canvasId);
if ($reqJoin['success'] ?? false) {
    echo "[FAIL] requestAccess allowed stranger to request access or join offline canvas!\n";
    exit(1);
}
echo "[PASS] requestAccess blocked with: '{$reqJoin['message']}'\n";

// TEST 7: Attempting to generate WebSocket ticket for offline canvas
echo "\n--- TEST 7: Check generateWsTicket for offline canvas ---\n";
$ticketRes = $canvasService->generateWsTicket($ownerId, $canvasId);
if ($ticketRes['success'] ?? false) {
    echo "[FAIL] generateWsTicket should not generate WS tickets for offline canvases!\n";
    exit(1);
}
echo "[PASS] generateWsTicket correctly blocked with: '{$ticketRes['message']}'\n";

// TEST 8: Owner CAN access and edit offline canvas
echo "\n--- TEST 8: Owner accessing offline canvas ---\n";
$ownerAccess = $canvasService->validateCanvasAccess($ownerId, $canvasId);
$ownerGet = $canvasService->getCanvas($ownerId, $canvasId);
if (!$ownerAccess['success'] || !($ownerGet['success'] ?? false)) {
    echo "[FAIL] Owner was denied access to their own offline canvas!\n";
    exit(1);
}
echo "[PASS] Owner has full access to their offline studio canvas.\n";

// TEST 9: Activate Online mode -> canvas becomes available in public explore & tickets
echo "\n--- TEST 9: Activate Online mode and verify public visibility ---\n";
$canvasService->activateOnline($ownerId, $canvasId);

// Invalidate caches to simulate live behavior
$redisCache = $container->get(\App\Config\Database\RedisCache::class);
$invalidator = new \App\Core\System\CacheInvalidator($redisCache->getClient());
$invalidator->canvas($canvasId);

$publicFeedOnline = $canvasRepo->getPublicCanvases(50, null, 'newest', 0);
$foundOnline = false;
foreach ($publicFeedOnline as $c) {
    if ((int)$c['id'] === $canvasId) {
        $foundOnline = true;
        break;
    }
}
if (!$foundOnline) {
    echo "[FAIL] Activated online canvas did not appear in public feed!\n";
    exit(1);
}
echo "[PASS] Canvas now appears in public feed after Online activation.\n";

// TEST 10: Deactivate Online mode -> immediately hidden again from public
echo "\n--- TEST 10: Deactivate Online mode and verify immediate privacy ---\n";
$canvasService->deactivateOnline($ownerId, $canvasId);
$invalidator->canvas($canvasId);

$publicFeedAfterDeact = $canvasRepo->getPublicCanvases(50, null, 'newest', 0);
$foundAfterDeact = false;
foreach ($publicFeedAfterDeact as $c) {
    if ((int)$c['id'] === $canvasId) {
        $foundAfterDeact = true;
        break;
    }
}
if ($foundAfterDeact) {
    echo "[FAIL] Deactivated canvas still visible in public feed!\n";
    exit(1);
}
echo "[PASS] Canvas is immediately hidden from public upon deactivation to Studio mode.\n";

// Clean up
$canvasesDb->exec("DELETE FROM canvases WHERE owner_id IN (101, 102)");
$identityDb->exec("DELETE FROM users WHERE id IN (101, 102)");

echo "\n=====================================================\n";
echo "ALL PRIVACY & BACKEND PROTECTION TESTS PASSED (100%)!\n";
echo "=====================================================\n";
