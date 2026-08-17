<?php
require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../config/Database/DatabaseManager.php';
require_once __DIR__ . '/../includes/core/System/DatabaseConstants.php';
require_once __DIR__ . '/../includes/core/System/CountryConstants.php';
require_once __DIR__ . '/../includes/core/System/SecurityConstants.php';
require_once __DIR__ . '/../includes/core/Helpers/Utils.php';
require_once __DIR__ . '/../includes/core/Helpers/GeoIpHelper.php';
require_once __DIR__ . '/../includes/core/Helpers/EnvLoader.php';
require_once __DIR__ . '/../includes/core/System/Logger.php';
require_once __DIR__ . '/../api/services/Admin/AdminAdvertisementsService.php';

use App\Core\Helpers\EnvLoader;
use App\Core\Helpers\GeoIpHelper;
use App\Config\Database\DatabaseManager;
use App\Api\Services\Admin\AdminAdvertisementsService;

EnvLoader::load(__DIR__ . '/../.env');

$mexicoIp = '187.189.14.2'; // IP pública de México (Telmex)
$usIp = '8.8.8.8';         // IP pública de USA (Google)
$localIp = '127.0.0.1';    // Localhost

echo "MX IP (" . $mexicoIp . ") -> País: " . GeoIpHelper::getCountryCode($mexicoIp) . " (" . GeoIpHelper::getCountryName($mexicoIp) . ")\n";
echo "US IP (" . $usIp . ") -> País: " . GeoIpHelper::getCountryCode($usIp) . " (" . GeoIpHelper::getCountryName($usIp) . ")\n";
echo "Localhost (" . $localIp . ") -> País: " . (GeoIpHelper::getCountryCode($localIp) ?? 'NULL (Red Local)') . "\n\n";

$dbManager = new DatabaseManager();
$service = new AdminAdvertisementsService($dbManager);

$adsFromMx = $service->getPublicActiveAds($mexicoIp);
$adsFromUs = $service->getPublicActiveAds($usIp);
$adsFromLocal = $service->getPublicActiveAds($localIp);

echo "======================================================\n";
echo "1. ANUNCIOS VISIBLES DESDE MÉXICO (IP: {$mexicoIp}):\n";
echo "======================================================\n";
foreach ($adsFromMx['feed_promos'] as $ad) {
    echo "  [VISIBLE] " . $ad['title'] . "\n";
}
if (empty($adsFromMx['feed_promos'])) echo "  (Ninguno)\n";

echo "\n======================================================\n";
echo "2. ANUNCIOS VISIBLES DESDE ESTADOS UNIDOS (IP: {$usIp}):\n";
echo "======================================================\n";
foreach ($adsFromUs['feed_promos'] as $ad) {
    echo "  [VISIBLE] " . $ad['title'] . "\n";
}

echo "\n======================================================\n";
echo "3. ANUNCIOS VISIBLES DESDE LOCALHOST (IP: {$localIp}):\n";
echo "======================================================\n";
foreach ($adsFromLocal['feed_promos'] as $ad) {
    echo "  [VISIBLE] " . $ad['title'] . "\n";
}
