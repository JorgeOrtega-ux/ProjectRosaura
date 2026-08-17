<?php

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../includes/core/Helpers/EnvLoader.php';
require_once __DIR__ . '/../config/Database/RedisCache.php';
require_once __DIR__ . '/../config/Database/DatabaseManager.php';
require_once __DIR__ . '/../includes/core/System/CacheConstants.php';
require_once __DIR__ . '/../includes/core/System/CacheInvalidator.php';
require_once __DIR__ . '/../includes/core/System/AdvertisementConstants.php';
require_once __DIR__ . '/../includes/core/System/CountryConstants.php';
require_once __DIR__ . '/../api/services/Admin/AdminAdvertisementsService.php';

use App\Core\Helpers\EnvLoader;
use App\Config\Database\DatabaseManager;
use App\Config\Database\RedisCache;
use App\Core\System\CacheConstants;
use App\Core\System\CacheInvalidator;
use App\Core\System\AdvertisementConstants;
use App\Api\Services\Admin\AdminAdvertisementsService;

EnvLoader::load(__DIR__ . '/../.env');

echo "=== TEST 1: AdvertisementConstants ===\n";
$validFormats = AdvertisementConstants::getValidFormats();
assert($validFormats === ['feed', 'module_colors', 'module_templates'], "Valid formats mismatch");
assert(AdvertisementConstants::isValidFormat('feed') === true, "feed should be valid");
assert(AdvertisementConstants::isValidFormat('module_colors') === true, "module_colors should be valid");
assert(AdvertisementConstants::isValidFormat('module_templates') === true, "module_templates should be valid");
assert(AdvertisementConstants::isValidFormat('banner') === false, "banner should be invalid");
assert(AdvertisementConstants::isValidFormat('module_info') === false, "module_info should be invalid");
assert(AdvertisementConstants::getFormatIcon('module_colors') === 'palette', "Icon should be palette");
assert(count(AdvertisementConstants::getFormatsCatalog()) === 3, "Catalog must have exactly 3 formats");
echo "✓ AdvertisementConstants test passed!\n";

echo "=== TEST 2: Redis Cache & Invalidation ===\n";
$redisCache = new RedisCache();
$redis = $redisCache->getClient();
$dbManager = new DatabaseManager();

$adsService = new AdminAdvertisementsService($dbManager, $redisCache);

// 1. Test getPublicActiveAds caching
$res1 = $adsService->getPublicActiveAds('8.8.8.8');
assert($res1['success'] === true, "getPublicActiveAds failed");
$rawKey = CacheConstants::PREFIX_ADS_ACTIVE_PUBLIC . ':raw';
$cachedRaw = $redis ? $redis->get($rawKey) : null;
assert(!empty($cachedRaw), "Active ads raw pool was not cached in Redis");
echo "✓ Public active ads cached in Redis correctly!\n";

// 2. Test getProvidersList caching
$providersResult = $adsService->getProvidersList(null, 'all', 'all', 1, 25);
assert(!empty($providersResult['providers']), "Providers list empty");
$hash = md5(":all:all:1:25");
$listKey = CacheConstants::PREFIX_ADS_PROVIDERS_LIST . $hash;
$cachedList = $redis ? $redis->get($listKey) : null;
assert(!empty($cachedList), "Providers list was not cached in Redis");
echo "✓ Providers list cached in Redis correctly!\n";

// 3. Test CacheInvalidator
$invalidator = new CacheInvalidator($redis);
$invalidator->advertisements();
$cachedAfterInvalidate = $redis ? $redis->get($rawKey) : null;
assert(empty($cachedAfterInvalidate), "Raw active ads cache should have been deleted by invalidator");
$cachedListAfter = $redis ? $redis->get($listKey) : null;
assert(empty($cachedListAfter), "Providers list cache should have been deleted by invalidator");
echo "✓ CacheInvalidator successfully purged advertising cache keys!\n";

// 4. Test Global Report and Caching
$globalReport = $adsService->getGlobalMetricsReportData('30');
assert(isset($globalReport['global_summary']), "Global summary missing");
assert(count($globalReport['formats_breakdown']) === 3, "Formats breakdown should have exactly 3 formats");
$globalReportKey = CacheConstants::PREFIX_ADS_GLOBAL_REPORT . '30';
$cachedGlobal = $redis ? $redis->get($globalReportKey) : null;
assert(!empty($cachedGlobal), "Global report was not cached in Redis");
echo "✓ Global report and formats breakdown (3 formats) cached in Redis correctly!\n";

echo "\nALL ADVERTISEMENT CENTRALIZATION & CACHE TESTS PASSED SUCCESSFULLY! 🎉\n";
