<?php
require_once __DIR__ . '/../includes/core/bootstrap.php';

set_exception_handler(null);
ini_set('display_errors', 1);

use App\Config\Database\DatabaseManager;
use App\Core\Repositories\CanvasRepository;
use App\Core\Repositories\UserRepository;
use App\Api\Controllers\Canvas\CanvasCoreController;
use App\Core\Container;

echo "=====================================================\n";
echo "TESTING CONTROLLER & ROUTE INTEGRATION\n";
echo "=====================================================\n\n";

global $container;
$canvasRepo = $container->get(CanvasRepository::class);
$userRepo = $container->get(UserRepository::class);
$dbManager = $container->get(DatabaseManager::class);

$controller = $container->get(CanvasCoreController::class);

// Get test user
$identityDb = $dbManager->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);
$testUser = $identityDb->query("SELECT id FROM users WHERE subscription_tier = 0 LIMIT 1")->fetch(PDO::FETCH_ASSOC);
$userId = (int)$testUser['id'];

$session = $container->get(\App\Core\Interfaces\SessionManagerInterface::class);
$session->set(\App\Core\System\SessionConstants::KEY_ACTIVE_ACCOUNT, $userId);
$session->set(\App\Core\System\SessionConstants::KEY_LINKED_ACCOUNTS, [$userId => ['id' => $userId, 'subscription_tier' => 0]]);

// Create canvas for test
$canvasesDb = $dbManager->getConnection(\App\Core\System\DatabaseConstants::CONN_CANVASES);
$canvasesDb->exec("UPDATE canvases SET mode = 'offline', is_online_active = 0 WHERE owner_id = $userId");

$canvasId = (int)$canvasRepo->create([
    'uuid' => 'test-http-uuid-' . time(),
    'name' => 'HTTP Test Canvas',
    'privacy' => 'private',
    'requires_approval' => 0,
    'size' => '64x64',
    'max_participants' => 10,
    'palette_id' => 'default',
    'cooldown_pixels_batch' => 5,
    'cooldown_seconds' => 10,
    'owner_id' => $userId,
    'tags' => ['art'],
    'mode' => 'offline',
    'is_online_active' => 0,
    'storage_bytes' => 16384
]);

echo "[SETUP] Created test canvas ID: $canvasId\n";

// Test 1: save_offline_state controller method
$inputSave = [
    'canvas_id' => $canvasId,
    'state_base64' => base64_encode(gzencode(str_repeat(pack('C4', 10, 20, 30, 255), 64 * 64), 6))
];
$respSave = $controller->save_offline_state($inputSave);
echo "[TEST HTTP 1] save_offline_state: " . json_encode($respSave) . "\n";
if (!($respSave['success'] ?? false)) {
    echo "[FAIL] save_offline_state controller failed!\n";
    exit(1);
}

// Test 2: activate_online controller method
$inputAct = ['canvas_id' => $canvasId];
$respAct = $controller->activate_online($inputAct);
echo "[TEST HTTP 2] activate_online: " . json_encode($respAct) . "\n";
if (!($respAct['success'] ?? false)) {
    echo "[FAIL] activate_online controller failed!\n";
    exit(1);
}

// Test 3: deactivate_online controller method
$inputDeact = ['canvas_id' => $canvasId];
$respDeact = $controller->deactivate_online($inputDeact);
echo "[TEST HTTP 3] deactivate_online: " . json_encode($respDeact) . "\n";
if (!($respDeact['success'] ?? false)) {
    echo "[FAIL] deactivate_online controller failed!\n";
    exit(1);
}

// Clean up
$canvasesDb->exec("DELETE FROM canvases WHERE id = $canvasId");

echo "\n[HTTP TESTS COMPLETED SUCCESSFULLY]\n";
