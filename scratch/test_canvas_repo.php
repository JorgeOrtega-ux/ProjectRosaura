<?php
/**
 * Test Script: test_canvas_repo.php
 * Verifies that retrieving public canvases works after removing is_official logic.
 */

require_once __DIR__ . '/../vendor/autoload.php';
define('ROOT_PATH', dirname(__DIR__));
\App\Core\Helpers\EnvLoader::load(ROOT_PATH . '/.env');

use App\Config\Database\DatabaseManager;
use App\Config\Search\TypesenseManager;
use App\Core\System\DatabaseConstants as DB;
use App\Core\Repositories\CanvasRepository;

try {
    $db = new DatabaseManager();
    $typesense = new TypesenseManager();
    $repo = new CanvasRepository($db, $typesense);
    
    echo "Retrieving public canvases...\n";
    $publicCanvases = $repo->getPublicCanvases(5, null, 'newest', 0);
    echo "Successfully retrieved " . count($publicCanvases) . " public canvases.\n";
    foreach ($publicCanvases as $c) {
        echo " - Canvas: {$c['name']} (UUID: {$c['uuid']})\n";
    }
} catch (\Throwable $e) {
    echo "Failed to retrieve public canvases: " . $e->getMessage() . "\n";
    exit(1);
}
