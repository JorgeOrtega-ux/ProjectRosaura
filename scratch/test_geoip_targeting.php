<?php
require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../includes/core/System/CountryConstants.php';
require_once __DIR__ . '/../includes/core/Helpers/Utils.php';
require_once __DIR__ . '/../includes/core/System/SecurityConstants.php';
require_once __DIR__ . '/../includes/core/Helpers/GeoIpHelper.php';
require_once __DIR__ . '/../includes/core/Interfaces/MiddlewareInterface.php';
require_once __DIR__ . '/../includes/core/Middlewares/GeoRestrictionMiddleware.php';

use App\Core\System\CountryConstants;
use App\Core\Helpers\GeoIpHelper;
use App\Core\Middlewares\GeoRestrictionMiddleware;

echo "--- 1. Testing CountryConstants ---\n";
$countries = CountryConstants::getCountries();
echo "Total countries in catalog: " . count($countries) . "\n";
assert(count($countries) > 200, "Catalog must have > 200 countries");
assert(CountryConstants::getCountryName('MX') === 'México', "MX must be México");
assert(CountryConstants::getCountryName('es') === 'España', "es must be España");
assert(CountryConstants::isValidCountry('US') === true, "US must be valid");
assert(CountryConstants::isValidCountry('XX') === false, "XX must be invalid");
echo "✓ CountryConstants tests passed!\n\n";

echo "--- 2. Testing GeoIpHelper with 8.8.8.8 (Google US) ---\n";
$testIp = '8.8.8.8';
$code = GeoIpHelper::getCountryCode($testIp);
$countryName = GeoIpHelper::getCountryName($testIp);
$asn = GeoIpHelper::getASN($testIp);
$isDc = GeoIpHelper::isDatacenterOrBotAsn(null, $testIp);

echo "IP: {$testIp}\n";
echo "Country Code: {$code}\n";
echo "Country Name: {$countryName}\n";
echo "ASN: {$asn}\n";
echo "Is Datacenter/Risky ASN: " . ($isDc ? 'YES' : 'NO') . "\n";

assert($code === 'US', "8.8.8.8 country code should be US");
assert($isDc === true, "8.8.8.8 ASN should be flagged as Datacenter/Google Cloud");
echo "✓ GeoIpHelper lookup tests passed!\n\n";

echo "--- 3. Testing isCountryAllowed & isTargetingMatch ---\n";
// Allow US
assert(GeoIpHelper::isCountryAllowed(['US', 'MX'], null, $testIp) === true, "US in allowed list should pass");
// Block US
assert(GeoIpHelper::isCountryAllowed(null, ['US'], $testIp) === false, "US in blocked list should fail");
// Allow only ES, MX
assert(GeoIpHelper::isCountryAllowed(['ES', 'MX'], null, $testIp) === false, "US not in [ES, MX] should fail");

// Targeting: All
assert(GeoIpHelper::isTargetingMatch(['geo_mode' => 'all'], $testIp) === true, "All mode should match");
// Targeting: Allow only MX
assert(GeoIpHelper::isTargetingMatch(['geo_mode' => 'allow', 'geo_countries' => ['MX']], $testIp) === false, "Allow MX only should not match US");
// Targeting: Allow US
assert(GeoIpHelper::isTargetingMatch(['geo_mode' => 'allow', 'geo_countries' => ['US']], $testIp) === true, "Allow US should match US");
// Targeting: Block US
assert(GeoIpHelper::isTargetingMatch(['geo_mode' => 'block', 'geo_countries' => ['US']], $testIp) === false, "Block US should not match US");
// Targeting: Block datacenters
assert(GeoIpHelper::isTargetingMatch(['geo_mode' => 'all', 'block_datacenters' => true], $testIp) === false, "Block datacenters should filter Google ASN");
// Targeting: Allow US but Block datacenters
assert(GeoIpHelper::isTargetingMatch(['geo_mode' => 'allow', 'geo_countries' => ['US'], 'block_datacenters' => true], $testIp) === false, "Block datacenters should take effect");
echo "✓ isCountryAllowed and isTargetingMatch tests passed!\n\n";

echo "--- 4. Testing GeoRestrictionMiddleware in Standby (Default) ---\n";
$middleware = new GeoRestrictionMiddleware();
// Standby / disabled
$resultStandby = $middleware->handle(['ip_address' => $testIp], ['enabled' => false]);
assert($resultStandby === true, "Standby middleware must return true");
echo "✓ GeoRestrictionMiddleware standby mode passed (blocks nothing)!\n\n";

echo "--- 5. Testing GeoRestrictionMiddleware when activated for blocked country ---\n";
ob_start();
$resultActiveBlocked = $middleware->handle(['ip_address' => $testIp], ['enabled' => true, 'mode' => 'block', 'countries' => ['US']]);
$output = ob_get_clean();
echo "Debug Output: [" . $output . "]\n";
echo "Result: " . ($resultActiveBlocked ? 'true' : 'false') . "\n";
assert($resultActiveBlocked === false, "Active middleware with US blocked must return false");
$jsonRes = json_decode($output, true);
assert(!empty($jsonRes) && $jsonRes['error_code'] === 'REGION_RESTRICTED', "Must return REGION_RESTRICTED JSON error");
echo "✓ GeoRestrictionMiddleware active block tests passed!\n\n";

echo "ALL TESTS PASSED SUCCESSFULLY!\n";
